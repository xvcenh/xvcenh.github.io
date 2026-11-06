/* 吞噬之潮 · audio.js — WebAudio 全程序化合成（零音频素材） */
(function () {
  const DT = (window.DT = window.DT || {});
  const A = (DT.audio = { ready: false, vol: 0.7, muted: false });

  A.init = function () {
    if (A.ready) return;
    const C = window.AudioContext || window.webkitAudioContext;
    if (!C) return;
    const ctx = new C();
    A.ctx = ctx;
    A.master = ctx.createGain();
    A.master.gain.value = A.vol;
    A.master.connect(ctx.destination);

    // 白噪声源（环境水声 / 音效共用）
    const len = ctx.sampleRate * 2;
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    A.noiseBuf = buf;

    // 环境水声：噪声 → 低通（LFO 慢扫）
    const src = ctx.createBufferSource();
    src.buffer = buf; src.loop = true;
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass'; lp.frequency.value = 320; lp.Q.value = 0.6;
    const g = ctx.createGain(); g.gain.value = 0.055;
    src.connect(lp); lp.connect(g); g.connect(A.master);
    const lfo = ctx.createOscillator(); lfo.frequency.value = 0.07;
    const lg = ctx.createGain(); lg.gain.value = 140;
    lfo.connect(lg); lg.connect(lp.frequency); lfo.start();
    src.start();
    A.ambFilter = lp;

    // 低音垫：三个失谐正弦
    A.pad = [];
    [110, 164.8, 220].forEach((f) => {
      const o = ctx.createOscillator(); o.type = 'sine'; o.frequency.value = f;
      const og = ctx.createGain(); og.gain.value = 0.011;
      o.connect(og); og.connect(A.master); o.start();
      A.pad.push(o);
    });
    A.ready = true;
  };

  A.setVolume = function (v) {
    A.vol = v;
    if (A.master) A.master.gain.value = A.muted ? 0 : v;
  };
  A.toggleMute = function () {
    A.muted = !A.muted;
    if (A.master) A.master.gain.value = A.muted ? 0 : A.vol;
    return A.muted;
  };

  // 场景音色：换滤波截止 + 垫音根音
  A.setScene = function (i) {
    if (!A.ready) return;
    const cut = [420, 300, 240, 340, 200, 130][i % 6];
    const root = [220, 196, 174, 164, 146, 110][i % 6];
    A.ambFilter.frequency.linearRampToValueAtTime(cut, A.ctx.currentTime + 2.5);
    A.pad.forEach((o, k) => {
      o.frequency.linearRampToValueAtTime(root * (1 + k * 0.5), A.ctx.currentTime + 2.5);
    });
  };

  function tone(freq, dur, type, gain, slideTo, delay) {
    if (!A.ready || A.muted) return;
    const ctx = A.ctx, t0 = ctx.currentTime + (delay || 0);
    const o = ctx.createOscillator();
    o.type = type || 'sine';
    o.frequency.setValueAtTime(freq, t0);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(Math.max(20, slideTo), t0 + dur);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(gain, t0 + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g); g.connect(A.master);
    o.start(t0); o.stop(t0 + dur + 0.05);
  }

  function noiseBurst(dur, freq, gain, type) {
    if (!A.ready || A.muted) return;
    const ctx = A.ctx, t0 = ctx.currentTime;
    const s = ctx.createBufferSource(); s.buffer = A.noiseBuf;
    const f = ctx.createBiquadFilter(); f.type = type || 'bandpass'; f.frequency.value = freq; f.Q.value = 1.2;
    const g = ctx.createGain();
    g.gain.setValueAtTime(gain, t0);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    s.connect(f); f.connect(g); g.connect(A.master);
    s.start(t0); s.stop(t0 + dur + 0.05);
  }

  A.sfx = function (name, opt) {
    if (!A.ready || A.muted) return;
    const o = opt || {};
    switch (name) {
      case 'eat':
        tone(280 + Math.min(520, (o.combo || 0) * 22), 0.1, 'triangle', 0.16, 520 + (o.combo || 0) * 20);
        noiseBurst(0.06, 900, 0.05);
        break;
      case 'bigEat':
        tone(180, 0.22, 'triangle', 0.22, 60);
        noiseBurst(0.18, 500, 0.1);
        break;
      case 'dash': noiseBurst(0.16, 1600, 0.09, 'highpass'); tone(660, 0.1, 'sine', 0.05, 240); break;
      case 'hurt': tone(160, 0.18, 'sawtooth', 0.14, 70); noiseBurst(0.14, 320, 0.1); break;
      case 'card':
        [523, 659, 784].forEach((f, i) => tone(f, 0.16, 'triangle', 0.12, null, i * 0.07));
        break;
      case 'level':
        [523, 659, 784, 1046, 1318].forEach((f, i) => tone(f, 0.22, 'triangle', 0.12, null, i * 0.08));
        break;
      case 'ui': tone(720, 0.05, 'square', 0.05, 900); break;
      case 'die': tone(320, 0.5, 'sawtooth', 0.16, 60); noiseBurst(0.4, 200, 0.12); break;
      case 'boss': tone(70, 1.2, 'sawtooth', 0.16, 48); tone(140, 1.0, 'triangle', 0.1, 90); break;
      case 'duel':
        tone(440, 0.3, 'square', 0.12); tone(440, 0.3, 'square', 0.12, null, 0.4);
        tone(330, 0.6, 'sawtooth', 0.1, 220, 0.8);
        break;
      case 'win':
        [523, 659, 784, 1046, 1318, 1568].forEach((f, i) => tone(f, 0.3, 'triangle', 0.13, null, i * 0.11));
        break;
      case 'revive':
        [392, 523, 659, 880].forEach((f, i) => tone(f, 0.25, 'sine', 0.12, null, i * 0.1));
        break;
    }
  };
})();
