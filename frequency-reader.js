/* =========================================================
   TAJNSTVO — frequency reader
   Two-step biometric reading, entirely in-browser:
     Step 1: Body — finger photoplethysmography (PPG) via
             the back camera, 15-second sample, peak-detected
             to a pulse in BPM.
     Step 2: Voice — microphone capture for 10 seconds, with
             autocorrelation pitch detection and a running
             spectral-centroid estimate.
   Both streams are stopped and released immediately after
   sampling; nothing is uploaded.
   ========================================================= */

(function () {
  'use strict';

  /* ---------- BODY: finger PPG via camera ---------- */
  class BodyReader {
    constructor(card) {
      this.card = card;
      this.video = card.querySelector('video');
      this.viz   = card.querySelector('canvas.reader-card__viz');
      this.statusEl = card.querySelector('.reader-card__status');
      this.startBtn = card.querySelector('[data-action="begin"]');
      this.skipBtn  = card.querySelector('[data-action="skip"]');
      this.resultEl = card.querySelector('.reader-card__result');
      this.work = card.querySelector('canvas.reader-card__work');
      this.workCtx = this.work.getContext('2d', { willReadFrequently: true });
      this.samples = [];
      this.times = [];
      this.running = false;
      this.stream = null;
    }

    async start() {
      this.card.classList.add('is-running');
      this.startBtn.disabled = true;
      try {
        this.stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: 'environment' }, width: 320, height: 240 },
          audio: false,
        });
      } catch (e) {
        this.statusEl.textContent = 'Camera denied — try again or skip.';
        this.card.classList.remove('is-running');
        this.startBtn.disabled = false;
        return;
      }
      this.video.srcObject = this.stream;
      this.video.playsInline = true;
      this.video.muted = true;
      await this.video.play();

      // try to enable torch on the back camera if supported (helps PPG signal)
      const track = this.stream.getVideoTracks()[0];
      try {
        const caps = track.getCapabilities && track.getCapabilities();
        if (caps && caps.torch) {
          await track.applyConstraints({ advanced: [{ torch: true }] });
        }
      } catch (_) { /* ignore */ }

      this.samples = [];
      this.times   = [];
      this.startTime = performance.now();
      this.running = true;
      this.skipBtn.textContent = 'Cancel';
      this._sample();
    }

    _sample() {
      if (!this.running) return;
      const W = this.work.width, H = this.work.height;
      try {
        this.workCtx.drawImage(this.video, 0, 0, W, H);
      } catch (e) { /* video not ready */ }

      const img = this.workCtx.getImageData(W * 0.35, H * 0.35, W * 0.3, H * 0.3);
      let r = 0, g = 0, count = 0;
      for (let i = 0; i < img.data.length; i += 4) {
        r += img.data[i];
        g += img.data[i + 1];
        count++;
      }
      r /= count;
      g /= count;

      // ratio is more robust than channel alone
      const signal = r / Math.max(1, g);
      const t = (performance.now() - this.startTime) / 1000;
      this.samples.push(signal);
      this.times.push(t);

      // live trace
      this._drawTrace(t);

      // status
      const remain = Math.max(0, 15 - t);
      this.statusEl.textContent = remain.toFixed(0) + 's  ·  sampling pulse';

      if (t >= 15) { this._finish(); return; }
      this._req = requestAnimationFrame(() => this._sample());
    }

    _drawTrace(tNow) {
      if (!this.viz) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const cssW = this.viz.clientWidth || 240, cssH = this.viz.clientHeight || 60;
      if (this.viz.width !== cssW * dpr) {
        this.viz.width  = cssW * dpr;
        this.viz.height = cssH * dpr;
      }
      const c = this.viz.getContext('2d');
      const w = this.viz.width, h = this.viz.height;
      c.clearRect(0, 0, w, h);

      // detrended last 8s window
      const windowSec = 8;
      const tStart = Math.max(0, tNow - windowSec);
      let lo = 0;
      while (lo < this.times.length && this.times[lo] < tStart) lo++;
      const slice = this.samples.slice(lo);
      const times = this.times.slice(lo);
      if (slice.length < 2) return;

      // detrend
      const mean = slice.reduce((a, b) => a + b, 0) / slice.length;
      const det = slice.map(v => v - mean);
      const max = Math.max(...det.map(Math.abs)) || 1;

      c.strokeStyle = 'rgba(255, 140, 66, 0.9)';
      c.lineWidth = 1.4 * dpr;
      c.beginPath();
      for (let i = 0; i < det.length; i++) {
        const x = ((times[i] - tStart) / windowSec) * w;
        const y = h / 2 - (det[i] / max) * (h * 0.42);
        i === 0 ? c.moveTo(x, y) : c.lineTo(x, y);
      }
      c.stroke();
    }

    cancel() {
      if (!this.running) return;
      this.running = false;
      if (this._req) cancelAnimationFrame(this._req);
      if (this.stream) {
        this.stream.getTracks().forEach(t => t.stop());
        this.stream = null;
      }
      this.card.classList.remove('is-running');
      this.startBtn.disabled = false;
      this.skipBtn.textContent = 'Skip';
      this.statusEl.textContent = 'Cancelled.';
    }

    _finish() {
      this.running = false;
      if (this.stream) {
        this.stream.getTracks().forEach(t => t.stop());
        this.stream = null;
      }
      const result = this._analyze();
      this.card.classList.remove('is-running');
      this.card.classList.add('is-done');
      this.startBtn.disabled = false;
      this.skipBtn.textContent = 'Re-take';
      if (result && result.bpm) {
        this.statusEl.textContent = 'Pulse · ' + result.bpm + ' bpm';
        this.resultEl.hidden = false;
        this.resultEl.innerHTML =
          '<span class="reader-card__big">' + result.bpm + '</span>' +
          '<span class="reader-card__unit">BPM</span>';
      } else {
        this.statusEl.textContent = 'Signal too weak — keep finger pressed and retry.';
      }
      window.dispatchEvent(new CustomEvent('tajnstvo:body-reading', { detail: result }));
    }

    _analyze() {
      if (this.samples.length < 90) return null;

      // detrend with a 1-second moving average
      const fps = this.samples.length / (this.times[this.times.length - 1] || 1);
      const win = Math.max(15, Math.round(fps));
      const detrend = this.samples.map((v, i) => {
        const lo = Math.max(0, i - win), hi = Math.min(this.samples.length, i + win);
        let sum = 0;
        for (let k = lo; k < hi; k++) sum += this.samples[k];
        return v - sum / (hi - lo);
      });

      // peak detection — local maxima above a small threshold
      const std = Math.sqrt(
        detrend.reduce((a, b) => a + b * b, 0) / detrend.length
      );
      const thr = std * 0.4;
      const peakIdx = [];
      for (let i = 3; i < detrend.length - 3; i++) {
        if (
          detrend[i] > thr &&
          detrend[i] > detrend[i - 1] && detrend[i] > detrend[i + 1] &&
          detrend[i] > detrend[i - 2] && detrend[i] > detrend[i + 2]
        ) {
          if (!peakIdx.length || (this.times[i] - this.times[peakIdx[peakIdx.length - 1]]) > 0.3) {
            peakIdx.push(i);
          }
        }
      }
      if (peakIdx.length < 3) return null;

      const intervals = [];
      for (let i = 1; i < peakIdx.length; i++) {
        intervals.push(this.times[peakIdx[i]] - this.times[peakIdx[i - 1]]);
      }
      intervals.sort((a, b) => a - b);
      const median = intervals[Math.floor(intervals.length / 2)];
      if (!median) return null;
      const bpm = 60 / median;
      if (bpm < 40 || bpm > 200) return null;
      return { bpm: Math.round(bpm), peaks: peakIdx.length };
    }
  }


  /* ---------- VOICE: pitch + spectral centroid ---------- */
  class VoiceReader {
    constructor(card) {
      this.card = card;
      this.viz       = card.querySelector('canvas.reader-card__viz');
      this.statusEl  = card.querySelector('.reader-card__status');
      this.startBtn  = card.querySelector('[data-action="begin"]');
      this.skipBtn   = card.querySelector('[data-action="skip"]');
      this.resultEl  = card.querySelector('.reader-card__result');
      this.pitches = [];
      this.centroids = [];
      this.running = false;
      this.stream = null;
      this.ctx = null;
    }

    async start() {
      this.card.classList.add('is-running');
      this.startBtn.disabled = true;
      try {
        this.stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      } catch (e) {
        this.statusEl.textContent = 'Microphone denied — try again or skip.';
        this.card.classList.remove('is-running');
        this.startBtn.disabled = false;
        return;
      }
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
      this.source = this.ctx.createMediaStreamSource(this.stream);
      this.analyser = this.ctx.createAnalyser();
      this.analyser.fftSize = 2048;
      this.source.connect(this.analyser);

      this.pitches = [];
      this.centroids = [];
      this.startTime = performance.now();
      this.running = true;
      this.skipBtn.textContent = 'Cancel';
      this._sample();
    }

    _sample() {
      if (!this.running) return;

      const td = new Float32Array(this.analyser.fftSize);
      this.analyser.getFloatTimeDomainData(td);
      const pitch = this._findPitch(td, this.ctx.sampleRate);
      if (pitch) this.pitches.push(pitch);

      const fd = new Uint8Array(this.analyser.frequencyBinCount);
      this.analyser.getByteFrequencyData(fd);
      let total = 0, weighted = 0;
      for (let i = 0; i < fd.length; i++) {
        const mag = fd[i];
        total += mag;
        weighted += i * mag;
      }
      if (total > 1000) {
        const centroidBin = weighted / total;
        const centroidHz = centroidBin * (this.ctx.sampleRate / 2) / fd.length;
        this.centroids.push(centroidHz);
      }

      this._drawTrace(td);

      const t = (performance.now() - this.startTime) / 1000;
      const remain = Math.max(0, 10 - t);
      this.statusEl.textContent = remain.toFixed(0) + 's  ·  listening';

      if (t >= 10) { this._finish(); return; }
      this._req = requestAnimationFrame(() => this._sample());
    }

    _drawTrace(td) {
      if (!this.viz) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const cssW = this.viz.clientWidth || 240, cssH = this.viz.clientHeight || 60;
      if (this.viz.width !== cssW * dpr) {
        this.viz.width  = cssW * dpr;
        this.viz.height = cssH * dpr;
      }
      const c = this.viz.getContext('2d');
      const w = this.viz.width, h = this.viz.height;
      c.clearRect(0, 0, w, h);
      c.strokeStyle = 'rgba(77, 214, 200, 0.9)';
      c.lineWidth = 1.4 * dpr;
      c.beginPath();
      for (let i = 0; i < td.length; i += 2) {
        const x = (i / td.length) * w;
        const y = h / 2 + td[i] * h * 0.45;
        i === 0 ? c.moveTo(x, y) : c.lineTo(x, y);
      }
      c.stroke();
    }

    _findPitch(buf, sampleRate) {
      // quick autocorrelation between 80 Hz and 400 Hz
      const SIZE = buf.length;
      const minLag = Math.floor(sampleRate / 400);
      const maxLag = Math.floor(sampleRate / 80);
      let bestLag = -1, bestCorr = 0;
      for (let lag = minLag; lag < maxLag; lag++) {
        let sum = 0;
        for (let i = 0; i < SIZE - lag; i++) {
          sum += buf[i] * buf[i + lag];
        }
        if (sum > bestCorr) {
          bestCorr = sum;
          bestLag = lag;
        }
      }
      if (bestLag === -1) return null;
      // rms gate
      let rms = 0;
      for (let i = 0; i < SIZE; i++) rms += buf[i] * buf[i];
      rms = Math.sqrt(rms / SIZE);
      if (rms < 0.01) return null;
      return sampleRate / bestLag;
    }

    cancel() {
      if (!this.running) return;
      this.running = false;
      if (this._req) cancelAnimationFrame(this._req);
      if (this.stream) this.stream.getTracks().forEach(t => t.stop());
      if (this.ctx) this.ctx.close();
      this.stream = null;
      this.ctx = null;
      this.card.classList.remove('is-running');
      this.startBtn.disabled = false;
      this.skipBtn.textContent = 'Skip';
      this.statusEl.textContent = 'Cancelled.';
    }

    _finish() {
      this.running = false;
      if (this.stream) this.stream.getTracks().forEach(t => t.stop());
      if (this.ctx) this.ctx.close();
      this.stream = null;
      this.ctx = null;
      const result = this._analyze();
      this.card.classList.remove('is-running');
      this.card.classList.add('is-done');
      this.startBtn.disabled = false;
      this.skipBtn.textContent = 'Re-take';
      if (result && result.pitch) {
        this.statusEl.textContent = 'Voice · ' + result.pitch + ' Hz';
        this.resultEl.hidden = false;
        this.resultEl.innerHTML =
          '<span class="reader-card__big">' + result.pitch + '</span>' +
          '<span class="reader-card__unit">Hz</span>';
      } else {
        this.statusEl.textContent = 'Voice too quiet — try again, closer to the mic.';
      }
      window.dispatchEvent(new CustomEvent('tajnstvo:voice-reading', { detail: result }));
    }

    _analyze() {
      const pitches = this.pitches.filter(p => p > 70 && p < 400);
      if (!pitches.length) return null;
      pitches.sort((a, b) => a - b);
      const pitch = Math.round(pitches[Math.floor(pitches.length / 2)]);
      const cent  = this.centroids.length
        ? Math.round(this.centroids.reduce((a, b) => a + b, 0) / this.centroids.length)
        : 0;
      return { pitch, centroid: cent };
    }
  }


  /* ---------- combined frequency interpretation ---------- */
  function computeFrequency(body, voice) {
    let score = 400; // baseline at "Reason"

    if (body && body.bpm) {
      // 60 bpm → +40 (calmer = higher consciousness register)
      // 100 bpm → -40
      score += (80 - body.bpm) * 2;
    }

    if (voice && voice.centroid) {
      if (voice.centroid > 2400)      score += 10;   // bright/alert
      else if (voice.centroid > 1700) score += 35;   // engaged but warm
      else if (voice.centroid > 1100) score += 50;   // grounded
      else                            score += 25;   // very soft / quiet recording
    }

    score = Math.max(180, Math.min(720, Math.round(score)));
    return score;
  }

  function hawkinsLevel(score) {
    if (score < 200) return { name: 'Acceptance of difficulty', desc: 'A protective register. The work is to allow softness back in.' };
    if (score < 250) return { name: 'Courage',      desc: 'You are crossing the threshold from contraction to truth.' };
    if (score < 310) return { name: 'Neutrality',   desc: 'A grounded, unattached register. The mind is unargued.' };
    if (score < 350) return { name: 'Willingness',  desc: 'You are open to growth, ready to receive the next instruction.' };
    if (score < 400) return { name: 'Acceptance',   desc: 'You meet what is, without arguing with it.' };
    if (score < 500) return { name: 'Reason',       desc: 'Clarity, discernment, the well-ordered mind.' };
    if (score < 540) return { name: 'Love',         desc: 'You broadcast care without effort. The room softens around you.' };
    if (score < 600) return { name: 'Joy',          desc: 'A quiet bright register that needs no occasion to be present.' };
    if (score < 700) return { name: 'Peace',        desc: 'Stillness that holds without holding on.' };
    return                  { name: 'Enlightenment', desc: 'Beyond the personal frequency — be careful with this reading; rest, then re-take.' };
  }


  /* ---------- DOM wiring ---------- */
  function mount() {
    const section = document.getElementById('reader');
    if (!section) return;
    const bodyCard  = section.querySelector('[data-reader="body"]');
    const voiceCard = section.querySelector('[data-reader="voice"]');
    if (!bodyCard || !voiceCard) return;

    const body  = new BodyReader(bodyCard);
    const voice = new VoiceReader(voiceCard);

    bodyCard.querySelector('[data-action="begin"]').addEventListener('click', () => body.start());
    bodyCard.querySelector('[data-action="skip"]').addEventListener('click', () => {
      if (body.running) body.cancel();
      else { bodyCard.classList.add('is-skipped'); refreshOutput(null, lastVoice); }
    });
    voiceCard.querySelector('[data-action="begin"]').addEventListener('click', () => voice.start());
    voiceCard.querySelector('[data-action="skip"]').addEventListener('click', () => {
      if (voice.running) voice.cancel();
      else { voiceCard.classList.add('is-skipped'); refreshOutput(lastBody, null); }
    });

    let lastBody = null, lastVoice = null;
    window.addEventListener('tajnstvo:body-reading',  (e) => { lastBody  = e.detail; refreshOutput(lastBody, lastVoice); });
    window.addEventListener('tajnstvo:voice-reading', (e) => { lastVoice = e.detail; refreshOutput(lastBody, lastVoice); });

    const outEl   = section.querySelector('.reader__output');
    const outNum  = outEl.querySelector('.reader__output-num');
    const outName = outEl.querySelector('.reader__output-name');
    const outDesc = outEl.querySelector('.reader__output-desc');
    const outMeta = outEl.querySelector('.reader__output-meta');

    function refreshOutput(b, v) {
      if (!b && !v) {
        outEl.hidden = true;
        return;
      }
      const score = computeFrequency(b, v);
      const lv = hawkinsLevel(score);
      outEl.hidden = false;
      outNum.textContent  = score;
      outName.textContent = lv.name;
      outDesc.textContent = lv.desc;
      const meta = [];
      if (b && b.bpm)  meta.push(b.bpm + ' bpm');
      if (v && v.pitch) meta.push(v.pitch + ' Hz voice');
      outMeta.textContent = meta.join('  ·  ');
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', mount);
  } else {
    mount();
  }
})();
