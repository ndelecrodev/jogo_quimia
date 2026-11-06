import { BaseScene } from './BaseScene.js';
import { COLORS } from '../theme.js';
import { addBackground, BubbleField, T, drawCard } from '../ui.js';
import { input } from '../core/InputManager.js';
import { sfx } from '../core/Sfx.js';
import { updatePlay } from '../core/Storage.js';

const MAX_LEN = 40;
const LGPD = 'Aceito ser contatado pela Quimia sobre o brinde (LGPD). Posso pedir a exclusão a qualquer momento.';

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
    this.consent = false;
    this.company = false;
    this.typedByKeyboard = false;
    addBackground(this);
    this.bubbles = new BubbleField(this, 14);

    T(this, 960, 60, 'Entrou no ranking!', 'h1', { color: COLORS.neon });
    T(this, 960, 125, 'É opcional: deixe seu @ ou WhatsApp para a gente te chamar se ganhar. Pode digitar no teclado.', 'bodyL', { color: COLORS.mint2 });

    const box = this.add.graphics();
    drawCard(box, 410, 165, 1100, 100, { fill: COLORS.card, stroke: COLORS.neon, sw: 4 });
    this.valueText = T(this, 960, 215, '', 'h2');
    this.msg = T(this, 960, 292, '', 'bodyL', { color: COLORS.danger });

    // Teclado de tela
    const rows = [
      '1234567890'.split(''),
      'qwertyuiop'.split(''),
      'asdfghjkl@'.split(''),
      'zxcvbnm._-'.split(''),
      ['APAGAR'],
      ['CHECK_LGPD'],
      ['CHECK_EMPRESA'],
      ['SALVAR', 'AGORA NÃO'],
    ];
    this.keys = [];
    let y = 335;
    rows.forEach((row, r) => {
      const widths = row.map((l) => (l === 'CHECK_LGPD' || l === 'CHECK_EMPRESA' ? 1400 : l.length > 1 ? 330 : 100));
      const total = widths.reduce((a, b) => a + b, 0) + (row.length - 1) * 14;
      let x = 960 - total / 2;
      const h = r >= 5 && r <= 6 ? 64 : 78;
      row.forEach((label, c) => {
        const g = this.add.graphics();
        const t = T(this, x + widths[c] / 2, y + h / 2, '', label.length > 1 ? 'buttonM' : 'h3');
        this.keys.push({ label, r, c, x, y, w: widths[c], h, g, t, cx: x + widths[c] / 2 });
        x += widths[c] + 14;
      });
      y += h + (r >= 5 && r <= 6 ? 10 : 12);
    });
    this.rowsLen = rows.map((r) => r.length);
    this.fr = 7;
    this.fc = 0;
    this.refresh();

    // Teclado físico: digita direto, Backspace/Delete apagam, Enter salva
    this.offText = input.onText((e) => {
      if (!this.ready(200)) return;
      if (/^[a-z0-9@._-]$/i.test(e.key) && !e.repeat) {
        this.typedByKeyboard = true;
        this.add_(e.key.toLowerCase());
      } else if (e.key === 'Backspace' || e.key === 'Delete') this.del();
      else if (e.key === 'Enter' && this.typedByKeyboard) {
        this.enterHandled = true;
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
    if (k.label === 'CHECK_LGPD') return `${this.consent ? '[X]' : '[  ]'}  ${LGPD}`;
    if (k.label === 'CHECK_EMPRESA') return `${this.company ? '[X]' : '[  ]'}  Sou de uma empresa (quero saber do painel B2B)`;
    return k.label;
  }

  refresh() {
    const f = this.focusKey();
    this.keys.forEach((k) => {
      const on = k === f;
      const check = k.label.startsWith('CHECK');
      const special = check || k.label.length > 1;
      drawCard(k.g, k.x, k.y, k.w, k.h, {
        fill: on ? COLORS.neon : special ? COLORS.elevated : COLORS.card,
        stroke: on ? COLORS.white : COLORS.elevated2,
        sw: on ? 5 : 3,
        r: 16,
      });
      k.t.setText(this.label(k));
      k.t.setColor(on ? COLORS.darkText : COLORS.white);
      if (check) k.t.setFontSize('24px');
    });
    this.valueText.setText(this.value + (Math.floor(this.time.now / 450) % 2 ? '_' : ' '));
  }

  add_(ch) {
    if (this.value.length >= MAX_LEN) return sfx.play('error');
    this.value += ch;
    this.msg.setText('');
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
    if (v.length < 5) {
      this.msg.setText('Digite pelo menos 5 caracteres.');
      return sfx.play('error');
    }
    if (!this.consent) {
      this.msg.setText('Marque o aceite (LGPD) para salvar.');
      return sfx.play('error');
    }
    const type = v.startsWith('@') ? 'instagram' : /^\+?\d[\d\s()-]{7,}$/.test(v) ? 'whatsapp' : /@.+\./.test(v) ? 'email' : 'outro';
    updatePlay(this.playId, { contact: v, contactType: type, consent: true, company: this.company });
    sfx.play('fanfare');
    this.done();
  }

  done() {
    this.scene.start('Viral', { next: this.next });
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
      else if (k.label === 'CHECK_LGPD') { this.consent = !this.consent; this.msg.setText(''); sfx.play('nav'); }
      else if (k.label === 'CHECK_EMPRESA') { this.company = !this.company; sfx.play('nav'); }
      else this.add_(k.label);
    }
    if (input.pressed('back')) { sfx.play('back'); this.done(); }
  }
}
