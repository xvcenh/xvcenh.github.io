import { clamp, lerp, rgba, TAU } from './utils.js';

const materials = [
  { dark:'#062331', rock:'#164d56', rim:'#72cec3', light:'#acffe0', water:'#13768b', sun:.26, grain:1 },
  { dark:'#04132a', rock:'#142f4e', rim:'#518ab6', light:'#6fa9fc', water:'#153a6b', sun:.12, grain:2 },
  { dark:'#0a2945', rock:'#256187', rim:'#a2deff', light:'#bcecff', water:'#205e9b', sun:.29, grain:3 },
  { dark:'#231832', rock:'#543752', rim:'#f3a572', light:'#f6ab78', water:'#332652', sun:.12, grain:2 },
  { dark:'#071e29', rock:'#31564d', rim:'#91b997', light:'#d9e2a9', water:'#1a625d', sun:.20, grain:4 },
  { dark:'#080f28', rock:'#273357', rim:'#647fc5', light:'#a5e2ff', water:'#14244d', sun:.07, grain:3 },
];

const noise = (key) => ((Math.imul(key ^ 0x5c5fa34d, 0x45d9f3b) >>> 13) & 2047) / 2047;
const wrap = (x, length) => ((x % length) + length) % length;
const texturePatches = [
  [.043,.59,.12,.28], [.025,.49,.13,.32], [.025,.53,.115,.31],
  [.05,.46,.14,.34], [.025,.35,.113,.33], [.035,.48,.15,.31],
];
const shafts = new Map();

function shaftTexture(color) {
  if (shafts.has(color)) return shafts.get(color);
  const sprite=document.createElement('canvas');
  sprite.width=96;
  sprite.height=160;
  const paint=sprite.getContext('2d');
  for(let y=0;y<160;y+=2){
    const t=y/160, wide=9+t*37;
    const beam=paint.createLinearGradient(48-wide,0,48+wide,0);
    const alpha=(1-t)*(1-t*.6);
    beam.addColorStop(0,rgba(color,0));
    beam.addColorStop(.26,rgba(color,alpha*.44));
    beam.addColorStop(.52,rgba(color,alpha));
    beam.addColorStop(.74,rgba(color,alpha*.55));
    beam.addColorStop(1,rgba(color,0));
    paint.fillStyle=beam;
    paint.fillRect(48-wide,y,wide*2,2);
  }
  shafts.set(color,sprite);
  return sprite;
}

export function paintWaterVolume(ctx,w,h,cam,sea,time,depth,lightweight) {
  const mat=materials[sea];
  const attenuate=1-depth*.62;
  const haze=ctx.createLinearGradient(0,0,0,h);
  haze.addColorStop(0,rgba(mat.water,.02));
  haze.addColorStop(.51,rgba(mat.water,.07));
  haze.addColorStop(1,rgba(mat.dark,.24+depth*.15));
  ctx.fillStyle=haze;
  ctx.fillRect(0,0,w,h);

  ctx.save();
  ctx.globalCompositeOperation='screen';
  const source=(sea===2?.67:sea===4?.29:.46)*w-(cam.x-1800)*.038;
  const sink=(sea===2?-.18:.31)*w;
  const beamSprite=shaftTexture(mat.light);
  for (let i=0;i<(lightweight?3:6);i++){
    const flex=Math.sin(time*.31+i*1.63+cam.y*.0007);
    const x=source+(i-2)*w*.092+flex*w*.031;
    const width=w*(.115+noise(i+sea*8)*.13);
    ctx.save();
    ctx.transform(1,0,(sink+flex*w*.088)/h,1,x,0);
    ctx.globalAlpha=mat.sun*attenuate*(.84+flex*.16);
    ctx.drawImage(beamSprite,-width/2,-h*.04,width,h*1.1);
    ctx.restore();
  }
  ctx.restore();

  // The shadows are a separate plane, between the panorama and the playable shoals.
  const screenWidth=w*1.55;
  ctx.save();
  ctx.fillStyle=mat.dark;
  ctx.globalAlpha=.15+depth*.07;
  for(let school=0;school<2;school++){
    const direction=school===0?1:-1;
    const bx=wrap(time*(12+school*6)*direction-cam.x*.18+school*w*.83,screenWidth)-w*.26;
    const by=wrap(170+school*246-cam.y*.21,h+220)-70;
    for(let i=0;i<(lightweight?10:17);i++){
      const n=noise(i+school*23+sea*19);
      const x=bx+direction*(i%6)*19 + Math.cos(time*.8+i)*3;
      const y=by+Math.floor(i/6)*12+n*23+Math.sin(time*1.1+i)*3;
      const size=2.7+n*4.5;
      ctx.beginPath();
      ctx.ellipse(x,y,size,size*.31,direction*.12,0,TAU);
      ctx.moveTo(x-direction*size*.56,y);
      ctx.lineTo(x-direction*size*1.44,y-size*.43);
      ctx.lineTo(x-direction*size*1.38,y+size*.4);
      ctx.closePath();
      ctx.fill();
    }
  }
  ctx.restore();
}

