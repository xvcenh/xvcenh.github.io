/* 吞噬之潮 · utils.js — 数学/颜色/缓动工具 */
(function () {
  const DT = (window.DT = window.DT || {});
  const U = (DT.util = {});

  U.TAU = Math.PI * 2;
  U.clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  U.lerp = (a, b, t) => a + (b - a) * t;
  U.rand = (a = 1, b = 0) => b + Math.random() * (a - b);
  U.randInt = (a, b) => Math.floor(U.rand(a, b + 1 - 1e-9));
  U.pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
  U.chance = (p) => Math.random() < p;
  U.dist = (ax, ay, bx, by) => Math.hypot(bx - ax, by - ay);
  U.dist2 = (ax, ay, bx, by) => (bx - ax) * (bx - ax) + (by - ay) * (by - ay);
  // 帧率无关平滑逼近
  U.approach = (cur, target, rate, dt) => cur + (target - cur) * (1 - Math.exp(-rate * dt));
  U.angleLerp = (a, b, t) => {
    let d = ((b - a + Math.PI) % U.TAU + U.TAU) % U.TAU - Math.PI;
    return a + d * t;
  };
  U.smooth = (t) => t * t * (3 - 2 * t);
  U.easeOut = (t) => 1 - Math.pow(1 - t, 3);

  U.hex = function (h) {
    if (typeof h === 'object') return h;
    h = String(h).replace('#', '');
    if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
    const n = parseInt(h, 16);
    return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
  };
  U.rgb = (c, a) => 'rgba(' + (c.r | 0) + ',' + (c.g | 0) + ',' + (c.b | 0) + ',' + (a === undefined ? 1 : a) + ')';
  U.mix = (a, b, t) => ({
    r: a.r + (b.r - a.r) * t,
    g: a.g + (b.g - a.g) * t,
    b: a.b + (b.b - a.b) * t,
  });
  U.shade = (c, f) => ({ r: U.clamp(c.r * f, 0, 255), g: U.clamp(c.g * f, 0, 255), b: U.clamp(c.b * f, 0, 255) });

  // 简易随机（带种子），用于背景生成的稳定性
  U.seeded = function (seed) {
    let s = seed >>> 0 || 1;
    return function () {
      s ^= s << 13; s >>>= 0;
      s ^= s >> 17;
      s ^= s << 5; s >>>= 0;
      return s / 4294967296;
    };
  };

  U.fmt = (n) => (n >= 10000 ? (n / 1000).toFixed(1) + 'k' : Math.round(n) + '');
})();
