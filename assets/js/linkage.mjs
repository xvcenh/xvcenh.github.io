import { forward, inverse, lengths } from "./kinematics.mjs";

const get = id => document.getElementById(id);
const inputs = ["hip1", "hip2", "inv-hip", "knee"].map(get);
const plots = document.querySelector(".instrument-plots");
const settings = { stand: [60, 120], crouch: [135, 45], lean: [130, 110] };
const trail = [];
const maxSamples = 160;
let pose = forward(...settings.stand);
let previousHip = pose.hip1;
let previousTip = pose.C;
let breakTrail = true;

function recordPose() {
  if (!pose.valid || !get("trail-toggle").checked) {
    breakTrail = true;
    return;
  }
  const last = trail.at(-1);
  if (!breakTrail && last && Math.hypot(last.x - pose.C.x, last.y - pose.C.y) < .15) return;
  trail.push({x: pose.C.x, y: pose.C.y, start: breakTrail});
  if (trail.length > maxSamples) trail.shift();
  breakTrail = false;
}

function bounds() {
  const points = [pose.A, pose.B, pose.C, pose.D, pose.E].filter(Boolean);
  if (get("trail-toggle").checked) points.push(...trail);
  let left = -110, right = 190, top = -65, bottom = 285;
  points.forEach(point => {
    const pad = point === pose.C ? lengths.wheel + 16 : 18;
    left = Math.min(left, point.x - pad);
    right = Math.max(right, point.x + pad);
    top = Math.min(top, point.y - pad);
    bottom = Math.max(bottom, point.y + pad);
  });
  return { left: Math.floor(left / 25) * 25, right: Math.ceil(right / 25) * 25,
    top: Math.floor(top / 25) * 25, bottom: Math.ceil(bottom / 25) * 25 };
}

function draw(canvas, serial, area) {
  const width = canvas.clientWidth, height = canvas.clientHeight;
  if (!width || !height) return;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const bufferWidth = Math.round(width * dpr), bufferHeight = Math.round(height * dpr);
  if (canvas.width !== bufferWidth || canvas.height !== bufferHeight) {
    canvas.width = bufferWidth;
    canvas.height = bufferHeight;
  }
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, width, height);
  const scale = Math.min((width - 28) / (area.right - area.left), (height - 18) / (area.bottom - area.top));
  const ox = (width - (area.left + area.right) * scale) / 2;
  const oy = (height - (area.top + area.bottom) * scale) / 2;
  const x = n => ox + n * scale, y = n => oy + n * scale;
  const tick = 50 * scale;

  function line(x1, y1, x2, y2, color, weight = 1) {
    ctx.beginPath();
    ctx.moveTo(x1, y1); ctx.lineTo(x2, y2);
    ctx.strokeStyle = color; ctx.lineWidth = weight; ctx.stroke();
  }
  function circle(cx, cy, radius, stroke, fill, weight = 1) {
    ctx.beginPath(); ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    if (fill) {ctx.fillStyle = fill; ctx.fill();}
    if (stroke) {ctx.strokeStyle = stroke; ctx.lineWidth = weight; ctx.stroke();}
  }

  ctx.lineCap = "butt";
  for (let n = Math.ceil(-ox / tick); x(n * 50) <= width; n++) {
    line(x(n * 50), 0, x(n * 50), height, n === 0 ? "#597564" : "#385343");
  }
  for (let n = Math.ceil(-oy / tick); y(n * 50) <= height; n++) {
    line(0, y(n * 50), width, y(n * 50), n === 0 ? "#597564" : "#385343");
  }
  if (get("trail-toggle").checked && trail.length) {
    ctx.beginPath();
    trail.forEach((point, i) => {
      if (!i || point.start) ctx.moveTo(x(point.x), y(point.y));
      else ctx.lineTo(x(point.x), y(point.y));
    });
    ctx.lineWidth = 2; ctx.strokeStyle = "#e7a2cf"; ctx.stroke();
    for (const point of trail) {
      if (point.start) circle(x(point.x), y(point.y), 2, null, "#e7a2cf");
    }
  }
  const {A, B, C, D, E} = pose;
  if (C) {
    ctx.setLineDash([4, 4]);
    circle(x(C.x), y(C.y), lengths.wheel * scale, pose.valid ? "#a6c992" : "#ed9a76", "#8abb7511", 1.25);
    ctx.setLineDash([]);
  }

  function rod(a, b, color) {
    if (!a || !b) return;
    ctx.lineCap = "round";
    line(x(a.x), y(a.y), x(b.x), y(b.y), "#0f211c", 8);
    line(x(a.x), y(a.y), x(b.x), y(b.y), color, 4);
  }
  if (!serial) {
    rod(A, E, "#7f9785"); rod(A, B, "#81c3d4"); rod(B, C, "#81c3d4");
  }
  rod(E, D, "#ebb576"); rod(D, C, "#c6e794");
  const names = serial ? ["E", "D", "C"] : ["A", "B", "C", "D", "E"];
  for (const name of names) {
    const point = pose[name];
    if (!point) continue;
    const cx = x(point.x), cy = y(point.y);
    circle(cx, cy, name === "C" ? 5 : 4, "#d1e7ca", name === "C" ? "#d1f197" : "#20352a", 1.5);
    ctx.textAlign = name === "A" || name === "B" ? "right" : "left";
    ctx.font = "bold 12px monospace"; ctx.lineWidth = 3; ctx.strokeStyle = "#172c24";
    const tx = cx + (ctx.textAlign === "right" ? -7 : 7), ty = cy - 5;
    ctx.strokeText(name, tx, ty); ctx.fillStyle = "#f1f4d8"; ctx.fillText(name, tx, ty);
  }
  ctx.lineCap = "butt";
  const legendY = height - 12;
  ctx.fillStyle = "#b9cbbb"; ctx.font = "11px monospace"; ctx.textAlign = "left";
  ctx.fillText("50 mm", 10, legendY - 6);
  line(10, legendY, 10 + tick, legendY, "#b9cbbb");
  line(10, legendY - 3, 10, legendY + 1, "#b9cbbb");
  line(10 + tick, legendY - 3, 10 + tick, legendY + 1, "#b9cbbb");
  ctx.textAlign = "right"; ctx.fillText("X →  Y ↓", width - 10, legendY);
}

