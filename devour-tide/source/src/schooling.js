import {clamp} from './utils.js';

const radius=85;
// The diving world is 3600 px wide. A signed cell key also covers fish crossing its margins.
const key=(x,y)=>x+y*1024;

export function indexSchools(enemies){
  const groups=new Map();
  for (const fish of enemies) {
    if (!fish.schoolId || fish.stunT>0) continue;
    let group=groups.get(fish.schoolId);
    if (!group) {group=new Map();groups.set(fish.schoolId,group);}
    const cell=key(Math.floor(fish.x/radius),Math.floor(fish.y/radius));
    let members=group.get(cell);
    if (!members) {members=[];group.set(cell,members);}
    // Read the previous tick for every neighbour, including those already advanced by this pass.
    members.push({fish,x:fish.x,y:fish.y,vx:fish.vx,vy:fish.vy,size:fish.size});
  }
  return groups;
}

export function schoolVelocity(fish,school,index){
  const tx=school.x+fish.slotX+Math.cos(school.age*2+fish.phase)*5;
  const ty=school.y+fish.slotY+Math.sin(school.age*1.6+fish.phase)*7;
  const group=index.get(school.id);
  const col=Math.floor(fish.x/radius),row=Math.floor(fish.y/radius);
  let separateX=0,separateY=0,velocityX=0,velocityY=0,centerX=0,centerY=0,count=0;
  for(let cy=row-1;cy<=row+1;cy++) for(let cx=col-1;cx<=col+1;cx++){
    const members=group?.get(key(cx,cy));
    if(!members) continue;
    for(const neighbour of members){
      if(neighbour.fish===fish) continue;
      const dx=fish.x-neighbour.x,dy=fish.y-neighbour.y,d2=dx*dx+dy*dy;
      if(d2>radius*radius || d2<.01) continue;
      count++;velocityX+=neighbour.vx;velocityY+=neighbour.vy;centerX-=dx;centerY-=dy;
      const spacing=Math.max(18,fish.size+neighbour.size);
      if(d2<spacing*spacing){
        const d=Math.sqrt(d2),pull=(spacing-d)*3.2/d;
        separateX+=dx*pull;separateY+=dy*pull;
      }
    }
  }
  let vx=school.heading*36+(tx-fish.x)*1.35+separateX;
  let vy=(ty-fish.y)*1.35+separateY;
  if(count){
    vx+=(velocityX/count-fish.vx)*.26+centerX/count*.22;
    vy+=(velocityY/count-fish.vy)*.26+centerY/count*.22;
  }
  return {x:clamp(vx,-155,155),y:clamp(vy,-120,120)};
}
