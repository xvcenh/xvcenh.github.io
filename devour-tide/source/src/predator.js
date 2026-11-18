// A shark commits to one line of attack. Crossing that line after the tell opens its flank.
export function huntShark(shark,prey,dt){
  const dx=prey.x-shark.x,dy=prey.y-shark.y,distance=Math.hypot(dx,dy)||1;
  const hunt=shark.hunt ||= {phase:'stalk',time:.85,ux:dx/distance,uy:dy/distance};
  hunt.time-=dt;
  if(hunt.phase==='stalk'){
    if(hunt.time<=0 && distance<235 && distance>shark.size*.9){
      const lead=Math.min(.32,distance/550),px=dx+prey.vx*lead,py=dy+prey.vy*lead;
      const reach=Math.hypot(px,py)||1;
      hunt.ux=px/reach;hunt.uy=py/reach;hunt.phase='tell';hunt.time=.68;
    }else{
      return {x:dx/distance*shark.speed*.84,y:dy/distance*shark.speed*.84,response:2.2};
    }
  }
  if(hunt.phase==='tell' && hunt.time<=0){hunt.phase='lunge';hunt.time=.48;}
  else if(hunt.phase==='lunge' && hunt.time<=0){hunt.phase='recover';hunt.time=1.15;}
  else if(hunt.phase==='recover' && hunt.time<=0){hunt.phase='stalk';hunt.time=1.35;}
  const multiplier=hunt.phase==='tell' ? -.12 : hunt.phase==='lunge' ? 2.85 : .33;
  return {x:hunt.ux*shark.speed*multiplier,y:hunt.uy*shark.speed*multiplier,
    response:hunt.phase==='lunge'?16:5};
}

export function drawHuntTell(ctx,shark){
  const h=shark.hunt;
  if(!h || h.phase!=='tell' || shark.stunT>0) return;
  const t=Math.max(0,1-h.time/.68), reach=Math.max(74,shark.speed*1.12);
  ctx.save();ctx.translate(shark.x,shark.y);ctx.rotate(Math.atan2(h.uy,h.ux));
  const x=shark.size*.65;
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
