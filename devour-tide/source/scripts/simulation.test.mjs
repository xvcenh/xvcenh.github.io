import assert from 'node:assert/strict';
import test from 'node:test';
import {beginDash,movePlayer} from '../src/player-motion.js';
import {indexSchools,schoolVelocity} from '../src/schooling.js';
import {huntShark,steerPredator} from '../src/predator.js';
import {createContactSystem} from '../src/contacts.js';
import {readCheckpoint,writeCheckpoint} from '../src/checkpoint.js';
import {followSlipstreams} from '../src/expedition.js';

function swimmer(id='blue'){
  return {id:0,fishId:id,x:1800,y:2500,vx:0,vy:0,ang:0,size:24,spdMul:1,
    dashCd:0,dashT:0,dashPow:1,dashCdMul:1,invuln:0,stunT:0,chompRecover:0};
}
const bounds={w:3600,h:31200};
test('spine remains anchored and stable across three update rates and eight animals',()=>{
  for(const species of ['blue','puffer','sword','lantern','sardine','eel','seahorse','ray']){
    const endpoints=[];
    for(const hz of [30,60,120]){
      const p=swimmer(species),dt=1/hz;
      let tipPeak=0;
      for(let frame=0;frame<hz*4;frame++){
        const t=frame*dt;
        movePlayer(p,t<1?1:t<2?0:-1,t>=1&&t<2?1:0,dt,bounds);
        const spine=p.swim.spine;
        assert.equal(spine.offsets[0],0);
        assert.ok(spine.offsets.every(x=>Number.isFinite(x)&&Math.abs(x)<.65));
        tipPeak=Math.max(tipPeak,Math.abs(spine.offsets[6]));
      }
      assert.ok(tipPeak>.01,species);endpoints.push(p);
    }
    assert.ok(Math.hypot(endpoints[0].x-endpoints[2].x,endpoints[0].y-endpoints[2].y)<5);
  }
});
test('a dash uses fresh input and preserves cooldown',()=>{
  const p=swimmer('sword');p.vx=220;
  assert.ok(beginDash(p,0,1));movePlayer(p,0,1,1/60,bounds);
  assert.ok(p.vy>700&&Math.abs(p.vx)<1);assert.equal(beginDash(p,1,0),false);
});
function schoolFish(id,x,y){
  return {schoolId:id,slotX:0,slotY:0,x,y,vx:32,vy:0,size:12,phase:.5,stunT:0};
}
test('local crowding pushes fish apart, frozen neighbours make iteration order immaterial',()=>{
  const s={id:1,x:100,y:100,age:0,heading:1},a=schoolFish(1,100,100),b=schoolFish(1,105,100);
  const snap=indexSchools([a,b,schoolFish(2,101,101)]);
  const first=schoolVelocity(a,s,snap);
  assert.ok(first.x<0);
  b.vx=-500;b.x=200;
  assert.deepEqual(schoolVelocity(a,s,snap),first);
  const far=schoolVelocity(a,s,indexSchools([a,b]));assert.ok(far.x>20);
});
test('predator telegraphs a committed line, lunges and leaves a recovery window',()=>{
  const shark={x:0,y:0,size:20,speed:100},prey={x:100,y:0,vx:0,vy:0};
  let frames=0;
  while(shark.hunt?.phase!=='tell' && frames++<120)huntShark(shark,prey,1/60);
  assert.equal(shark.hunt.phase,'tell');const aim=shark.hunt.uy;prey.y=150;
  for(let i=0;i<44;i++)huntShark(shark,prey,1/60);
  assert.equal(shark.hunt.phase,'lunge');assert.equal(shark.hunt.uy,aim);
  for(let i=0;i<30;i++)huntShark(shark,prey,1/60);
  assert.equal(shark.hunt.phase,'recover');
});
test('predators sense direction, lead moving prey and stop tracking behind ink',()=>{
  const fish={x:1800,y:2500,ang:0,sid:'sword',size:52,speed:115};
  const prey={x:1550,y:2500,vx:0,vy:130,size:27};
  assert.equal(steerPredator(fish,[prey],[],1/60),null);
  prey.dashT=.1;
  assert.ok(steerPredator(fish,[prey],[],1/60).x<0);
  assert.equal(fish.sense.x,1550);
  prey.dashT=0;
  prey.x=2070;
  prey.schoolCoverT=2;
  assert.ok(steerPredator(fish,[prey],[],1/60).x<0);
  assert.equal(fish.sense.x,1550);
  for(let i=0;i<260;i++) steerPredator(fish,[prey],[],1/60);
  assert.equal(fish.hunt,null);
  prey.schoolCoverT=0;
  assert.equal(steerPredator(fish,[prey],[{x:1930,y:2500,r:35}],1/60),null);
  const intercept=steerPredator(fish,[prey],[],1/60);
  assert.ok(intercept.x>0 && intercept.y>15);
  prey.size=100;
  for(let i=0;i<180;i++) steerPredator(fish,[prey],[],1/60);
  assert.equal(steerPredator(fish,[prey],[],1/60),null);
});
test('a split wake reaches a fish outside the normal dash width',()=>{
  const player=swimmer(), fish={x:player.x+5,y:player.y+75,size:14,vx:0,vy:0,stunT:0};
  Object.assign(player,{dashId:1,dashT:.15,dashFromX:player.x-12,dashFromY:player.y,dashAng:0});
  const game={players:[player],enemies:[fish],hazards:[],rings:[]};
  const collide=createContactSystem(game,{autoReach:()=>1});
  collide(1/60);
  assert.equal(fish.vy,0);
  player.wideWake=true;
  collide(1/60);
  assert.ok(fish.vy>50);
  assert.ok(fish.stunT>0 && game.rings.length===1);
});
test('whale contact pushes away and contact resolution does not double-tick invulnerability',()=>{
  const p=swimmer(),whale={x:p.x+10,y:p.y,size:60,whale:true};
  const world={players:[p],enemies:[whale],hazards:[]};
  p.invuln=1;
  createContactSystem(world,{autoReach:()=>1})(1/60);
  assert.ok(p.vx<0);assert.equal(p.invuln,1);
});
test('holding a direction can ride a school through the whole shelter window',()=>{
  const p=swimmer(),school={id:1,x:p.x+86,y:p.y,heading:1,wakeLeft:10,follow:0};
  const game={players:[p],expedition:{shoals:[school]}};p.vx=205;
  let rewarded=0;
  for(let t=0;t<145;t++){
    school.x+=36/60;movePlayer(p,1,0,1/60,bounds);followSlipstreams(game,1/60,()=>rewarded++);
  }
  assert.equal(rewarded,1);assert.ok(p.schoolCoverT>0);
});
test('checkpoints regenerate poses and reject malformed saved encounters',()=>{
  let raw;
  const descriptor=Object.getOwnPropertyDescriptor(globalThis,'localStorage');
  Object.defineProperty(globalThis,'localStorage',{configurable:true,value:{getItem:()=>raw,setItem:(k,v)=>{raw=v;}}});
  try {
    const p=swimmer();p.slots=[];p.levels={};movePlayer(p,1,0,1/60,bounds);
    const game={mode:'play',stage:1,time:8,p,story:{seen:new Set(),defeated:new Set()},
      expedition:{shoals:[],site:null},enemies:[{...p}],items:[],hazards:[],zones:[],foods:[],inks:[],stageEvo:[],stats:{}};
    writeCheckpoint(game,bounds.h);const saved=readCheckpoint();
    assert.ok(saved);assert.equal(saved.player.swim,undefined);assert.equal(saved.state.enemies[0].swim,undefined);
    saved.state.expedition.site={x:0,y:1,kind:'relay',cursor:10,points:[],hits:[]};
    raw=JSON.stringify(saved);assert.equal(readCheckpoint(),null);
  } finally{
    if(descriptor)Object.defineProperty(globalThis,'localStorage',descriptor);else delete globalThis.localStorage;
  }
});
test('neighbourhood solver benchmark',t=>{
  for(const count of [80,320,1000]){
    const fish=Array.from({length:count},(_,i)=>schoolFish(1+Math.floor(i/12),(i%25)*36,Math.floor(i/25)*30));
    const schools=Array.from({length:Math.ceil(count/12)},(_,i)=>({id:i+1,x:300,y:300,age:1,heading:1}));
    const samples=[];
    for(let tick=0;tick<150;tick++){
      const start=performance.now(),grid=indexSchools(fish);
      for(const f of fish){const v=schoolVelocity(f,schools[f.schoolId-1],grid);f.x+=v.x/60;f.y+=v.y/60;}
      if(tick>14)samples.push(performance.now()-start);
    }
    samples.sort((a,b)=>a-b);
    t.diagnostic(count+' fish, steering p95 '+samples[Math.floor(samples.length*.95)].toFixed(3)+' ms');
  }
});
