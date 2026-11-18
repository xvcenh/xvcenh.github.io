export const lengths = { hip: 75, shin: 140, base: 80, wheel: 60.3 };
const origin = {x: 0, y: 0};
const pivot = {x: lengths.base, y: 0};
const tolerance = 1e-7;
const degrees = radians => radians * 180 / Math.PI;
const angle = (from, to) => degrees(Math.atan2(to.y - from.y, to.x - from.x));
const normal = value => ((value + 540) % 360) - 180;
const distance = (a,b) => Math.hypot(a.x - b.x, a.y - b.y);

function end(from, length, direction) {
  const radians = direction * Math.PI / 180;
  return {x: from.x + length * Math.cos(radians), y: from.y + length * Math.sin(radians)};
}
function intersections(p,r,q,s) {
  const d = distance(p,q);
  if (d < tolerance || d > r + s + tolerance || d < Math.abs(r - s) - tolerance) return [];
  const dx = (q.x-p.x)/d, dy = (q.y-p.y)/d;
  const u = (r*r - s*s + d*d)/(2*d);
  const h = Math.sqrt(Math.max(0,r*r-u*u));
  return [
    {x:p.x+dx*u-dy*h, y:p.y+dy*u+dx*h},
    {x:p.x+dx*u+dy*h, y:p.y+dy*u-dx*h}
  ];
}
export function forward(hip1, hip2, previousTip) {
  const B = end(origin,lengths.hip,hip1);
  const D = end(pivot,lengths.hip,hip2);
  const candidates = intersections(B,lengths.shin,D,lengths.shin);
  if (previousTip) candidates.sort((a,b) => distance(a,previousTip) - distance(b,previousTip));
  const C = candidates[0];
  return {A:origin,B,C,D,E:pivot,hip1,hip2,knee:C ? normal(angle(D,C)-hip2) : null,valid:Boolean(C)};
}
export function inverse(hip2, knee, previousHip = 60) {
  const D = end(pivot,lengths.hip,hip2);
  const C = end(D,lengths.shin,hip2+knee);
  const solutions = intersections(origin,lengths.hip,C,lengths.shin)
    .map(B => ({B, hip1:angle(origin,B)}))
    .filter(s => Math.abs(s.hip1) <= 150 + tolerance)
    .sort((a,b) => Math.abs(normal(a.hip1-previousHip)) - Math.abs(normal(b.hip1-previousHip)));
  const best = solutions[0];
  return {A:origin,B:best?.B,C,D,E:pivot,hip1:best?.hip1 ?? null,hip2,knee,valid:Boolean(best)};
}