function edgeDistance(side,y,w,cam,sea) {
  const travel=(cam.y*.77+y)*.0048;
  const across=(cam.x-1800)/1800;
  const profile=.075+Math.sin(travel+side*2.4+sea)*.056+Math.sin(travel*1.77+side*.5)*.038;
  const opening=Math.sin((cam.y*.81+y)*.0017+side*1.33+sea);
  return Math.min(w*.24,Math.max(-w*.075,w*(profile+side*across*.12+opening*.041)));
}

function facet(ctx,points,color) {
  ctx.fillStyle=color;
  ctx.beginPath();
  ctx.moveTo(points[0][0],points[0][1]);
  for (let i=1;i<points.length;i++) ctx.lineTo(points[i][0],points[i][1]);
  ctx.closePath();
  ctx.fill();
}

function paintVoxelLedge(ctx,side,x,y,size,mat,lit,count) {
  ctx.save();
  ctx.translate(x,y);
  ctx.scale(-side,1);
  for(let i=count-1;i>=0;i--){
    const step=size*(1-i*.16);
    const dx=-i*size*.63, dy=i*size*.51;
    const slope=step*.31, width=step*.86;
    const bottom=dy+step*.92;
    facet(ctx,[[dx,dy],[dx+width,dy],[dx+width,bottom],[dx,bottom]],mat.rock);
    facet(ctx,[[dx,dy],[dx+slope,dy-slope],[dx+width+slope,dy-slope],[dx+width,dy]],rgba(mat.rim,lit?.68:.35));
    facet(ctx,[[dx+width,dy],[dx+width+slope,dy-slope],[dx+width+slope,bottom-slope],[dx+width,bottom]],mat.dark);
    ctx.strokeStyle=rgba(mat.rim,lit?.44:.19);
    ctx.lineWidth=1;
    ctx.beginPath();
    ctx.moveTo(dx+slope,dy-slope);
    ctx.lineTo(dx+width+slope,dy-slope);
    ctx.lineTo(dx+width+slope,bottom-slope);
    ctx.stroke();
  }
  ctx.restore();
}

