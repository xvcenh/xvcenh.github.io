import { clamp } from './utils.js';

const sharkAttack = {range:235, tell:.68, burst:.48, recovery:1.15, power:2.85, lead:.32, flank:.54};
const swordAttack = {range:310, tell:.44, burst:.34, recovery:1.25, power:3.15, lead:.48, flank:.22};
const reefAttack = {range:155, tell:.48, burst:.34, recovery:.92, power:1.95, lead:.20, flank:.75};

// A telegraphed strike stays on one line through the lunge and recovery.
export function huntShark(shark,prey,dt,attack=sharkAttack){
  const dx=prey.x-shark.x,dy=prey.y-shark.y,distance=Math.hypot(dx,dy)||1;
  const hunt=shark.hunt ||= {phase:'stalk',time:.85,ux:dx/distance,uy:dy/distance};
  hunt.time-=dt;
  if(hunt.phase==='stalk'){
    if(hunt.time<=0 && distance<attack.range+shark.size*.4 && distance>shark.size*.75){
      const lead=Math.min(attack.lead,distance/390),px=dx+(prey.vx || 0)*lead,py=dy+(prey.vy || 0)*lead;
      const reach=Math.hypot(px,py)||1;
      hunt.ux=px/reach;hunt.uy=py/reach;hunt.phase='tell';hunt.time=attack.tell;hunt.duration=attack.tell;
    }else{
      const lead=Math.min(attack.lead,distance/390);
      const side=Math.sin(shark.phase || 0)>=0 ? 1 : -1;
      const offset=Math.min(distance*.48,100)*attack.flank*side;
      const px=dx+(prey.vx || 0)*lead-dy/distance*offset;
      const py=dy+(prey.vy || 0)*lead+dx/distance*offset;
      const length=Math.hypot(px,py)||1;
      const pace=distance<shark.size*.75 ? -.34 : .86;
      return {x:px/length*shark.speed*pace,y:py/length*shark.speed*pace,response:2.6};
    }
  }
  if(hunt.phase==='tell' && hunt.time<=0){hunt.phase='lunge';hunt.time=attack.burst;}
  else if(hunt.phase==='lunge' && hunt.time<=0){hunt.phase='recover';hunt.time=attack.recovery;}
  else if(hunt.phase==='recover' && hunt.time<=0){hunt.phase='stalk';hunt.time=1.35;}
  const multiplier=hunt.phase==='tell' ? -.12 : hunt.phase==='lunge' ? attack.power : .33;
  return {x:hunt.ux*shark.speed*multiplier,y:hunt.uy*shark.speed*multiplier,
    response:hunt.phase==='lunge'?16:5};
}

function canSense(fish, prey, distance, inks) {
  const dx=prey.x-fish.x, dy=prey.y-fish.y;
  const hidden=prey.stealthOn || prey.schoolCoverT>0;
  const close=fish.size*.55+prey.size*.65+14;
  if (hidden && distance>close) return false;
  const sight=clamp(280+fish.size*1.1,300,610);
  const ahead=Math.cos(fish.ang)*dx+Math.sin(fish.ang)*dy;
  const noisy=prey.dashT>0 && distance<sight*1.3;
  if (distance>close && !noisy && (distance>sight || ahead<-.28*distance)) return false;
  return !inks.some(ink => {
    const t=clamp(((ink.x-fish.x)*dx+(ink.y-fish.y)*dy)/(distance*distance || 1),0,1);
    return Math.hypot(ink.x-fish.x-t*dx,ink.y-fish.y-t*dy)<ink.r;
  });
}

export function steerPredator(fish,players,inks,dt) {
  const attack=fish.sid==='shark' ? sharkAttack : fish.sid==='sword' ? swordAttack : reefAttack;
  const sense=fish.sense ||= {time:0, stamina:4.6, rest:0};
  if (fish.hunt && fish.hunt.phase!=='stalk') {
    // Recovery is deliberately target independent, including a target that slips into cover.
    return huntShark(fish,{x:sense.x ?? fish.x,y:sense.y ?? fish.y,vx:0,vy:0},dt,attack);
  }
  if (sense.rest>0) {
    sense.rest-=dt;
    return null;
  }
  let target=null, nearest=Infinity;
  for (const prey of players) {
    if (prey.fearT>0 || prey.size*1.08>=fish.size || fish.size>prey.size*3.1) continue;
    const distance=Math.hypot(prey.x-fish.x,prey.y-fish.y);
    if (distance<nearest && canSense(fish,prey,distance,inks)) {
      target=prey; nearest=distance;
    }
  }
  if (target && sense.stamina>0) {
    sense.x=target.x; sense.y=target.y; sense.time=1.2; sense.stamina-=dt;
    return huntShark(fish,target,dt,attack);
  }
  fish.hunt=null;
  const dx=sense.x-fish.x,dy=sense.y-fish.y, distance=Math.hypot(dx,dy);
  if (sense.stamina>0 && sense.time>0 && distance>22) {
    sense.time-=dt;
    return {x:dx/distance*fish.speed*.58,y:dy/distance*fish.speed*.58,response:2.5};
  }
  if (sense.time>0 || sense.stamina<=0) {
    sense.time=0; sense.stamina=4.6; sense.rest=1.5;
  }
  return null;
}

export function drawHuntTell(ctx,shark){
  const h=shark.hunt;
  if(!h || h.phase!=='tell' || shark.stunT>0) return;
  drawAttackTell(ctx,shark,h.ux,h.uy,1-h.time/(h.duration || .68),Math.max(74,shark.speed*1.30));
}

export function drawAttackTell(ctx,fish,ux,uy,progress,reach){
  const t=clamp(progress,0,1);
  ctx.save();ctx.translate(fish.x,fish.y);ctx.rotate(Math.atan2(uy,ux));
  const x=fish.size*.65;
  const beam=ctx.createLinearGradient(x,0,x+reach,0);
  beam.addColorStop(0,'#ffbb7926');beam.addColorStop(1,'#f16e3010');
  ctx.fillStyle=beam;ctx.beginPath();ctx.moveTo(x,-3);ctx.lineTo(x+reach,-13);
  ctx.lineTo(x+reach,13);ctx.lineTo(x,3);ctx.closePath();ctx.fill();
  ctx.strokeStyle=t>.7?'#ffe5b2':'#ffb780';ctx.lineWidth=2;
  ctx.setLineDash([7,5]);ctx.lineDashOffset=-t*12;
  ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x+reach,0);ctx.stroke();ctx.setLineDash([]);
  for(let i=0;i<2;i++){const at=x+reach*(.48+i*.29);ctx.beginPath();ctx.moveTo(at-5,-5);ctx.lineTo(at+1,0);ctx.lineTo(at-5,5);ctx.stroke();}
  ctx.restore();
}
