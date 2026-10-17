import { GAME } from "./config.js";
import { readBool, writeValue } from "./utils.js";

const LEVEL_NOTES = [392, 440, 523.25, 587.33, 659.25, 783.99, 880, 987.77, 1174.66];

export class SoundKit {
  constructor() {
    this.enabled = readBool(GAME.soundKey, true);
    this.ctx = null;
    this.master = null;
    this.noiseBuffer = null;
  }

  init() {
    if (!this.enabled) return;
    try {
      if (!this.ctx) {
        const Context = window.AudioContext || window.webkitAudioContext;
        if (!Context) return;
        this.ctx = new Context();
        this.master = this.ctx.createGain();
        this.master.gain.value = 0.16;
        this.master.connect(this.ctx.destination);
      }
      if (this.ctx.state === "suspended") this.ctx.resume().catch(() => {});
    } catch {
      this.ctx = null;
      this.master = null;
    }
  }

  setEnabled(enabled) {
    this.enabled = Boolean(enabled);
    writeValue(GAME.soundKey, this.enabled ? 1 : 0);
    if (this.enabled) this.init();
  }

  toggle() {
    this.setEnabled(!this.enabled);
    if (this.enabled) this.ui();
    return this.enabled;
  }

  get ready() {
    return Boolean(this.enabled && this.ctx && this.master);
  }

  note({
    freq = 440,
    endFreq = null,
    duration = 0.2,
    volume = 0.2,
    type = "sine",
    delay = 0,
    attack = 0.008,
  } = {}) {
    if (!this.ready) return;
    try {
      const now = this.ctx.currentTime + delay;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, now);
      if (endFreq !== null) {
        osc.frequency.exponentialRampToValueAtTime(Math.max(20, endFreq), now + duration);
      }
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.exponentialRampToValueAtTime(Math.max(0.001, volume), now + attack);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
      osc.connect(gain);
      gain.connect(this.master);
      osc.start(now);
      osc.stop(now + duration + 0.04);
    } catch {
      // Audio is decorative; ignore playback failures.
    }
  }

  noise({ duration = 0.16, volume = 0.1, delay = 0, from = 600, to = 160 } = {}) {
    if (!this.ready) return;
    try {
      if (!this.noiseBuffer) {
        // Long enough for the longest request (supernova is 0.9s).
        const length = Math.floor(this.ctx.sampleRate);
        this.noiseBuffer = this.ctx.createBuffer(1, length, this.ctx.sampleRate);
        const data = this.noiseBuffer.getChannelData(0);
        for (let i = 0; i < length; i += 1) data[i] = Math.random() * 2 - 1;
      }
      const now = this.ctx.currentTime + delay;
      const source = this.ctx.createBufferSource();
      source.buffer = this.noiseBuffer;
      const filter = this.ctx.createBiquadFilter();
      filter.type = "lowpass";
      filter.frequency.setValueAtTime(from, now);
      filter.frequency.exponentialRampToValueAtTime(Math.max(60, to), now + duration);
      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.exponentialRampToValueAtTime(volume, now + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
      source.connect(filter);
      filter.connect(gain);
      gain.connect(this.master);
      source.start(now);
      source.stop(now + duration + 0.03);
    } catch {
      // Ignore.
    }
  }

  ui() {
    this.note({ freq: 660, endFreq: 880, duration: 0.09, volume: 0.1, type: "sine" });
  }

  start() {
    this.note({ freq: 392, duration: 0.38, volume: 0.12, type: "sine", attack: 0.02 });
    this.note({ freq: 587.33, duration: 0.45, volume: 0.11, type: "triangle", delay: 0.12 });
    this.note({ freq: 783.99, duration: 0.65, volume: 0.08, type: "sine", delay: 0.24 });
    this.noise({ duration: 0.3, volume: 0.03, from: 2200, to: 500 });
  }

  drop() {
    this.noise({ duration: 0.08, volume: 0.06, from: 700, to: 220 });
    this.note({ freq: 206, endFreq: 150, duration: 0.11, volume: 0.08, type: "sine" });
  }

  merge(level = 0, combo = 1) {
    const base = LEVEL_NOTES[Math.min(level, LEVEL_NOTES.length - 1)];
    this.note({ freq: base, endFreq: base * 1.02, duration: 0.22, volume: 0.16, type: "triangle", attack: 0.006 });
    this.note({ freq: base * 1.5, duration: 0.3, volume: 0.08, type: "sine", delay: 0.035 });
    this.note({ freq: base * 2, duration: 0.2, volume: 0.05, type: "sine", delay: 0.07 });
    if (combo > 1) {
      const sparkle = base * 2 * Math.pow(2, Math.min(combo - 1, 5) / 12);
      this.note({ freq: sparkle, duration: 0.25, volume: 0.055, type: "sine", delay: 0.1 });
    }
    this.noise({ duration: 0.1, volume: 0.03, from: 2600, to: 900 });
  }

  supernova() {
    this.note({ freq: 140, endFreq: 45, duration: 0.8, volume: 0.24, type: "sine", attack: 0.01 });
    this.noise({ duration: 0.9, volume: 0.12, from: 900, to: 80 });
    [523.25, 659.25, 783.99, 1046.5].forEach((freq, index) => {
      this.note({ freq, duration: 0.8, volume: 0.08, type: "triangle", delay: 0.1 + index * 0.07 });
    });
  }

  gameOver() {
    [523.25, 440, 349.23, 261.63].forEach((freq, index) => {
      this.note({ freq, duration: 0.38, volume: 0.09, type: "sine", delay: index * 0.16 });
    });
    this.note({ freq: 130.81, duration: 0.8, volume: 0.07, type: "sine", delay: 0.35 });
  }

  newBest() {
    [659.25, 783.99, 987.77, 1318.51].forEach((freq, index) => {
      this.note({ freq, duration: 0.35, volume: 0.075, type: "sine", delay: 0.55 + index * 0.1 });
    });
  }
}
