import { paintAnimal } from './illustrations.js';
const TAU = Math.PI * 2;

function stamp(ctx, texture, name, x, y, width, height) {
  const frame = texture.get(name);
  ctx.drawImage(frame.source.image, frame.cutX, frame.cutY, frame.cutWidth, frame.cutHeight,
    x - width / 2, y - height / 2, width, height);
}

function circle(ctx, x, y, r, fill, stroke) {
  ctx.beginPath(); ctx.arc(x,y,r,0,TAU);
  if (fill) { ctx.fillStyle = fill; ctx.fill(); }
  if (stroke) { ctx.strokeStyle = stroke; ctx.stroke(); }
}

export function drawWake(ctx,p) {
  const motion=p.swim;
  if (!motion?.trail?.length || motion.effort<.12) return;
  const points=motion.trail, count=points.length;
  ctx.save();ctx.lineCap='round';
  for (const side of [-1,1]) {
    for (let i=1;i<count;i++) {
      const t=i/count, a=points[i-1], b=points[i];
      const off=side*p.size*(.16+t*.55);
      ctx.strokeStyle=side<0?'#dcfcf1':'#86e7ed';
      ctx.globalAlpha=(1-t)*Math.min(.75,motion.effort*.32+motion.pulse*.45);
      ctx.lineWidth=(1-t)*(1.4+motion.pulse*3)+.35;
      ctx.beginPath();ctx.moveTo(a.x-Math.sin(a.a)*off,a.y+Math.cos(a.a)*off);
      ctx.lineTo(b.x-Math.sin(b.a)*off,b.y+Math.cos(b.a)*off);ctx.stroke();
    }
  }
  ctx.restore();
}

export function drawSlipstreams(ctx,schools,view) {
  for(const s of schools) {
    if (!(s.wakeLeft>0) || s.y<view.y-75 || s.y>view.y+view.h+75) continue;
    ctx.save();ctx.translate(s.x-s.heading*(s.wakeOffset || 86),s.y);ctx.scale(s.heading,1);
    const glow=ctx.createLinearGradient(-60,0,52,0);
    glow.addColorStop(0,'#baffef00');glow.addColorStop(.55,'#7ff5dc70');glow.addColorStop(1,'#c6fff700');
    ctx.fillStyle=glow;ctx.beginPath();ctx.ellipse(0,0,58,26,0,0,TAU);ctx.fill();
    ctx.strokeStyle='#bef8de';ctx.lineWidth=1.8;
    for (let i=0;i<4;i++) {
      const x=(i*22+s.age*30)%88-48, dy=Math.sin(s.age*2+i)*4;
      ctx.beginPath();ctx.moveTo(x-5,dy-5);ctx.lineTo(x+3,dy);ctx.lineTo(x-5,dy+5);ctx.stroke();
    }
    if(s.follow>0) {
      ctx.lineWidth=3;ctx.strokeStyle='#ffdfa0';ctx.beginPath();
      ctx.ellipse(0,0,56,30,0,-Math.PI/2,-Math.PI/2+TAU*Math.min(1,s.follow/1.5));ctx.stroke();
    }
    ctx.restore();
  }
}

function drawNet(ctx, site, texture) {
  ctx.save();
  const bag = new Path2D('M-58 0Q0 16 58 0L40 56Q0 88 -40 56Z');
  ctx.fillStyle = '#153e4baa'; ctx.fill(bag); ctx.clip(bag);
  ctx.strokeStyle = '#8db5ad'; ctx.lineWidth = 1;
  ctx.beginPath();
  for (let i = -160; i < 160; i += 12) {
    ctx.moveTo(i,-5); ctx.lineTo(i+90,84);
    ctx.moveTo(i,-5); ctx.lineTo(i-90,84);
  }
  ctx.stroke();
  for (let i=0; i<3; i++) {
    const drift = Math.sin(site.phase * 2 + i);
    paintAnimal(ctx,texture,['anthias','anchovy','chromis'][i],-26+i*24+drift*5,25+(i%2)*16,0,9,site.phase+i);
  }
  ctx.restore();
  for (let i = 0; i < site.points.length; i++) {
    if (site.hits.includes(i)) continue;
    const x = site.points[i].x;
    ctx.lineWidth = 3; circle(ctx,x,0,11,'#273c46',site.color);
    ctx.lineWidth = 1; circle(ctx,x,0,15 + Math.sin(site.phase * 3) * 3,null,site.color);
    ctx.fillStyle = '#ffd39a';ctx.fillRect(x-4,-4,8,8);
  }
}

function drawRelay(ctx, site, art) {
  ctx.setLineDash([4,7]);ctx.lineWidth=1;ctx.strokeStyle='#c2fdef88';
  ctx.beginPath();
  for (const [i,p] of site.points.entries()) {
    if (i === 0) ctx.moveTo(p.x,p.y); else ctx.lineTo(p.x,p.y);
  }
  ctx.stroke();ctx.setLineDash([]);
  site.points.forEach((p,i) => {
    const active = i === site.cursor;
    if (art) stamp(ctx,art.props,'relay',p.x,p.y+23,22,31);
    ctx.lineWidth = active ? 3 : 1.5;
    circle(ctx,p.x,p.y,24,active ? '#255e6788' : '#163c4888',active ? '#ecffe9' : '#6aabb2');
    if (active) circle(ctx,p.x,p.y,29 + Math.sin(site.phase*4)*3,null,site.color);
    ctx.fillStyle = active ? '#fffade' : '#9dd0cf';ctx.fillText(i < site.cursor ? '✓' : String(i+1),p.x,p.y+5);
  });
}

