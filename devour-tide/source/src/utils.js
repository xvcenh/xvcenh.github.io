/* 纯工具函数：无任何依赖 */
var TAU = Math.PI * 2;
function rand(a, b){ return a + Math.random() * (b - a); }
function pick(a){ return a[Math.floor(Math.random() * a.length)]; }
function clamp(v, a, b){ return v < a ? a : (v > b ? b : v); }
function lerp(a, b, t){ return a + (b - a) * t; }
function rgba(hex, a){
  var n = parseInt(hex.slice(1), 16);
  return 'rgba(' + (n >> 16 & 255) + ',' + (n >> 8 & 255) + ',' + (n & 255) + ',' + a + ')';
}
function angLerp(a, b, t){
  var d = ((b - a + Math.PI * 3) % TAU) - Math.PI;
  return a + d * t;
}
function dist(ax, ay, bx, by){ return Math.hypot(ax - bx, ay - by); }

export { TAU, rand, pick, clamp, lerp, rgba, angLerp, dist };
