import {WORLD} from './config.js';
import {TAU, angLerp, clamp, dist, lerp, rand} from './utils.js';
import {stepSwim} from './locomotion.js';
import {indexSchools,schoolVelocity} from './schooling.js';
import {steerPredator} from './predator.js';

export function updateFauna({enemies, expedition, inks, decoy, time}, cameraY, alive, dt){
  const neighbourhood = indexSchools(enemies);
  for (var i = enemies.length - 1; i >= 0; i--){
    var e = enemies[i];
    /* 深海柱：远离镜头的杂鱼回收（宝箱鱼/蓝鲸例外，它们有全局唯一性检查） */
    if (!e.chest && !e.whale && (e.y < cameraY - 2100 || e.y > cameraY + 2800)){
      enemies.splice(i, 1); continue;
    }
    if (e.flash > 0) e.flash -= dt;
    stepSwim(e,e.skin || e.sid,dt,e.speed,false,e.size>=20 && Math.abs(e.y-cameraY)<720);

    if (e.stunT > 0){
      if(e.hunt)e.hunt=null;
      e.stunT -= dt;
      e.vx *= 1 - dt * 5; e.vy *= 1 - dt * 5;
      e.x = clamp(e.x + e.vx * dt, 0, WORLD.w);
      e.y = clamp(e.y + e.vy * dt, 0, WORLD.h);
      continue;
    }

    /* 双人时盯最近的那个 */
    var p = null, pD = 1e9;
    for (var a = 0; a < alive.length; a++){
      var dd = dist(e.x, e.y, alive[a].x, alive[a].y);
      if (dd < pD){ pD = dd; p = alive[a]; }
    }
    if (!p) continue;

    var tx = 0, ty = 0;
    var dx = p.x - e.x, dy = p.y - e.y, d = pD || 1;

    /* 诱饵浮标：优先级高于一切追踪 —— 它就是用来「把海引开」的 */
    var dec = decoy, lured = false;
    if (dec && dec.t > 0 && e.beh==='chase' && e.hunt?.phase!=='tell' && e.hunt?.phase!=='lunge'){
      var ddx = dec.x - e.x, ddy = dec.y - e.y, dl = Math.hypot(ddx, ddy) || 1;
      if (dl < 490){
        const pace=dl>e.size*.6+16 ? e.speed*1.28 : 0;
        tx = ddx / dl * pace;
        ty = ddy / dl * pace;
        lured = true;
      }
    }

    var attractR = 0;
    if (p.attract > 0){
      attractR = (170 + p.size * 1.6) * p.attract;
      var eligible = e.size < p.size * 0.9 || (p.attract >= 2 && e.tier === 2);
      if (eligible && d < attractR){
        e.attracted = true;
        tx = dx/d * e.speed * 1.1; ty = dy/d * e.speed * 1.1;
        e.vx = lerp(e.vx, tx, Math.min(1, dt * 3));
        e.vy = lerp(e.vy, ty, Math.min(1, dt * 3));
        e.x += e.vx * dt; e.y += e.vy * dt;
        var sp0 = Math.hypot(e.vx, e.vy);
        if (sp0 > 10) e.ang = angLerp(e.ang, Math.atan2(e.vy, e.vx), Math.min(1, dt * 6));
        continue;
      } else if (d >= attractR){
        e.attracted = false;
      }
    }

    var beh = e.beh;
    const frightened = p.fearT>0 && d<640;
    const threatened = !e.whale && !e.chest && p.size>e.size*1.18 && d<Math.max(95,p.size*1.65);
    if (frightened || threatened) beh='flee';

    const school = e.schoolId && expedition.shoals.find(s => s.id === e.schoolId);
    let huntResponse=0;
    if (e.hunt && (lured || beh!=='chase')) e.hunt=null;
    const attack=beh==='chase' && !lured && !school ? steerPredator(e,alive,inks,dt) : null;
    if (school && !lured && !frightened){
      const velocity = schoolVelocity(e,school,neighbourhood);
      tx = velocity.x; ty = velocity.y;
      if (threatened && p.dashT>0) {
        tx-=dx/d*45;
        ty-=dy/d*45;
      }
    } else if (lured){
      /* tx / ty 已由诱饵给出，不再做自身行为判定 */
    } else if (attack){
      tx=attack.x;ty=attack.y;huntResponse=attack.response;
    } else if (beh === 'flee' && d < (frightened ? 640 : 320)){
      const px=dx+p.vx*.18,py=dy+p.vy*.18,len=Math.hypot(px,py)||1;
      tx=-px/len*e.speed*1.2;ty=-py/len*e.speed*1.2;
    } else {
      e.wanderT -= dt;
      if (e.wanderT <= 0){ e.wanderAng = rand(0, TAU); e.wanderT = rand(1.0, 2.8); }
      tx = Math.cos(e.wanderAng) * e.speed * 0.6;
      ty = Math.sin(e.wanderAng) * e.speed * 0.6;
    }

    if (!school && !e.whale && !e.chest && e.hunt?.phase!=='lunge') {
      const margin=Math.max(105,e.size*.9);
      tx+=e.speed*clamp((margin-e.x)/margin,0,1);
      tx-=e.speed*clamp((e.x-WORLD.w+margin)/margin,0,1);
      ty+=e.speed*clamp((margin-e.y)/margin,0,1);
      ty-=e.speed*clamp((e.y-WORLD.h+margin)/margin,0,1);
    }

    var speedMul = 1;
    for (var k = 0; k < inks.length; k++){
      var ink = inks[k];
      if (dist(e.x, e.y, ink.x, ink.y) < ink.r){ speedMul = 0.45; break; }
    }

    var resp = huntResponse || (lured ? 4.2 : 1.8);
    e.vx = lerp(e.vx, tx * speedMul, Math.min(1, dt * resp));
    e.vy = lerp(e.vy, ty * speedMul, Math.min(1, dt * resp));

    if (e.sid === 'squid'){ e.dartT -= dt; if (e.dartT <= 0){ e.vx *= 2.1; e.vy *= 2.1; e.dartT = rand(2.2, 4.2); } }
    if (e.sid === 'seahorse') e.vy += Math.sin(time * 1.5 + e.phase) * 26 * dt;
    if (e.sid === 'puffer'){
      var near = d < e.size * 8;
      e.inflate = lerp(e.inflate, near ? 1 : 0, Math.min(1, dt * 2.2));
    }

    e.x += e.vx * dt; e.y += e.vy * dt;

    if (e.x < -110) e.x = WORLD.w + 110;
    if (e.x > WORLD.w + 110) e.x = -110;
    if (e.y < -110) e.y = WORLD.h + 110;
    if (e.y > WORLD.h + 110) e.y = -110;

    var spd = Math.hypot(e.vx, e.vy);
    if (spd > 10) e.ang = angLerp(e.ang, Math.atan2(e.vy, e.vx), Math.min(1, dt * 6));
  }
}

