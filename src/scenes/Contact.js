import { BaseScene } from './BaseScene.js';
import { COLORS } from '../theme.js';
import { addBackground, BubbleField, T, drawCard } from '../ui.js';
import { input } from '../core/InputManager.js';
import { sfx } from '../core/Sfx.js';
import { updatePlay } from '../core/Storage.js';
import { SHOW_VIRAL_AFTER_GAME } from '../config/game.js';

const MAX_LEN = 40;
// Sem caixa de aceite: o consentimento é a AÇÃO de apertar SALVAR (consent=true só aí). Peça a quem orienta o projeto para conferir este texto.
export const CONSENT_TEXT_VERSION = 'v2';
const LGPD = 'Ao tocar em SALVAR, você aceita que a Quimia use este contato apenas para falar sobre o brinde e as novidades do projeto. Para excluir, fale com a equipe.';
const MIN_LEN = 5;

// Captura de contato (só quem entrou no Top 3 do jogo ou atingiu a meta do brinde). Opcional, com aceite LGPD.
export default class Contact extends BaseScene {
  constructor() {
    super('Contact');
  }

  create(data) {
    this.begin();
    input.textMode = true;
    this.playId = data.playId;
    this.next = data.next || { scene: 'Hub' };
    this.value = '';
    this.company = false;
    this.typedByKeyboard = false;
    addBackground(this);
    this.bubbles = new BubbleField(this, 14);

    T(this, 960, 60, 'Entrou no ranking!', 'h1', { color: COLORS.neon });
    T(this, 960, 125, 'É opcional: deixe seu @ ou WhatsApp para a equipe falar com você sobre o brinde. Pode digitar no teclado.', 'bodyL', { color: COLORS.mint2 });

    const box = this.add.graphics();
    drawCard(box, 410, 165, 1100, 100, { fill: COLORS.card, stroke: COLORS.neon, sw: 4 });
    this.valueText = T(this, 960, 215, '', 'h2');
    T(this, 960, 322, LGPD, 'body', { color: COLORS.white, wordWrap: { width: 1560 }, align: 'center' });

    // Teclado de tela
    const rows = [
      '1234567890'.split(''),
      'qwertyuiop'.split(''),
      'asdfghjkl@'.split(''),
      'zxcvbnm._-'.split(''),
      ['APAGAR'],
      ['CHECK_EMPRESA'],
      ['SALVAR', 'AGORA NÃO'],
    ];
    this.keys = [];
    let y = 376;
    rows.forEach((row, r) => {
      const widths = row.map((l) => (l === 'CHECK_EMPRESA' ? 640 : l.length > 1 ? 330 : 100));
      const total = widths.reduce((a, b) => a + b, 0) + (row.length - 1) * 14;
      let x = 960 - total / 2;
      const h = 78;
      row.forEach((label, c) => {
        const g = this.add.graphics();
        const t = T(this, x + widths[c] / 2, y + h / 2, '', label.length > 1 ? 'buttonM' : 'h3');
        this.keys.push({ label, r, c, x, y, w: widths[c], h, g, t, cx: x + widths[c] / 2 });
        x += widths[c] + 14;
      });
      y += h + 12;
    });
    this.rowsLen = rows.map((r) => r.length);
    this.fr = 0; // foco inicial na primeira tecla
    this.fc = 0;
    this.refresh();

    // Teclado físico: digita direto, Backspace/Delete apagam, Enter salva
    this.offText = input.onText((e) => {
      if (!this.ready(200)) return;
      if (/^[a-z0-9@._-]$/i.test(e.key) && !e.repeat) {
        this.typedByKeyboard = true;
        this.add_(e.key.toLowerCase());
      } else if (e.key === 'Backspace' || e.key === 'Delete') this.del();
      else if (e.key === 'Enter') {
        this.enterHandled = true; // o mesmo Enter também vira "ação": não deixa digitar a tecla em foco
        this.save();
      }
    });
    this.events.once('shutdown', () => this.offText && this.offText());
  }

  focusKey() {
    return this.keys.find((k) => k.r === this.fr && k.c === this.fc);
  }

