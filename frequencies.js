/* =========================================================
   TAJNSTVO — Solfeggio + high-frequency healing tones.
   Web Audio synthesis: dual sine + slight detune + lowpass.
   Each card on the Frequencies section is a self-contained
   tone player with a live waveform visualiser.
   ========================================================= */

(function () {
  'use strict';

  const FREQUENCIES = [
    { hz: 174, name: 'Foundation',     desc: 'rooting, ease, the body coming back to itself' },
    { hz: 285, name: 'Restoration',    desc: 'tissue regeneration, repair, returning to wholeness' },
    { hz: 396, name: 'Liberation',     desc: 'release of fear, guilt, the weight of inherited shame' },
    { hz: 417, name: 'Transformation', desc: 'undoing of stuck situations, the willingness to change' },
    { hz: 432, name: 'Harmony',        desc: 'natural tuning, often called the frequency of the cosmos' },
    { hz: 528, name: 'Love',           desc: 'cellular renewal, transformation, the famed DNA‑repair tone' },
    { hz: 639, name: 'Connection',     desc: 'harmony in relationships, the courage to remain in contact' },
    { hz: 741, name: 'Awakening',      desc: 'expression, intuition, the clearing of held untruth' },
    { hz: 852, name: 'Insight',        desc: 'return to spiritual order, the eye that sees through' },
    { hz: 963, name: 'Unity',          desc: 'divine consciousness, the dissolution of the separate self' },
  ];

  let audioCtx = null;
  let masterGain = null;
  let masterVolume = 0.6;

  function ensureCtx() {
    if (!audioCtx) {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      masterGain = audioCtx.createGain();
      masterGain.gain.value = masterVolume;
      masterGain.connect(audioCtx.destination);
    }
    if (audioCtx.state === 'suspended') audioCtx.resume();
    return audioCtx;
  }

  class Tone {
    constructor(card, hz) {
      this.card = card;
      this.hz = hz;
      this.viz = card.querySelector('.freq__viz');
      this.btn = card.querySelector('.freq__btn');
      this.osc = null;
      this.osc2 = null;
      this.gain = null;
      this.analyser = null;
      this.vizReq = 0;
    }

    start() {
      const ctx = ensureCtx();
      if (this.osc) return;

      this.osc = ctx.createOscillator();
      this.osc.type = 'sine';
      this.osc.frequency.value = this.hz;

      // slight detuned partner for warmth + gentle beating
      this.osc2 = ctx.createOscillator();
      this.osc2.type = 'sine';
      this.osc2.frequency.value = this.hz;
      this.osc2.detune.value = 4;

      // lowpass tames the highest harmonics that sneak through aliasing
      const lp = ctx.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.value = this.hz * 4 + 800;
      lp.Q.value = 0.7;

      this.gain = ctx.createGain();
      this.gain.gain.value = 0;

      this.analyser = ctx.createAnalyser();
      this.analyser.fftSize = 512;

      this.osc.connect(lp);
      this.osc2.connect(lp);
      lp.connect(this.gain);
      this.gain.connect(this.analyser);
      this.analyser.connect(masterGain);

      const now = ctx.currentTime;
      this.gain.gain.linearRampToValueAtTime(0.14, now + 1.6);

      this.osc.start();
      this.osc2.start();

      this.card.classList.add('is-playing');
      this.btn.setAttribute('aria-label', 'Stop ' + this.hz + ' Hz');
      this.btn.innerHTML = pauseSvg();
      this.runViz();
    }

    stop() {
      if (!this.osc) return;
      const ctx = audioCtx;
      const now = ctx.currentTime;
      this.gain.gain.cancelScheduledValues(now);
      this.gain.gain.setValueAtTime(this.gain.gain.value, now);
      this.gain.gain.linearRampToValueAtTime(0, now + 0.8);

      const o = this.osc, o2 = this.osc2;
      setTimeout(() => {
        try { o.stop(); o2.stop(); } catch (_) {}
      }, 900);

      this.osc = null;
      this.osc2 = null;
      this.card.classList.remove('is-playing');
      this.btn.setAttribute('aria-label', 'Play ' + this.hz + ' Hz');
      this.btn.innerHTML = playSvg();
      this.stopViz();
    }

    toggle() { this.osc ? this.stop() : this.start(); }

    runViz() {
      if (!this.viz || !this.analyser) return;
      const c = this.viz.getContext('2d');
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const cssW = this.viz.clientWidth || 180;
      const cssH = this.viz.clientHeight || 36;
      this.viz.width  = cssW * dpr;
      this.viz.height = cssH * dpr;
      const w = this.viz.width, h = this.viz.height;

      const data = new Uint8Array(this.analyser.frequencyBinCount);
      const draw = () => {
        if (!this.analyser) return;
        this.analyser.getByteTimeDomainData(data);
        c.clearRect(0, 0, w, h);

        // soft glow
        c.lineWidth = 3 * dpr;
        c.strokeStyle = 'rgba(255, 140, 66, 0.18)';
        c.beginPath();
        for (let i = 0; i < data.length; i++) {
          const v = data[i] / 128 - 1;
          const x = (i / (data.length - 1)) * w;
          const y = h / 2 + v * h * 0.42;
          i === 0 ? c.moveTo(x, y) : c.lineTo(x, y);
        }
        c.stroke();

        // crisp line
        c.lineWidth = 1.3 * dpr;
        c.strokeStyle = 'rgba(255, 179, 122, 0.95)';
        c.beginPath();
        for (let i = 0; i < data.length; i++) {
          const v = data[i] / 128 - 1;
          const x = (i / (data.length - 1)) * w;
          const y = h / 2 + v * h * 0.42;
          i === 0 ? c.moveTo(x, y) : c.lineTo(x, y);
        }
        c.stroke();

        this.vizReq = requestAnimationFrame(draw);
      };
      draw();
    }

    stopViz() {
      if (this.vizReq) cancelAnimationFrame(this.vizReq);
      if (this.viz) {
        const c = this.viz.getContext('2d');
        c && c.clearRect(0, 0, this.viz.width, this.viz.height);
      }
    }
  }


  /* ---------- icons ---------- */
  const playSvg = () =>
    '<svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor" aria-hidden="true">' +
    '<path d="M8 5v14l11-7z"/></svg>';
  const pauseSvg = () =>
    '<svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor" aria-hidden="true">' +
    '<path d="M6 5h4v14H6zM14 5h4v14h-4z"/></svg>';


  /* ---------- DOM wiring ---------- */
  function mount() {
    const root = document.getElementById('frequencies');
    if (!root) return;
    const grid = root.querySelector('.freq__grid');
    if (!grid) return;

    const tones = [];

    for (const f of FREQUENCIES) {
      const card = document.createElement('article');
      card.className = 'freq';
      card.dataset.freq = f.hz;
      card.innerHTML = `
        <header class="freq__head">
          <span class="freq__hz">${f.hz}</span>
          <span class="freq__unit mono mono--small">Hz</span>
        </header>
        <h3 class="freq__name">${f.name}</h3>
        <p class="freq__desc">${f.desc}</p>
        <canvas class="freq__viz" width="200" height="36" aria-hidden="true"></canvas>
        <button class="freq__btn" type="button" aria-label="Play ${f.hz} Hz">${playSvg()}</button>
      `;
      grid.appendChild(card);
      const tone = new Tone(card, f.hz);
      tones.push(tone);
      card.querySelector('.freq__btn').addEventListener('click', (e) => {
        e.stopPropagation();
        tone.toggle();
      });
      card.addEventListener('click', () => tone.toggle());
    }

    // master controls
    const stopAll = root.querySelector('[data-freq-action="stop-all"]');
    if (stopAll) {
      stopAll.addEventListener('click', () => tones.forEach(t => t.stop()));
    }

    const volume = root.querySelector('[data-freq-action="volume"]');
    if (volume) {
      volume.addEventListener('input', () => {
        masterVolume = parseFloat(volume.value);
        if (masterGain) masterGain.gain.linearRampToValueAtTime(
          masterVolume, audioCtx.currentTime + 0.15
        );
      });
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', mount);
  } else {
    mount();
  }
})();
