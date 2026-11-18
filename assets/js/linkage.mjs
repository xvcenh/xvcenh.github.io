import {forward,inverse,lengths} from "./kinematics.mjs";
const find = id => document.getElementById(id);
const inputs = ["hip1","hip2","inv-hip","knee"].map(find);
let pose = forward(60,120);
let previousHip = 60;
let previousTip = pose.C;

function draw(canvas, serial) {
  const ctx = canvas.getContext("2d");
  const width = canvas.clientWidth, height = canvas.clientHeight;
  const ratio = Math.min(devicePixelRatio || 1, 2);
  canvas.width = Math.round(width*ratio); canvas.height = Math.round(height*ratio);
  ctx.setTransform(ratio,0,0,ratio,0,0);
  const scale = Math.min(width/610,height/540);
  const px = p => width*.5 + (p.x-40)*scale;
  const py = p => height*.48 + p.y*scale;
  const grid = 50*scale;
  ctx.strokeStyle = "#cfd5c7"; ctx.lineWidth = 1;
  ctx.beginPath();
  for (let x = px({x:0})%grid; x < width; x+=grid) { ctx.moveTo(x,0);ctx.lineTo(x,height); }
  for (let y = py({y:0})%grid; y < height; y+=grid) { ctx.moveTo(0,y);ctx.lineTo(width,y); }
  ctx.stroke();
  function segment(a,b,color) {
    if (!a || !b) return;
    ctx.strokeStyle = color; ctx.lineWidth = 5; ctx.lineCap = "round";
    ctx.beginPath(); ctx.moveTo(px(a),py(a)); ctx.lineTo(px(b),py(b)); ctx.stroke();
  }
  const {A,B,C,D,E} = pose;
  if (!serial) { segment(A,E,"#7c8777"); segment(A,B,"#47728a"); segment(B,C,"#47728a"); }
  segment(E,D,"#ad713c"); segment(D,C,"#828e43");
  if (C) {
    ctx.strokeStyle = pose.valid ? "#76976e" : "#bc704f";
    ctx.lineWidth = 1.5;
    ctx.setLineDash([4,4]);ctx.beginPath();ctx.arc(px(C),py(C),lengths.wheel*scale,0,Math.PI*2);ctx.stroke();ctx.setLineDash([]);
  }
  for (const name of serial ? ["E","D","C"] : ["A","B","C","D","E"]) {
    const point = pose[name];
    if (!point) continue;
    const x = px(point),y = py(point);
    ctx.fillStyle = "#f8faea";ctx.strokeStyle = "#284337";ctx.lineWidth = 2;
    ctx.beginPath();ctx.arc(x,y,4,0,Math.PI*2);ctx.fill();ctx.stroke();
    ctx.fillStyle = "#203d30";ctx.font = "bold 13px monospace";ctx.fillText(name,x+(name==="B"?-15:7),y-6);
  }
}

function render() {
  if (pose.valid) { previousHip = pose.hip1; previousTip = pose.C; }
  const values = [pose.hip1,pose.hip2,pose.hip2,pose.knee];
  inputs.forEach((input,i) => {
    const value = values[i];
    if (value !== null) input.value = value;
    const text = value === null ? "无解" : value.toFixed(1)+"°";
    input.parentElement.querySelector("output").value = text;
    input.setAttribute("aria-valuetext",text);
  });
  const status = find("solver-status");
  status.value = pose.valid ? "闭环可解" : "无法闭合 · 请调整输入";
  status.dataset.valid = pose.valid;
  find("endpoint").textContent = pose.C ? (pose.valid ? "末端 C" : "目标 C") + " (" + pose.C.x.toFixed(1) + ", " + pose.C.y.toFixed(1) + ") mm" : "末端 C 未确定";
  draw(find("closed-plot"),false); draw(find("serial-plot"),true);
}
for (const [i,input] of inputs.entries()) input.addEventListener("input", () => {
  pose = i<2 ? forward(+inputs[0].value,+inputs[1].value,previousTip) : inverse(+inputs[2].value,+inputs[3].value,previousHip);
  render();
});
find("reset-solver").addEventListener("click", () => { pose = forward(60,120); render(); });
new ResizeObserver(render).observe(find("closed-plot").parentElement);
render();