function paintNearWall(ctx,w,h,cam,sea,time,depth,beam,divers,side,lightweight,image) {
  const mat=materials[sea];
  const segment=sea===4?108:94;
  const offset=wrap(cam.y*1.13,segment);
  const row=Math.floor(cam.y*1.13/segment);
  const points=[];
  for(let i=-2;i<=Math.ceil(h/segment)+2;i++){
    const n=noise(row+i+side*277+sea*57);
    const y=i*segment-offset+n*31;
    const indent=edgeDistance(side,y,w,cam,sea)+(n-.5)*w*.07;
    points.push({y,x:side<0?indent:w-indent,n,id:row+i});
  }
  const edge=side<0?0:w;
  ctx.save();
  const closest=divers.reduce((min,x)=>Math.min(min,Math.abs(x-edge)),w);
  ctx.globalAlpha=lerp(.21,.92,clamp((closest-w*.10)/(w*.16),0,1));
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(edge+side*w*.15,-180);
  for(const point of points) ctx.lineTo(point.x,point.y);
  ctx.lineTo(edge+side*w*.15,h+180);
  ctx.closePath();
  ctx.clip();
  const falloff=ctx.createLinearGradient(edge,0,edge-side*w*.27,0);
  falloff.addColorStop(0,mat.dark);
  falloff.addColorStop(1,mat.rock);
  ctx.fillStyle=falloff;
  ctx.fillRect(0,0,w,h);
  if (image?.naturalWidth){
    // Reuse stone and ice brushwork from the existing biome paintings as a material.
    const [u,v,uw,vh]=texturePatches[sea];
    const width=w*.25;
    const stride=Math.max(170,h*.51);
    const scroll=wrap(cam.y*.93,stride);
    ctx.save();
    ctx.globalAlpha*=.32;
    const row=Math.floor(cam.y*.93/stride);
    for(let i=-1,y=-scroll-stride;y<h;y+=stride,i++){
      const flipped=(row+i)%2!==0;
      ctx.save();
      ctx.translate(0,y+(flipped?stride:0));
      if (flipped) ctx.scale(1,-1);
      ctx.drawImage(image,u*image.naturalWidth,v*image.naturalHeight,uw*image.naturalWidth,vh*image.naturalHeight,
        side<0?0:w-width,0,width,stride+1);
      ctx.restore();
    }
    ctx.restore();
  }
  for(let i=1;i<points.length;i++){
    const a=points[i-1],b=points[i];
    const step=Math.abs(b.y-a.y);
    const dx=beam ? a.x-beam.x : 0,dy=beam ? a.y-beam.y : 0;
    const distance=Math.hypot(dx,dy);
    const facing=beam ? dx*Math.cos(beam.ang)+dy*Math.sin(beam.ang) : 0;
    const edgeGlow=beam && distance<beam.radius*(1+beam.effort*.45) && facing>distance*.74;
    const middle=lerp(a.x,b.x,.62)+side*(18+a.n*34);
    ctx.fillStyle=rgba(mat.rim,(edgeGlow?.23:.03)+a.n*.085);
    ctx.beginPath();
    ctx.moveTo(a.x,a.y);
    ctx.lineTo(b.x,b.y);
    ctx.lineTo(middle,b.y-step*.18);
    ctx.lineTo(lerp(a.x,edge,.74),a.y+step*.22);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle=rgba(mat.rim,edgeGlow?.66:.15+a.n*.12);
    ctx.lineWidth=sea===2?1.6:1;
    ctx.beginPath();
    ctx.moveTo(a.x,a.y);
    ctx.lineTo(b.x,b.y);
    ctx.stroke();
    if (lightweight) continue;
    for(let j=0;j<mat.grain;j++){
      const n=noise(a.id*7+j*51+side*61);
      const x=lerp(lerp(a.x,b.x,n),edge,.28+n*.46);
      const y=lerp(a.y,b.y,n);
      const length=8+n*24;
      ctx.strokeStyle=rgba(mat.rim,.08+n*.12);
      ctx.beginPath();
      ctx.moveTo(x,y);
      ctx.lineTo(x-side*length*.32,y+length*.6);
      ctx.lineTo(x-side*length*.44,y+length);
      ctx.stroke();
    }
  }
  paintCaustics(ctx,w,h,cam,sea,time,depth,lightweight,side);
  ctx.restore();

  const blockSea=sea===2 || sea===3 || sea===4;
  for (const a of points) {
    if (a.y< -45 || a.y>h+45 || (side<0 ? a.x<3 : a.x>w-3)) continue;
    if (a.n>(blockSea?.50:.89)) {
      const dot=beam ? (a.x-beam.x)*Math.cos(beam.ang)+(a.y-beam.y)*Math.sin(beam.ang) : -1;
      const lit=beam && dot>0 && Math.hypot(a.x-beam.x,a.y-beam.y)<beam.radius;
      const size=Math.min(w*(blockSea?.048:.031),18+a.n*16);
      paintVoxelLedge(ctx,side,a.x+side*size*.4,a.y,size,mat,lit,lightweight?2:3);
    }
    // Rooted fronds bend under passing water while their attachment follows the rock.
    if (sea===2 || sea===3) continue;
    if (a.n<.65 || a.y<25 || a.y>h+40 || (side<0 ? a.x<4 : a.x>w-4)) continue;
    const reach=(16+a.n*34)*Math.min(1,w/590);
    const wash=beam ? beam.effort*clamp(1-Math.hypot(a.x-beam.x,a.y-beam.y)/(beam.radius*1.2),0,1) : 0;
    const tilt=Math.sin(time*1.3+a.id*1.8)*reach*.27 + side*wash*reach*.68;
    const tip=a.x-side*reach*.59;
    ctx.beginPath();
    ctx.moveTo(a.x+side*3,a.y+9);
    ctx.bezierCurveTo(a.x-side*reach*.57,a.y-5,tip+tilt,a.y-reach*.7,tip+tilt,a.y-reach);
    ctx.bezierCurveTo(tip+tilt-side*reach*.24,a.y-reach*.53,a.x-side*reach*.23,a.y-2,a.x+side*3,a.y+9);
    ctx.fillStyle=rgba(mat.dark,.89);
    ctx.fill();
    ctx.strokeStyle=rgba(mat.rim,.24);
    ctx.stroke();
  }
  ctx.restore();
}

