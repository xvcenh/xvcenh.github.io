import { TAU, rand, pick, clamp, lerp, rgba, angLerp, dist } from './utils.js';
/* WebAudio 合成音效 */
/* ============================================================
   音效
   ============================================================ */
var Audio2 = (function(){
  var ac = null;
  function init(){
    if (ac) return;
    try { ac = new (window.AudioContext || window.webkitAudioContext)(); } catch(e){ ac = null; }
  }
  var voiceN = 0;
  function tone(f, dur, type, gain, slideTo){
    if (!ac) return;
    /* 并发限流：超过 7 个直接丢弃，避免爆音与失真 */
    if (voiceN >= 7) return;
    var t = ac.currentTime;
    /* ±5% 音高抖动：同一个音效重复触发不会听腻 */
    var jit = 1 + (Math.random() * 2 - 1) * 0.05;
    var o = ac.createOscillator(), g = ac.createGain();
    o.type = type || 'sine';
    o.frequency.setValueAtTime(f * jit, t);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(Math.max(30, slideTo * jit), t + dur);
    /* 叠音越多，单个越轻 —— 简单侧链，防止三四个音同时响时爆掉 */
    var vol = (gain || 0.08) * (voiceN >= 4 ? 0.6 : (voiceN >= 2 ? 0.8 : 1));
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(ac.destination);
    o.start(t); o.stop(t + dur + 0.02);
    voiceN++;
    setTimeout(function(){ voiceN--; }, (dur + 0.06) * 1000);
  }
  return {
    init: init,
    eat: function(c){ tone(320 + Math.min(c, 20) * 26, 0.09, 'triangle', 0.055, 620); },
    dash: function(){ tone(180, 0.16, 'sawtooth', 0.04, 460); },
    escort: function(){
      tone(294,.24,'sine',.048,330);
      setTimeout(()=>tone(440,.34,'sine',.042,494),95);
      setTimeout(()=>tone(587,.5,'sine',.032,660),210);
    },
    hurt: function(){ tone(150, 0.24, 'square', 0.06, 60); },
    zap: function(){ tone(900, 0.1, 'square', 0.035, 300); },
    mutate: function(){
      tone(420, 0.16, 'sine', 0.07, 880);
      setTimeout(function(){ tone(660, 0.26, 'sine', 0.06, 1320); }, 110);
    },
    revive: function(){ tone(520, 0.2, 'sine', 0.07, 1040); },
    boss: function(){ tone(70, 0.7, 'sawtooth', 0.09, 42); },
    card: function(){ tone(560, 0.1, 'triangle', 0.05, 820); },
    over: function(){ tone(220, 0.7, 'sine', 0.08, 55); }
  };
})();

export { Audio2 };
