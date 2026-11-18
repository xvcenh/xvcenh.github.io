import { clamp, TAU } from './utils.js';
import { STAGE_DEPTH, WORLD, ecoScale } from './config.js';

const sites = [
  { kind:'net', name:'破网救援', hint:'冲撞两枚橙色网扣', color:'#ffc179', reward:'shield' },
  { kind:'relay', name:'回声航道', hint:'依次穿过三个亮环', color:'#8eeedc', reward:'crystal' },
  { kind:'cache', name:'沉船黑匣', hint:'避过扫描，靠近读取', color:'#abbbff', reward:'shock' }
];
const shoalSkins = ['anchovy','needle','chromis','wrasse','anthias','cardinal'];

function near(player, site, point, radius) {
  return Math.hypot(player.x - site.x - point.x, player.y - site.y - point.y) < radius;
}

export function diveSite(stage, playerX, playerY) {
  const index = (stage - 1) % sites.length;
  const points = [
    [{x:-58,y:0},{x:58,y:0}],
    [{x:-74,y:-46},{x:82,y:0},{x:0,y:100}],
    [{x:0,y:0}]
  ][index];
  return { ...sites[index], stage, points, x:clamp(playerX, 140, WORLD.w - 140),
    y:clamp(Math.max((stage - 1) * STAGE_DEPTH + 480, playerY + 168), 180, WORLD.h - 300),
    phase:0, done:false, hits:[], cursor:0, timer:0, read:0 };
}

export function tickSite(site, players, dt, pulse, finish) {
  if (!site || site.done) return;
  site.phase += dt;
  const divers = players.filter(p => !p.dead);
  const finishSite = () => { site.done = true; finish(site); };
  if (site.kind === 'net') {
    site.points.forEach((point, i) => {
      if (site.hits.includes(i)) return;
      if (!divers.some(p => p.dashT > 0 && near(p, site, point, 23 + Math.min(32,p.size)))) return;
      site.hits.push(i);
      pulse(site.x + point.x, site.y, site.color);
    });
    if (site.hits.length === site.points.length) finishSite();
  } else if (site.kind === 'relay') {
    if (site.cursor && (site.timer -= dt) <= 0) site.cursor = 0;
    const point = site.points[site.cursor];
    if (divers.some(p => near(p,site,point,27 + Math.min(20,p.size * 0.4)))) {
      if (!site.cursor) site.timer = 6;
      site.cursor++;
      pulse(site.x + point.x,site.y + point.y,site.color);
      if (site.cursor === site.points.length) finishSite();
    }
  } else {
    const scanner = Math.sin(site.phase * 1.45) * 92;
    // A wide scan traverses the box. Moving to its far side keeps the download alive.
    const safe = divers.some(p => near(p, site, site.points[0], 55) && Math.abs(p.x - site.x - scanner) > 18);
    site.read = clamp(site.read + dt * (safe ? 1 : -0.65), 0, 2.5);
    if (site.read >= 2.5) finishSite();
  }
}

export function newExpedition() {
  return { site:null, completed:0, released:0, bestSplit:0, shoalId:0, nextShoal:0, shoals:[] };
}

export function spawnShoal(G, spawnEnemy, x, y, count, direction = 1) {
  const data = G.expedition;
  const room = Math.min(count, 80 - G.enemies.length);
  if (room < 3) return;
  const school = { id:++data.shoalId, x, y, heading:direction, age:0 };
  const scale=clamp(ecoScale(G.stage)*.5/13,.86,2.35);
  school.wakeOffset=86*scale;
  data.shoals.push(school);
  const skin = shoalSkins[(school.id - 1 + G.stage - 1) % shoalSkins.length];
  for (let i = 0; i < room; i++) {
    spawnEnemy('round',true);
    const fish = G.enemies[G.enemies.length - 1];
    const row = Math.floor(i / 3);
    fish.schoolId = school.id;
    fish.slotX = ((i % 3 - 1) * 31 + (row % 2) * 12)*scale;
    fish.slotY = (row - (Math.ceil(room / 3) - 1) / 2) * 21*scale;
    fish.x = x + fish.slotX;
    fish.y = y + fish.slotY;
    fish.size = clamp(ecoScale(G.stage) * (0.40 + 0.14 * Math.random()), 7, 32);
    fish.ang = direction < 0 ? Math.PI : 0;
    fish.vx = direction * 36; fish.vy = 0; fish.skin = skin;
  }
  return school;
}

export function lightSlipstream(school) {
  if (!school || school.wakeUsed) return false;
  school.wakeUsed=true; school.wakeLeft=10; school.follow=0;
  return true;
}

export function followSlipstreams(G, dt, complete) {
  for (const school of G.expedition.shoals) {
    if (!(school.wakeLeft>0)) continue;
    school.wakeLeft=Math.max(0,school.wakeLeft-dt);
    const centerX=school.x-school.heading*(school.wakeOffset || 86);
    const rider=G.players.find(p=>!p.dead && !(p.dashT>0) &&
      ((p.x-centerX)/54)**2+((p.y-school.y)/34)**2<1 &&
      p.vx*school.heading>7);
    if(rider){
      rider.draftTime=.14;rider.draftHeading=school.heading;rider.draftCenter=centerX;
    }
    const matched=rider && rider.vx*school.heading<175;
    school.follow=Math.max(0,school.follow+dt*(matched?1:-.55));
    if(matched)rider.schoolCoverT=.30;
    if (school.follow>=1.5 && rider) {
      school.wakeLeft=0;rider.schoolCoverT=1.25;complete(rider,school);
    }
  }
}

export function tickShoals(G, spawnEnemy, dt) {
  const data = G.expedition;
  const player = G.players.find(p => !p.dead);
  if (!player) return;
  data.nextShoal -= dt;
  if (data.nextShoal <= 0 && !G.boss) {
    const first = !data.shoalId;
    const direction = data.shoalId % 2 ? 1 : -1;
    const x = clamp(player.x - direction * (first ? 103 : 270), 130, WORLD.w - 130);
    const y = clamp(player.y + (first ? 4 : 110), 90, WORLD.h - 90);
    spawnShoal(G,spawnEnemy,x,y,first ? 12 : 9,direction);
    data.nextShoal = 13;
  }
  for (const s of data.shoals) {
    s.age += dt; s.x += s.heading * dt * 36;
    if (s.x < 95 || s.x > WORLD.w - 95) s.heading = s.x < 95 ? 1 : -1;
    s.y += Math.sin(s.age * 0.8) * dt * 9;
  }
  data.shoals = data.shoals.filter(s => s.age < 28 && Math.abs(s.y - player.y) < 1400);
}