  label(k) {
    if (k.label === 'AGORA NÃO') return 'AGORA NÃO  (○ / Esc)';
    if (k.label === 'CHECK_EMPRESA') return `Sou de empresa:  ${this.company ? 'SIM' : 'NÃO'}`;
    return k.label;
  }

  refresh() {
    const f = this.focusKey();
    this.keys.forEach((k) => {
      const on = k === f;
      const check = k.label.startsWith('CHECK');
      const special = check || k.label.length > 1;
      const off = k.label === 'SALVAR' && this.value.trim().length < MIN_LEN; // desabilitado (cinza) até ter o mínimo
      const sim = check && this.company;
      drawCard(k.g, k.x, k.y, k.w, k.h, {
        fill: off ? COLORS.base : on ? COLORS.neon : sim ? COLORS.mint2 : special ? COLORS.elevated : COLORS.card,
        stroke: on ? COLORS.white : COLORS.elevated2,
        sw: on ? 5 : 3,
        r: check ? 38 : 16,
        alpha: off ? 0.55 : 1,
      });
      k.t.setText(this.label(k));
      k.t.setColor(off ? COLORS.sky2 : on || sim ? COLORS.darkText : COLORS.white);
    });
    this.valueText.setText(this.value + (Math.floor(this.time.now / 450) % 2 ? '_' : ' '));
  }

  add_(ch) {
    if (this.value.length >= MAX_LEN) return sfx.play('error');
    this.value += ch;
    sfx.play('nav');
    this.refresh();
  }

  del() {
    if (!this.value.length) return;
    this.value = this.value.slice(0, -1);
    sfx.play('back');
    this.refresh();
  }

  save() {
    const v = this.value.trim();
    if (v.length < MIN_LEN) return sfx.play('error'); // SALVAR está cinza: sem mensagem vermelha
    const type = v.startsWith('@') ? 'instagram' : /^\+?\d[\d\s()-]{7,}$/.test(v) ? 'whatsapp' : /@.+\./.test(v) ? 'email' : 'outro';
    updatePlay(this.playId, { contact: v, contactType: type, consent: true, consentText: CONSENT_TEXT_VERSION, consentAt: new Date().toISOString(), company: this.company });
    sfx.play('fanfare');
    this.done();
  }

  done() {
    // "Salvar" e "Agora não" voltam direto ao Hub (o convite só entra se SHOW_VIRAL_AFTER_GAME for true)
    if (SHOW_VIRAL_AFTER_GAME) this.scene.start('Viral', { next: this.next });
    else this.scene.start(this.next.scene, this.next.data);
  }

  vertical(dir) {
    const cur = this.focusKey();
    const nr = Math.min(Math.max(this.fr + dir, 0), this.rowsLen.length - 1);
    if (nr === this.fr) return;
    const best = this.keys.filter((k) => k.r === nr).reduce((a, b) => (Math.abs(b.cx - cur.cx) < Math.abs(a.cx - cur.cx) ? b : a));
    this.fr = nr;
    this.fc = best.c;
  }

  update(_, delta) {
    this.bubbles.update(delta);
    this.refresh();
    if (!this.ready()) return;
    let moved = false;
    const len = this.rowsLen[this.fr];
    if (input.pressed('left')) { this.fc = (this.fc - 1 + len) % len; moved = true; }
    if (input.pressed('right')) { this.fc = (this.fc + 1) % len; moved = true; }
    if (input.pressed('up')) { this.vertical(-1); moved = true; }
    if (input.pressed('down')) { this.vertical(1); moved = true; }
    if (moved) sfx.play('nav');

    if (input.pressed('action')) {
      if (this.enterHandled) { this.enterHandled = false; return; }
      const k = this.focusKey();
      if (k.label === 'SALVAR') this.save();
      else if (k.label === 'AGORA NÃO') { sfx.play('back'); this.done(); }
      else if (k.label === 'APAGAR') this.del();
      else if (k.label === 'CHECK_EMPRESA') { this.company = !this.company; sfx.play('nav'); }
      else this.add_(k.label);
    }
    if (input.pressed('back')) { sfx.play('back'); this.done(); }
  }
}
