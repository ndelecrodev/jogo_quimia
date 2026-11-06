// Camada única de input: teclado + gamepad (mapeamento padrão) + mouse/toque (fallback).
// Os jogos NUNCA leem dispositivo direto: usam input.pressed('action'), input.held('left') etc.
// `update()` é chamado uma vez por frame (ver main.js), antes das cenas.

const NAMES = ['left', 'right', 'up', 'down', 'action', 'back', 'pause', 'mute'];

const KEYMAP = {
  left: ['ArrowLeft', 'KeyA'],
  right: ['ArrowRight', 'KeyD'],
  up: ['ArrowUp', 'KeyW'],
  down: ['ArrowDown', 'KeyS'],
  action: ['Space', 'Enter', 'NumpadEnter'],
  back: ['Escape', 'Backspace'],
  pause: ['KeyP'],
  mute: ['KeyM'],
};

// Em "modo texto" (tela de apelido) estas teclas digitam letras em vez de navegar.
const TEXT_BLOCK = new Set(['KeyA', 'KeyD', 'KeyW', 'KeyS', 'KeyP', 'KeyM', 'Backspace']);
const PREVENT = new Set(['Space', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Backspace', 'Enter']);
const DEAD = 0.3; // zona morta do analógico

/** Nome curto do controle a partir do id do navegador (ex.: "DualSense Wireless Controller (STANDARD GAMEPAD Vendor: 054c ...)"). */
export function padNameOf(id) {
  const s = String(id || '');
  if (/dualsense|0ce6|0df2/i.test(s)) return 'DualSense (PS5)';
  if (/dualshock|054c|wireless controller/i.test(s)) return 'Controle PlayStation';
  if (/xbox|xinput|045e/i.test(s)) return 'Controle Xbox';
  return s.replace(/\(.*?\)/g, '').trim().slice(0, 28) || 'Controle';
}

class InputManager {
  constructor() {
    this.keys = new Set();
    this.tapped = new Set();
    this.textMode = false;
    this.pointerDown = false;
    this.padIndex = null;
    this.padConnected = false;
    this.padName = ''; // nome amigável do controle detectado (ex.: DualSense)
    this.padListeners = [];
    this.textHandlers = new Set(); // quem quer receber digitação do teclado físico
    this.lastInputAt = Date.now();
    this.cur = Object.fromEntries(NAMES.map((n) => [n, false]));
    this.prev = { ...this.cur };
    this.analogX = 0;
    this.analogY = 0;

    window.addEventListener('keydown', (e) => {
      const tag = e.target && e.target.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return; // digitando em campo (painel admin)
      if (PREVENT.has(e.code)) e.preventDefault();
      // Digitação: entregue na hora (sem esperar o frame), na ordem certa. AltGr (Ctrl+Alt) conta como texto.
      if (this.textMode && this.textHandlers.size && !e.metaKey && !(e.ctrlKey && !e.altKey)) {
        this.textHandlers.forEach((cb) => cb(e));
      }
      this.keys.add(e.code);
      this.tapped.add(e.code); // garante que toques rápidos (down+up entre dois frames) não se percam
      this.lastInputAt = Date.now();
    });
    window.addEventListener('keyup', (e) => this.keys.delete(e.code));
    window.addEventListener('blur', () => {
      this.keys.clear();
      this.pointerDown = false;
    });
    window.addEventListener('pointerdown', () => {
      this.pointerDown = true;
      this.lastInputAt = Date.now();
    });
    window.addEventListener('pointerup', () => (this.pointerDown = false));
    window.addEventListener('pointermove', () => (this.lastInputAt = Date.now()));
  }

  /** Recebe cada tecla digitada em modo texto (cb(KeyboardEvent)). Devolve a função que cancela. */
  onText(cb) {
    this.textHandlers.add(cb);
    return () => this.textHandlers.delete(cb);
  }

  /** Avisa quando um controle conecta/desconecta. cb(connected:boolean) */
  onPadChange(cb) {
    this.padListeners.push(cb);
  }

  update() {
    this.prev = this.cur;
    const cur = {};
    for (const n of NAMES) {
      cur[n] = KEYMAP[n].some(
        (code) => (this.keys.has(code) || this.tapped.has(code)) && !(this.textMode && TEXT_BLOCK.has(code))
      );
    }
    this.tapped.clear();
    if (this.pointerDown) cur.action = true;

    // --- Gamepad ---
    const pads = (navigator.getGamepads ? Array.from(navigator.getGamepads()) : []).filter(Boolean);
    const connected = pads.some((p) => p.connected);
    const nome = connected ? padNameOf((pads.find((p) => p.index === this.padIndex && p.connected) || pads.find((p) => p.connected)).id) : '';
    if (connected !== this.padConnected || nome !== this.padName) {
      this.padConnected = connected;
      this.padName = nome;
      this.padListeners.forEach((cb) => cb(connected));
    }
    let pad = this.padIndex != null ? pads.find((p) => p.index === this.padIndex && p.connected) : null;
    if (!pad) {
      this.padIndex = null;
      // Usa o primeiro controle em que alguém apertar algo.
      pad = pads.find((p) => p.connected && (p.buttons.some((b) => b.pressed) || p.axes.some((a) => Math.abs(a) > 0.6)));
      if (pad) this.padIndex = pad.index;
    }
    this.analogX = 0;
    this.analogY = 0;
    if (pad) {
      const b = (i) => !!(pad.buttons[i] && pad.buttons[i].pressed);
      const ax = pad.axes[0] || 0;
      const ay = pad.axes[1] || 0;
      if (b(0)) cur.action = true; // ✕ / A
      if (b(1)) cur.back = true; // ○ / B
      if (b(9)) cur.pause = true; // Options / Start
      if (b(12) || ay < -0.5) cur.up = true;
      if (b(13) || ay > 0.5) cur.down = true;
      if (b(14) || ax < -0.5) cur.left = true;
      if (b(15) || ax > 0.5) cur.right = true;
      if (Math.abs(ax) > DEAD) this.analogX = ax;
      if (Math.abs(ay) > DEAD) this.analogY = ay;
      if (b(0) || b(1) || b(9) || b(12) || b(13) || b(14) || b(15) || Math.abs(ax) > DEAD || Math.abs(ay) > DEAD) {
        this.lastInputAt = Date.now();
      }
    }
    this.cur = cur;
  }

  held(n) {
    return this.cur[n];
  }

  /** true só no frame em que o botão foi apertado (borda de subida). */
  pressed(n) {
    return this.cur[n] && !this.prev[n];
  }

  /** Eixo horizontal -1..1 (analógico se houver, senão digital). */
  axisX() {
    if (this.analogX) return this.analogX;
    return (this.cur.right ? 1 : 0) - (this.cur.left ? 1 : 0);
  }

  axisY() {
    if (this.analogY) return this.analogY;
    return (this.cur.down ? 1 : 0) - (this.cur.up ? 1 : 0);
  }

  /** Marca atividade (ex.: ao receber evento de digitação). */
  touch() {
    this.lastInputAt = Date.now();
  }
}

export const input = new InputManager();