// Thin light folds crawl across the near rocks. This pass is limited to the scenery.
function paintCaustics(ctx,w,h,cam,sea,time,depth,lightweight,side) {
  const mat=materials[sea];
  const size=70;
  const x0=wrap(cam.x*.42,size);
  const y0=wrap(cam.y*.54,size);
  const brightness=mat.sun*(1-depth*.68)*(sea===5?.42:1);
  ctx.save();
  ctx.globalCompositeOperation='screen';
  ctx.lineWidth=1;
    const left=side<0?0:w*.78;
    const light=ctx.createLinearGradient(left,0,left+w*.22,0);
    light.addColorStop(side<0?0:1,rgba(mat.light,brightness*.68));
    light.addColorStop(side<0?1:0,rgba(mat.light,0));
    ctx.strokeStyle=light;
    ctx.save();
    ctx.beginPath();ctx.rect(left,h*.18,w*.22,h*.82);ctx.clip();
    for(let j=0;j<h/size+2;j++){
      const y=j*size-y0;
      ctx.beginPath();
      for(let i=-1;i<=w*.22/size+1;i++){
        const x=left+i*size-x0;
        const sy=y+Math.sin(x*.023+time*1.51+y*.021)*15;
        if(i===-1)ctx.moveTo(x,sy);
        else ctx.quadraticCurveTo(x-size*.67,sy+Math.sin(y*.031+time*2+i)*26,x,sy);
        if(!lightweight){
          ctx.moveTo(x,sy);
          ctx.quadraticCurveTo(x+size*.46,sy+size*.35,x+size*.18,sy+size*.76);
          ctx.moveTo(x,sy);
        }
      }
      ctx.stroke();
    }
    ctx.restore();
  ctx.restore();
}

export function paintNearWater(ctx,w,h,cam,sea,time,depth,beam,divers,lightweight,image) {
  paintNearWall(ctx,w,h,cam,sea,time,depth,beam,divers,-1,lightweight,image);
  paintNearWall(ctx,w,h,cam,sea,time,depth,beam,divers,1,lightweight,image);

  // Near-camera marine snow has the fastest scroll and soft luminous falloff.
  const mat=materials[sea];
  ctx.save();
  ctx.globalCompositeOperation='screen';
  for(let i=0;i<(lightweight?7:16);i++){
    const n=noise(i+94),r=1+n*3.7;
    const x=wrap(n*(w+100)-cam.x*(1.13+n*.18)+time*(12+n*13),w+100)-50;
    const y=wrap(noise(i*11+72)*(h+100)-cam.y*(1.15+n*.27)+time*(9+n*19),h+100)-50;
    const glow=ctx.createRadialGradient(x,y,0,x,y,r*2.5);
    glow.addColorStop(0,rgba(mat.light,.28+n*.19));
    glow.addColorStop(1,rgba(mat.light,0));
    ctx.fillStyle=glow;
    ctx.fillRect(x-r*2.5,y-r*2.5,r*5,r*5);
  }
  ctx.restore();
}

export function paintDiveLight(ctx,sea,time,light) {
  const mat=materials[sea];
  const {x,y,ang,radius,effort}=light;
  const distance=radius*(.95+effort*.55);
  ctx.save();
  ctx.translate(x,y);
  ctx.rotate(ang);
  ctx.globalCompositeOperation='screen';
  const glow=ctx.createRadialGradient(0,0,0,0,0,radius*.64);
  glow.addColorStop(0,rgba(mat.light,sea>=4?.25:.11));
  glow.addColorStop(1,rgba(mat.light,0));
  ctx.fillStyle=glow;
  ctx.fillRect(-radius,-radius,radius*2,radius*2);
  const shaft=ctx.createLinearGradient(0,0,distance,0);
  shaft.addColorStop(0,rgba(mat.light,0));
  shaft.addColorStop(.23,rgba(mat.light,(sea>=4?.145:.075)+effort*.052));
  shaft.addColorStop(1,rgba(mat.light,0));
  const spread=distance*(.26+Math.sin(time*1.4)*.012);
  ctx.fillStyle=shaft;
  ctx.beginPath();
  ctx.moveTo(0,-3);
  ctx.quadraticCurveTo(distance*.58,-spread,distance,-spread*.69);
  ctx.quadraticCurveTo(distance*1.07,0,distance,spread*.69);
  ctx.quadraticCurveTo(distance*.6,spread,0,3);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}