function drawCache(ctx,site,art) {
  ctx.fillStyle='#193340';ctx.strokeStyle=site.color;ctx.lineWidth=2;
  ctx.beginPath();ctx.moveTo(-26,-18);ctx.lineTo(23,-18);ctx.lineTo(32,-8);
  ctx.lineTo(32,18);ctx.lineTo(-30,18);ctx.closePath();ctx.fill();ctx.stroke();
  ctx.fillStyle='#749ba4';ctx.fillRect(-19,-21,25,4);
  ctx.fillStyle='#151e32';ctx.fillRect(-21,-9,36,16);
  ctx.fillStyle='#b9ffe5';ctx.fillRect(-19,-6,Math.max(2,31*site.read/2.5),9);
  if (art) stamp(ctx,art.props,'cache',0,-3,74,53);
  const scan = Math.sin(site.phase*1.45)*92;
  const advance = Math.sin((site.phase+.45)*1.45)*92;
  ctx.fillStyle='#f4c46826';ctx.fillRect(Math.min(scan,advance),-44,Math.abs(advance-scan),88);
  ctx.strokeStyle='#ffdb96';ctx.lineWidth=1;ctx.setLineDash([3,5]);
  ctx.beginPath();ctx.moveTo(advance,-44);ctx.lineTo(advance,44);ctx.stroke();ctx.setLineDash([]);
  ctx.fillStyle='#ff998629';ctx.fillRect(scan-12,-46,24,90);
  ctx.fillStyle='#ffb5a6';ctx.fillRect(scan,-44,1.5,88);
  ctx.setLineDash([3,7]);circle(ctx,0,0,55,null,'#b9c6ff88');ctx.setLineDash([]);
}

export function drawDiveSite(ctx, site, texture, view) {
  if (!site || site.done || site.x < view.x - 180 || site.x > view.x + view.w + 180 ||
      site.y < view.y - 170 || site.y > view.y + view.h + 170) return;
  ctx.save(); ctx.translate(site.x,site.y);ctx.textAlign='center';ctx.font='bold 14px system-ui';
  ctx.scale(site.scale || 1, site.scale || 1);
  if (site.kind === 'net') drawNet(ctx,site,texture);
  else if (site.kind === 'relay') drawRelay(ctx,site,texture);
  else drawCache(ctx,site,texture);
  ctx.restore();
}

export function drawSiteLabel(ctx,site,x,y,w,h,zoom,tracked = false) {
  if (!site || site.done) return;
  const offscreen = x < 18 || x > w-18 || y < 110 || y > h-115;
  if (offscreen && !tracked && (x < -12 || x > w+12 || y < 40 || y > h+12)) return;
  ctx.save();ctx.textAlign='center';ctx.font='bold 14px system-ui';
  const arrow = y < 110 ? '↑' : y > h-115 ? '↓' : x < 18 ? '←' : '→';
  const hint = offscreen && tracked ? arrow + ' 前往目标'
    : site.kind === 'relay' && site.cursor ? '剩余 '+site.timer.toFixed(1)+' 秒' : site.hint;
  const width = Math.max(108,ctx.measureText(hint).width + 24);
  const labelY = y-(site.kind==='relay'?82:42)*zoom*(site.scale || 1);
  ctx.translate(Math.min(w-width/2-6,Math.max(width/2+6,x)),
    offscreen && tracked ? Math.min(Math.max(110,h-145),Math.max(110,labelY)) : Math.max(42,labelY));
  ctx.fillStyle='#071e2de8';ctx.fillRect(-width/2,-25,width,40);
  ctx.fillStyle=site.color;ctx.fillRect(-width/2,-25,3,40);ctx.fillText(site.name,0,-9);
  ctx.font='12px system-ui';ctx.fillStyle='#e2eff4';ctx.fillText(hint,0,7);
  ctx.restore();
}

export function drawTideEffects(ctx,events) {
  ctx.save();ctx.globalCompositeOperation='lighter';
  for (const effect of events) {
    const t = effect.age / effect.life;
    ctx.globalAlpha = (1-t)*0.75;
    const size = effect.radius * (0.45 + t);
    ctx.save();ctx.translate(effect.x,effect.y);ctx.rotate(effect.angle + t * 0.36);
    ctx.strokeStyle = effect.frame === 'reward' ? '#fff1a8' : '#c1f7ff';
    ctx.lineWidth = Math.max(1,3*(1-t));
    const count = effect.frame === 'impact' ? 5 : 9;
    for (let i=0;i<count;i++){
      ctx.rotate(TAU/count); ctx.beginPath();
      if (effect.frame === 'wake') ctx.arc(0,0,size*0.38,-0.18,0.13);
      else { ctx.moveTo(size*0.24,0);ctx.quadraticCurveTo(size*0.35,-2,size*0.47,0); }
      ctx.stroke();
    }
    ctx.restore();
  }
  ctx.restore();
}