function redraw() {
  const area = bounds();
  draw(get("closed-plot"), false, area);
  draw(get("serial-plot"), true, area);
  get("clear-trail").disabled = trail.length === 0;
  get("trail-count").textContent = trail.length + " 点";
}

function render() {
  if (pose.valid) {previousHip = pose.hip1; previousTip = pose.C;}
  const values = [pose.hip1, pose.hip2, pose.hip2, pose.knee];
  inputs.forEach((input, i) => {
    const value = values[i];
    if (value !== null) input.value = value;
    const text = value === null ? "无解" : value.toFixed(1) + "°";
    input.parentElement.querySelector("output").value = text;
    input.setAttribute("aria-valuetext", text);
  });
  const status = get("solver-status");
  status.value = pose.valid ? "闭环可解" : "无法闭合 · 请调整输入";
  status.dataset.valid = String(pose.valid);
  get("endpoint").textContent = pose.C
    ? (pose.valid ? "末端 C" : "目标 C") + " (" + pose.C.x.toFixed(1) + ", " + pose.C.y.toFixed(1) + ") mm"
    : "末端 C 未确定";
  recordPose();
  redraw();
}

const presets = Array.from(document.querySelectorAll("[data-pose]"));
function activatePreset(name) {
  pose = forward(...settings[name]);
  breakTrail = true;
  presets.forEach(button => button.setAttribute("aria-pressed", String(button.dataset.pose === name)));
  render();
}
presets.forEach(button => button.addEventListener("click", () => activatePreset(button.dataset.pose)));
inputs.forEach((input, i) => input.addEventListener("input", () => {
  presets.forEach(button => button.setAttribute("aria-pressed", "false"));
  pose = i < 2 ? forward(+inputs[0].value, +inputs[1].value, previousTip)
    : inverse(+inputs[2].value, +inputs[3].value, previousHip);
  render();
}));
get("trail-toggle").addEventListener("change", () => {breakTrail = true; redraw();});
get("clear-trail").addEventListener("click", () => {trail.length = 0; breakTrail = true; redraw();});
get("reset-solver").addEventListener("click", () => {
  trail.length = 0;
  activatePreset("stand");
});
const viewButtons = Array.from(document.querySelectorAll("[data-view]"));
viewButtons.forEach(button => button.addEventListener("click", () => {
  plots.dataset.mobileView = button.dataset.view;
  viewButtons.forEach(item => item.setAttribute("aria-pressed", String(item === button)));
  redraw();
}));
new ResizeObserver(redraw).observe(plots);
render();
