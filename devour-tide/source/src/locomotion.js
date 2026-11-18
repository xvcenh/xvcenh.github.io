import {flexSpine} from './swim-spine.js';
// Cycles per second, turn response and tail excursion for each swimming gait.
const cruise = { rest:.52, beat:1.9, response:7.5, flex:.10 };
const fast = { rest:.58, beat:2.6, response:9, flex:.075 };
const hover = { rest:1.0, beat:2.7, response:6.7, flex:.035 };
const ribbon = { rest:.48, beat:1.6, response:7.1, flex:.18 };
const wing = { rest:.34, beat:1.05, response:6.4, flex:.055 };
const paddle = { rest:.75, beat:2.0, response:7, flex:.065 };
const gait = { sword:fast, sardine:fast, anchovy:fast, needle:fast, eel:ribbon,
  boss_eel:ribbon, seahorse:hover, ray:wing, boss_ray:wing, puffer:paddle,
  jelly:hover, boss_jelly:hover, whale:wing, boss_whale:wing };
const tau = Math.PI * 2;
const bound = (x,min,max) => Math.max(min,Math.min(max,x));
export function swimResponse(id) { return (gait[id] || cruise).response; }

export function sampleWake(fish,dt) {
  const m=fish.swim;
  m.trail ||= [];
  m.sample=(m.sample || 0)+dt;
  if (m.sample<.043) return;
  m.sample%=.043;
  const a=fish.ang, r=fish.size, wave=Math.sin(m.phase)*r*(.05+m.effort*.08);
  m.trail.unshift({x:fish.x-Math.cos(a)*r-Math.sin(a)*wave,
    y:fish.y-Math.sin(a)*r+Math.cos(a)*wave,a});
  if (m.trail.length>11) m.trail.pop();
}

export function stepSwim(fish,id,dt,referenceSpeed,thrust=false,detailed=true) {
  if (!(dt>0)) return;
  const profile = gait[id] || cruise;
  const m = fish.swim ||= { phase:(fish.phase || 0) % tau, facing:Math.cos(fish.ang)<0?-1:1,
    heading:fish.ang, bend:0, effort:0, pulse:0 };
  const speed = Math.hypot(fish.vx,fish.vy);
  const target = bound(speed / Math.max(36,referenceSpeed),0,1.45);
  const delta = Math.atan2(Math.sin(fish.ang-m.heading),Math.cos(fish.ang-m.heading));
  m.heading = fish.ang;
  m.effort += (target-m.effort) * (1-Math.exp(-dt*(target>m.effort?11:3.8)));
  m.pulse += ((thrust?1:0)-m.pulse) * (1-Math.exp(-dt*(thrust?24:5)));
  m.bend += (bound(delta/dt,-5,5)*profile.flex-m.bend) * (1-Math.exp(-dt*7.5));
  m.phase = (m.phase + dt*tau*(profile.rest+profile.beat*m.effort+1.3*m.pulse)) % tau;
  // Close to vertical, keep the last side until there is a clear horizontal heading.
  const horizontal = Math.cos(fish.ang);
  if (Math.abs(horizontal)>.22) m.side = Math.sign(horizontal);
  m.facing += ((m.side || Math.sign(m.facing) || 1)-m.facing) * (1-Math.exp(-dt*13));
  if (detailed) flexSpine(m,id,dt);
}
