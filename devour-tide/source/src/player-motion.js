import {angLerp,clamp,lerp} from './utils.js';
import {sampleWake,stepSwim,swimResponse} from './locomotion.js';

export function beginDash(p, ax, ay){
  /* 啃咬后摇期间不能冲刺：一口咬下去的代价是短暂失去逃生手段 */
  if (p.chompRecover > 0 || p.dashCd > 0 || p.stunT > 0) return false;
  var moving = Math.hypot(p.vx, p.vy) > 40;
  p.dashAng = Math.hypot(ax,ay)>.1 ? Math.atan2(ay,ax) : moving ? Math.atan2(p.vy,p.vx) : p.ang;
  p.dashT = 0.2;
  p.dashId = (p.dashId || 0) + 1;
  p.splitHits = 0;
  p.dashCd = 1.4 * p.dashCdMul;
  p.invuln = Math.max(p.invuln, p.glide ? 0.8 : p.dashT + 0.1);
  if (p.dashGhost) p.dashGhostT = 1.2;
  return true;
}

export function movePlayer(p,ax,ay,dt,bounds){
  var m = Math.hypot(ax, ay);
  if (m > 1){ ax /= m; ay /= m; }

  var sizePenalty = 1 / (1 + p.size * 0.0026);
  if (p.heavyHalf) sizePenalty = 1 / (1 + p.size * 0.0013);
  var sp = 250 * p.spdMul * sizePenalty;
  if (p.chompRecover > 0) sp *= 0.42;
  if (p.itemSpdT > 0) sp *= 1.35;
  if (p.hitBuffT > 0) sp *= 1.30;
  if (p.inflateT > 0) sp *= 0.72;
  if (p.slowT > 0) sp *= 0.60;
  if (p.rageT > 0) sp *= 1.45;
  if (p.vengeT > 0) sp *= 1.35;
  if (p.draftTime>0) p.draftTime=Math.max(0,p.draftTime-dt);

  if (p.dashT > 0){
    p.vx = Math.cos(p.dashAng) * 760 * p.dashPow;
    p.vy = Math.sin(p.dashAng) * 760 * p.dashPow;
  } else {
    const response = 1-Math.exp(-dt*swimResponse(p.fishId));
    // A held key can match the school's slower pace. Steering across it or dashing exits immediately.
    const following=p.draftTime>0 && ax*p.draftHeading>.5 && Math.abs(ay)<.45;
    const desiredX=following ? p.draftHeading*36+clamp((p.draftCenter-p.x)*1.6,-29,29) : ax*sp;
    p.vx = lerp(p.vx, desiredX, response);
    p.vy = lerp(p.vy, ay * sp, response);
  }

  p.dashFromX = p.x; p.dashFromY = p.y;
  p.x += p.vx * dt; p.y += p.vy * dt;
  p.x = clamp(p.x, p.size, bounds.w - p.size);
  p.y = clamp(p.y, p.size, bounds.h - p.size);

  var spd = Math.hypot(p.vx, p.vy);
  if (spd > 12) p.ang = angLerp(p.ang, Math.atan2(p.vy, p.vx), Math.min(1, dt * 9));
  stepSwim(p,p.fishId,dt,sp,p.dashT>0);
  sampleWake(p,dt);
}
