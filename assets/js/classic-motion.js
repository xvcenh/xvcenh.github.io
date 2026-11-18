const preference = matchMedia("(prefers-reduced-motion: reduce)");
const renderers = new Set();
let paused = preference.matches;
let pending = 0;
let previous = 0;

export function motionPaused() { return paused; }

function tick(time) {
  pending = 0;
  if (document.hidden) return;
  const dt = paused || !previous ? 0 : Math.min((time - previous) / 1000, .1);
  previous = time;
  for (const render of renderers) render(time, dt);
  if (!paused) redraw();
}

export function redraw() {
  if (!pending && !document.hidden) pending = requestAnimationFrame(tick);
}

export function renderScene(render) {
  renderers.add(render);
  redraw();
}

export function pauseMotion(value) {
  paused = value;
  previous = 0;
  document.documentElement.classList.toggle("motion-paused", paused);
  document.dispatchEvent(new Event("classic-motion-change"));
  redraw();
}

preference.addEventListener("change", () => pauseMotion(preference.matches));
document.addEventListener("visibilitychange", () => {
  cancelAnimationFrame(pending);
  pending = previous = 0;
  redraw();
});
window.addEventListener("resize", redraw);
pauseMotion(paused);
