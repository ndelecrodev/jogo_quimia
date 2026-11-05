// Sons sintetizados com WebAudio (nenhum arquivo de áudio). Volume baixo por padrão: feira é barulhenta.
class Sfx {
  constructor() {
    this.ctx = null;
    this.muted = false;
    this.vol = 0.5;
    this.musicTimer = null;
    this.step = 0;
  }

  ensure() {
    if (!this.ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      this.ctx = new AC();
    }
    if (this.ctx.state === 'suspended') this.ctx.resume();
    return this.ctx;
  }

  tone(freq, dur, { type = 'sine', vol = 0.2, slide = 0, delay = 0 } = {}) {
    if (this.muted) return;
    const c = this.ensure();
    if (!c) return;
    const t = c.currentTime + delay;
    const o = c.createOscillator();
    const g = c.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(40, freq + slide), t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol * this.vol, t + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g);
    g.connect(c.destination);
    o.start(t);
    o.stop(t + dur + 0.03);
  }

  play(name) {
    switch (name) {
      case 'nav': this.tone(520, 0.06, { type: 'triangle', vol: 0.12 }); break;
      case 'ok': this.tone(660, 0.08, { type: 'triangle' }); this.tone(880, 0.1, { type: 'triangle', delay: 0.07 }); break;
      case 'back': this.tone(440, 0.08, { type: 'triangle', vol: 0.15 }); break;
      case 'error': this.tone(220, 0.18, { type: 'square', vol: 0.12, slide: -80 }); break;
      case 'flap': this.tone(420, 0.12, { type: 'sine', vol: 0.18, slide: 380 }); break;
      case 'point': this.tone(784, 0.09, { type: 'triangle', vol: 0.18 }); this.tone(1175, 0.12, { type: 'triangle', vol: 0.16, delay: 0.06 }); break;
      case 'bonus': [880, 1100, 1320].forEach((f, i) => this.tone(f, 0.1, { type: 'sine', vol: 0.15, delay: i * 0.05 })); break;
      case 'hit': this.tone(180, 0.28, { type: 'sawtooth', vol: 0.2, slide: -110 }); break;
      case 'level': [523, 659, 784, 1047].forEach((f, i) => this.tone(f, 0.12, { type: 'triangle', vol: 0.17, delay: i * 0.07 })); break;
      case 'end': [523, 440, 349, 262].forEach((f, i) => this.tone(f, 0.18, { type: 'triangle', vol: 0.17, delay: i * 0.12 })); break;
      case 'fanfare': [523, 659, 784, 659, 784, 1047].forEach((f, i) => this.tone(f, 0.16, { type: 'triangle', vol: 0.18, delay: i * 0.11 })); break;
      default: break;
    }
  }

  startMusic() {
    if (this.musicTimer) return;
    const notes = [262, 330, 392, 330, 294, 370, 440, 370]; // pentatônica suave
    this.musicTimer = setInterval(() => {
      if (this.muted) return;
      const f = notes[this.step++ % notes.length];
      this.tone(f, 0.5, { type: 'sine', vol: 0.05 });
    }, 520);
  }

  stopMusic() {
    clearInterval(this.musicTimer);
    this.musicTimer = null;
  }

  setMuted(m) {
    this.muted = !!m;
  }
}

export const sfx = new Sfx();
