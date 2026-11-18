import {clamp,dist} from './utils.js';
import {Audio2} from './audio.js';

export function createContactSystem(G,{autoReach,eatEnemy,chompDamage,hitPlayer,killBoss,rewardSplit,burst,floater,hitImpact}) {
  function dashImpact(p, e, dx, dy){
    /* 一次冲刺对同一个敌鱼只结算一次，否则冲刺的每一帧都会重复砍一刀 */
    if (e.dashHits?.[p.id] === p.dashId) return;
    (e.dashHits ||= [])[p.id] = p.dashId;

    var m0 = Math.hypot(dx, dy) || 1;

    /* 剑鱼：冲刺直接结算为啃咬（伤害 ×1.6） */
    if (p.dashChomp){
      var saved = p.chompMul;
      p.chompMul = saved * 1.6;
      chompDamage(p, e, dx, dy);
      p.chompMul = saved;
      e.vx += dx / m0 * 640;
      e.vy += dy / m0 * 640;
      e.stunT = Math.max(e.stunT, 0.45);
      G.shake = Math.max(G.shake, 0.5);
      return;
    }

    var impact = p.size / Math.max(8, e.size);
    var power = clamp(impact, 0.35, 3.2);
    var m = Math.hypot(dx, dy) || 1;

    /* 击退 */
    e.vx += dx / m * 430 * power;
    e.vy += dy / m * 430 * power;

    /* 眩晕：压制比越高晕得越久 */
    var stun = 0.24 + 0.55 * clamp(impact - 0.85, 0, 2.2);
    if (p.dashStun) stun += 0.5;
    e.stunT = Math.max(e.stunT, stun);

    /* 伤害 = 削掉对方体型 */
    var dmgFrac = clamp(0.14 * power, 0.04, 0.34);
    var before = e.size;
    e.size = Math.max(7, e.size * (1 - dmgFrac));
    var dealt = before - e.size;

    e.flash = 0.18;
    burst(e.x, e.y, p.c2, 10 + Math.round(power * 5), 260, 5);
    if (dealt > 0.8) floater(e.x, e.y - e.size - 16, '-' + dealt.toFixed(0), '#ffd166');
    hitImpact(e.x, e.y, p.c2, 0.55 + power * 0.2, power > 1.4);
    Audio2.hurt();
  }

  function scatterDashWake(p, e){
    if (e.whale || e.chest || e.dashHits?.[p.id] === p.dashId ||
        e.dashWakeHits?.[p.id] === p.dashId) return;
    var fx = Math.cos(p.dashAng), fy = Math.sin(p.dashAng);
    var dx = e.x - p.dashFromX, dy = e.y - p.dashFromY;
    var length = Math.max(0, (p.x - p.dashFromX) * fx + (p.y - p.dashFromY) * fy);
    var forward = dx * fx + dy * fy;
    var side = dy * fx - dx * fy;
    /* 留出正前方的吞食通道；侧翼鱼才会被水流拨开。 */
    var width = clamp(38 + p.size * 0.8, 48, 105);
    if (forward < -width * 0.45 || forward > length + width * 0.25 ||
        Math.abs(side) < p.size * 0.44 || Math.abs(side) >= width) return;
    var weight = clamp(p.size / e.size, 0.22, 1.35);
    var force = (1 - Math.abs(side) / width) * 570 * weight;
    if (force < 30) return;

    (e.dashWakeHits ||= [])[p.id] = p.dashId;
    if (e.schoolId) rewardSplit(p,e);
    var lateral = side < 0 ? -force : force;
    e.vx = e.vx * 0.35 + fx * force * 0.24 - fy * lateral;
    e.vy = e.vy * 0.35 + fy * force * 0.24 + fx * lateral;
    e.stunT = Math.max(e.stunT, 0.20 + 0.18 * weight);
    if (p.dashWakeFx !== p.dashId){
      p.dashWakeFx = p.dashId;
      G.rings.push({ x:p.x, y:p.y, r:8, max:width * 1.4, color:p.c2, life:0.27, maxLife:0.27 });
      G.shake = Math.max(G.shake, 0.24);
    }
  }

  return function stepContacts(dt){
    for (var pi = 0; pi < G.players.length; pi++){
      var p = G.players[pi];
      if (p.dead) continue;

      var aR = autoReach(p);
      var shadowing = p.shadowBite && p.stealthOn;

      for (var i = G.enemies.length - 1; i >= 0; i--){
        var e = G.enemies[i];
        if (!e) continue;
        var dx = e.x - p.x, dy = e.y - p.y;
        var rr = p.size * 0.82 + e.size * 0.82;
        if (dx*dx + dy*dy > rr*rr){
          if (p.dashT > 0) scatterDashWake(p, e);
          continue;
        }

        /* 蓝鲸不吃你 —— 它吃磷虾。碰到它只会被它的分量推开。
           它是海里的「尺度」，不是敌人。 */
        if (e.whale){
          var wm = Math.hypot(dx, dy) || 1;
          p.vx -= dx / wm * 240;
          p.vy -= dy / wm * 240;
          continue;
        }

        var canAuto = e.size <= aR;
        var stealthKill = shadowing && e.size <= p.size * 2.6;
        var mawKill = p.devourMaw && e.attracted;

        if (canAuto || stealthKill || mawKill){
          if (p.blink && p.dashT > 0 && !canAuto){
            e.stunT = Math.max(e.stunT, 1.2);
            e.vx += dx * 3; e.vy += dy * 3;
            burst(e.x, e.y, '#a5f3fc', 12, 240);
            continue;
          }
          eatEnemy(p, e, i);
        } else if (p.dashT > 0){
          dashImpact(p, e, dx, dy);
        } else {
          if (p.touchStun > 0 && Math.random() < p.touchStun * dt * 6){
            e.stunT = Math.max(e.stunT, 1);
            burst(e.x, e.y, '#e9d5ff', 10, 200);
          }
          hitPlayer(p, e.x, e.y);
        }
      }

      if (p.poisonTouch > 0){
        for (var k = 0; k < G.enemies.length; k++){
          var en = G.enemies[k];
          if (en.stunT > 0) continue;
          if (dist(en.x, en.y, p.x, p.y) < p.size * 1.5){
            en.stunT = 1;
            burst(en.x, en.y, '#fed7aa', 8, 180);
          }
        }
      }

      /* 海域环境物 */
      for (var hi = G.hazards.length - 1; hi >= 0; hi--){
        var hz = G.hazards[hi];
        if (dist(hz.x, hz.y, p.x, p.y) > hz.r + p.size * 0.8) continue;
        if (hz.type === 'ice'){
          var mi = Math.hypot(p.x - hz.x, p.y - hz.y) || 1;
          p.vx += (p.x - hz.x)/mi * 130;
          p.vy += (p.y - hz.y)/mi * 130;
          p.slowT = Math.max(p.slowT, 1.1);
        } else if (hz.type === 'venom'){
          p.slowT = Math.max(p.slowT, 1.0);
          hitPlayer(p, hz.x, hz.y, 0.45);
        } else if (hz.type === 'lava'){
          hitPlayer(p, hz.x, hz.y, 0.5);
        } else if (hz.type === 'shock' && hz.t <= 0){
          hitPlayer(p, hz.x, hz.y, 0.7);
        }
      }

      /* Boss */
      if (G.boss){
        var b = G.boss;
        var bx = b.x - p.x, by = b.y - p.y;
        var br = b.size * 0.86 + p.size * 0.8;
        if (bx*bx + by*by < br*br){
          if (p.dashT > 0){
            var weak = b.weakT > 0;
            var dmg = (10 + p.size * 0.12) * p.hunt * (weak ? 2.5 : 1);
            b.hp -= dmg; b.flash = 0.25;
            p.dashT = 0; p.invuln = 0.5;
            p.vx *= -1.1; p.vy *= -1.1;
            G.shake = weak ? 1.2 : 0.7;
            burst(b.x, b.y, weak ? '#ffd166' : '#bfe9ff', weak ? 24 : 14, 320);
            floater(b.x, b.y - b.size * 0.5, (weak ? '弱点 ' : '') + '-' + Math.round(dmg), weak ? '#ffd166' : '#e0f2ff', weak);
            Audio2.hurt();
            if (b.hp <= 0){ killBoss(); return; }
          } else if (p.invuln <= 0 && p.armT <= 0){
            hitPlayer(p, b.x, b.y, 1.25);
          }
        }
      }
    }
  };
}
