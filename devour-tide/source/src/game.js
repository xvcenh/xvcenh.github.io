import { STAGE_DEPTH, TOTAL_STAGES, WORLD, BOSS_STAGES, CHASE_FORMS, stageForY, seaIdxForStage, depthM, WHALE, SIZE_GAIN, STAGE_SCALE, ECO_CAP_MUL, ecoScale, GENE_GATE, GENE_MIN_RATIO, CHOMP_GENE_MUL, RARE_W, MAX_SLOTS, CHOMP_CD, CHOMP_RECOVER, SPECIES, SP_KEYS, SEAS, SEA_SPAN, seaOf, START_FISH, ITEM_RARITY, ITEM_TYPES, rollItem, MILESTONES, BOSS_DEFS } from './config.js';
import { TAU, rand, pick, clamp, lerp, rgba, angLerp, dist } from './utils.js';
import { Audio2 } from './audio.js';
import escapeArt from './paper-escape.webp?inline';

document.documentElement.style.setProperty('--escape-art', 'url("' + escapeArt + '")');
import { drawReef, drawSpecimen, drawPaperGuardian, drawPaperPickup, drawPaperPursuit } from './field-guide.js';
import { alertBand, encounters, endingChoices, newStory, raiseAlert, transmissions } from './story.js';

/* 强化卡牌：apply 引用 game 层的 gainGene，故留在本模块 */
var CARDS = [
  { name:'锐利牙齿', desc:'吞食获得的体型 +20%',              apply:function(p){ p.sizeGainMul *= 1.20; } },
  { name:'流线鱼身', desc:'移动速度 +12%',                    apply:function(p){ p.spdMul *= 1.12; } },
  { name:'猎手本能', desc:'对 Boss 伤害 +30%',                 apply:function(p){ p.hunt *= 1.30; } },
  { name:'暴食者',   desc:'啃咬吃下的猎物体型收益 +45%',            apply:function(p){ p.chompGain *= 1.45; } },
  { name:'铁胃',     desc:'受伤减免 +15%',                     apply:function(p){ p.dr += 0.15; } },
  { name:'连击本能', desc:'连击持续 +0.7 秒，连击加分 +40%',      apply:function(p){ p.comboWin += 0.7; p.comboScore *= 1.40; } },
  { name:'疾风冲刺', desc:'冲刺冷却 -25%',                     apply:function(p){ p.dashCdMul *= 0.75; } },
  { name:'电流共鸣', desc:'放电与雷暴冷却 -30%',                apply:function(p){ p.zapCdMul *= 0.70; } },
  { name:'逆流而上', desc:'受伤后 3 秒内速度 +35%',             apply:function(p){ p.venge = true; } },
  { name:'深潜体质', desc:'体型 +8%，受伤减免 +8%',             apply:function(p){ p.maxSize = Math.min(WHALE, p.maxSize * 1.08); p.size *= 1.08; p.dr += 0.08; } },
  { name:'深渊巨口', desc:'吞食判定 +15%',                     apply:function(p){ p.eatReach += 0.15; } },
  { name:'海神贡品', desc:'立即获得 10 点可用物种基因',           apply:function(p){
      for (var i = 0; i < 10; i++){
        var av = availSpecies(p);
        if (!av.length) break;
        gainGene(p, pick(av), 1);
      }
    } }
];

(function(){
'use strict';

/* ============================================================
   基础工具
   ============================================================ */
var cv = document.getElementById('cv');
var ctx = cv.getContext('2d');
var W = 0, H = 0, DPR = 1;

/* ============================================================
   手机模式
   ------------------------------------------------------------
   触屏设备自动切到手机模式：左下长出一根浮动摇杆，右下长出
   啃咬/冲刺/技能/封印四个键，HUD 重排到不挡手的位置，画质先降一档。
   桌面想手动控制：?mobile=1 强制开、?mobile=0 强制关。
   ============================================================ */
var MQ = window.matchMedia ? window.matchMedia.bind(window) : null;
var IS_TOUCH = false;
try {
  IS_TOUCH = (navigator.maxTouchPoints || 0) > 0 &&
             (!MQ || MQ('(pointer: coarse)').matches || !MQ('(hover: hover)').matches);
  if (MQ && MQ('(pointer: coarse)').matches) IS_TOUCH = true;
} catch(e){}
var MOBILE = !!IS_TOUCH;
(function(){
  var q = /[?&]mobile=([01])/.exec(location.search);
  if (q) MOBILE = q[1] === '1';
  if (MOBILE) document.documentElement.classList.add('mobile');
})();

/* 安全区（刘海 / 手势条）：CSS 读不到 env()，拿一个探针元素量出来 */
var SAFE = { t:0, r:0, b:0, l:0 };
function readSafe(){
  var el = document.getElementById('safeProbe');
  if (!el) return;
  var cs = getComputedStyle(el);
  SAFE.t = parseFloat(cs.paddingTop) || 0;
  SAFE.r = parseFloat(cs.paddingRight) || 0;
  SAFE.b = parseFloat(cs.paddingBottom) || 0;
  SAFE.l = parseFloat(cs.paddingLeft) || 0;
}

/* 触屏控件几何：绘制与命中检测共用同一份坐标 */
var TC = { s:1, jr:56, joy:{ x:0, y:0 }, btns:[], top:[] };
function layoutTouch(){
  TC.btns = []; TC.top = [];
  if (!MOBILE) return;
  var s = clamp(Math.min(W, H) / 660, 0.8, 1.15);
  TC.s = s;
  TC.jr = 54 * s;
  TC.joy.x = SAFE.l + 20 * s + TC.jr;
  TC.joy.y = H - SAFE.b - 20 * s - TC.jr;

  var R = 38 * s, r = 28 * s, gap = 12 * s;
  var cx = W - SAFE.r - 20 * s - R;
  var cy = H - SAFE.b - 20 * s - R;
  TC.btns = [
    { id:'chomp', x:cx,                y:cy,                r:R, glyph:'咬' },
    { id:'dash',  x:cx - R - r - gap,  y:cy - 2 * s,        r:r, glyph:'冲' },
    { id:'skill', x:cx - 4 * s,        y:cy - R - r - gap,  r:r, glyph:'技' },
    { id:'seal',  x:cx - R - r - gap,  y:cy - R - r - gap,  r:r, glyph:'封' }
  ];
  var tp = 15 * s;
  TC.top = [
    { id:'pause', x:W / 2 - tp - 14 * s, y:SAFE.t + tp, r:14 * s, glyph:'‖' },
    { id:'codex', x:W / 2 + tp + 14 * s, y:SAFE.t + tp, r:14 * s, glyph:'≡' }
  ];
}

function resize(){
  DPR = Math.min(window.devicePixelRatio || 1, 2);
  W = window.innerWidth; H = window.innerHeight;
  cv.width = Math.floor(W * DPR); cv.height = Math.floor(H * DPR);
  cv.style.width = W + 'px'; cv.style.height = H + 'px';
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  if (MOBILE){ readSafe(); layoutTouch(); }
}
window.addEventListener('resize', resize);
if (window.visualViewport) window.visualViewport.addEventListener('resize', resize);
resize();



/* ============================================================
   全局状态
   ============================================================ */
var G = {
  mode: 'menu', coop: false,
  stage: 1, stageT: 0, eatenStage: 0,
  chase: null, zones: [], bossDelay: 0,
  enemies: [], particles: [], floaters: [], motes: [], bubbles: [],
  inks: [], zaps: [], foods: [], items: [], hazards: [], rings: [], players: [],
  chestT: 16, hazT: 0, slowT: 0, mileIdx: 0,
  decoy: null, stasisT: 0, curseStage: 0,
  hitStop: 0, punch: 0, flashT: 0, chestAnim: null,
  /* 本段战报 */
  stageStartSize: 18, stageDmg: 0, stageBites: 0, stageEvo: [], stageSea: 0,
  p: null,                 /* 别名指向 players[0]，用于镜头与主 HUD */
  boss: null,
  spawnT: 0, shake: 0, time: 0,
  mutFlash: null,
  stats: { eaten:0, bestCombo:0, dmg:0, peak:18, bites:0, food:0, revives:0, chests:0, items:0 },
  paused: false, totalStages: TOTAL_STAGES
};
var cam = { x: WORLD.w/2, y: WORLD.h/2, zoom: 1 };
/* 视角控制：滚轮缩放 / +- 微调 / 0 复位（对应豪华版的「视野大小」设置） */
var camCtl = { zoom: 1 };
window.addEventListener('wheel', function(e){
  camCtl.zoom = clamp(camCtl.zoom * (e.deltaY > 0 ? 0.92 : 1.08), 0.55, 1.9);
  e.preventDefault();
}, { passive:false });
function viewRect(){
  var z = cam.zoom, vw = W / z, vh = H / z;
  return { x: cam.x - vw/2, y: cam.y - vh/2, w: vw, h: vh };
}
/* 手机屏幕窄：镜头再拉远一点，别让视野被挤成一条缝 */
function viewFit(){
  if (!MOBILE) return 1;
  return clamp(W / 1000, 0.6, 1);
}
function alivePlayers(){
  var out = [];
  for (var i = 0; i < G.players.length; i++) if (!G.players[i].dead) out.push(G.players[i]);
  return out;
}

/* ============================================================
   输入
   ============================================================ */
var keys = {};
var touch = { active:false, x:0, y:0, dx:0, dy:0, bite:false };

window.addEventListener('keydown', function(e){
  var k = e.key.toLowerCase();
  keys[k] = true;
  if (k === ' ' || k === 'shift' || k === 'enter' || k === 'arrowup' ||
      k === 'arrowdown' || k === 'arrowleft' || k === 'arrowright' || k === '/') e.preventDefault();
  if (k === 'tab' && G.mode === 'play'){ e.preventDefault(); toggleCodex(); }
  if (k === 'escape' && G.mode === 'play'){
    if (G.codexOpen) toggleCodex(false);
    else G.paused = !G.paused;
  }
  if (k === 'h' && G.mode === 'play'){ setLowQ(!LOWQ); }
  if (k === '0'){ camCtl.zoom = 1; }
  if (k === '+' || k === '='){ camCtl.zoom = clamp(camCtl.zoom * 1.1, 0.55, 1.9); }
  if (k === '-'){ camCtl.zoom = clamp(camCtl.zoom / 1.1, 0.55, 1.9); }
});
window.addEventListener('keyup', function(e){ keys[e.key.toLowerCase()] = false; });
window.addEventListener('blur', function(){ keys = {}; });

cv.addEventListener('contextmenu', function(e){ e.preventDefault(); });
cv.addEventListener('mousedown', function(e){ if (e.button === 2) touch.bite = true; });
window.addEventListener('mouseup', function(e){ if (e.button === 2) touch.bite = false; });
cv.addEventListener('touchstart', function(e){
  if (MOBILE) return;              /* 手机模式走下面的 pointer 层 */
  e.preventDefault();
  var t = e.touches[0];
  touch.active = true; touch.x = t.clientX; touch.y = t.clientY;
  touch.dx = 0; touch.dy = 0;
}, { passive:false });
cv.addEventListener('touchmove', function(e){
  if (MOBILE) return;
  e.preventDefault();
  if (!touch.active) return;
  var t = e.touches[0];
  var dx = t.clientX - touch.x, dy = t.clientY - touch.y;
  var d = Math.hypot(dx, dy);
  if (d > 8){ touch.dx = dx/d; touch.dy = dy/d; } else { touch.dx = 0; touch.dy = 0; }
}, { passive:false });
cv.addEventListener('touchend', function(e){
  if (MOBILE) return;
  e.preventDefault(); touch.active = false; touch.dx = 0; touch.dy = 0;
}, { passive:false });

/* ------------------------------------------------------------
   触屏输入（手机模式）
   ------------------------------------------------------------
   一根手指按在左半屏 → 摇杆就地出现，拖出方向；松手回中。
   右下的键按住即生效，啃咬按住会按节拍连发（一口一口啃的节奏感）。
   ------------------------------------------------------------ */
var mIn = {
  joy:false, bx:0, by:0, mx:0, my:0,
  bite:false, biteT:0, bitePulse:0,
  dash:false, skillPulse:0, releasePulse:0,
  ptr:{}, down:{}
};

function cvXY(e){
  var r = cv.getBoundingClientRect();
  return { x: e.clientX - r.left, y: e.clientY - r.top };
}
function hitCircle(q, b, pad){
  var rr = b.r * (pad || 1.25);
  var dx = q.x - b.x, dy = q.y - b.y;
  return dx * dx + dy * dy <= rr * rr;
}
function sealedNow(){ return !!(G.p && G.p.sealed); }
function btnVisible(b){
  if (b.id === 'seal')  return sealedNow();
  if (b.id === 'skill') return !!(G.p && G.p.skillKind);
  return true;
}
function pressBtn(id){
  mIn.down[id] = true;
  if (id === 'chomp'){ mIn.bite = true; mIn.biteT = 0; mIn.bitePulse = 0.07; }
  else if (id === 'dash') mIn.dash = true;
  else if (id === 'skill') mIn.skillPulse = 0.12;
  else if (id === 'seal') mIn.releasePulse = 0.12;
}
function releaseBtn(id){
  delete mIn.down[id];
  if (id === 'chomp') mIn.bite = false;
  else if (id === 'dash') mIn.dash = false;
}
function topTap(id){
  if (id === 'pause') G.paused = !G.paused;
  else if (id === 'codex') toggleCodex();
}

cv.addEventListener('pointerdown', function(e){
  if (!MOBILE || G.mode !== 'play' || !G.p) return;
  if (e.pointerType === 'mouse' && e.button !== 0) return;
  var q = cvXY(e);
  var i, b;

  /* 顶部两个小键：暂停中也要能点 */
  for (i = 0; i < TC.top.length; i++){
    if (hitCircle(q, TC.top[i], 1.6)){
      topTap(TC.top[i].id);
      e.preventDefault();
      return;
    }
  }
  if (G.paused){ G.paused = false; e.preventDefault(); return; }   /* 点屏幕继续 */
  if (G.coop) return;

  /* 右下技能键：用放大 1.2 倍的判定圈，手指没那么准 */
  for (i = 0; i < TC.btns.length; i++){
    b = TC.btns[i];
    if (!btnVisible(b) || !hitCircle(q, b, 1.2)) continue;
    mIn.ptr[e.pointerId] = b.id;
    pressBtn(b.id);
    try { cv.setPointerCapture(e.pointerId); } catch(err){}
    e.preventDefault();
    return;
  }

  /* 左半屏：浮动摇杆 */
  if (q.x < W * 0.62){
    mIn.joy = true;
    mIn.bx = q.x; mIn.by = q.y;
    mIn.mx = 0; mIn.my = 0;
    mIn.ptr[e.pointerId] = 'joy';
    try { cv.setPointerCapture(e.pointerId); } catch(err){}
    e.preventDefault();
  }
}, { passive:false });

cv.addEventListener('pointermove', function(e){
  if (!MOBILE || mIn.ptr[e.pointerId] !== 'joy') return;
  var q = cvXY(e);
  var dx = q.x - mIn.bx, dy = q.y - mIn.by;
  var d = Math.hypot(dx, dy);
  var dead = 8;
  if (d < dead){ mIn.mx = 0; mIn.my = 0; return; }
  /* 摇杆跟手：手指拖出圈外时底座慢慢追过去，方向不会丢 */
  if (d > TC.jr){
    mIn.bx += dx * (1 - TC.jr / d) * 0.5;
    mIn.by += dy * (1 - TC.jr / d) * 0.5;
    dx = q.x - mIn.bx; dy = q.y - mIn.by;
    d = Math.hypot(dx, dy) || 1;
  }
  var m = Math.min(1, (d - dead) / Math.max(1, TC.jr - dead));
  mIn.mx = dx / d * m;
  mIn.my = dy / d * m;
  e.preventDefault();
}, { passive:false });

function endPointer(e){
  if (!MOBILE) return;
  var role = mIn.ptr[e.pointerId];
  if (!role) return;
  delete mIn.ptr[e.pointerId];
  if (role === 'joy'){ mIn.joy = false; mIn.mx = 0; mIn.my = 0; }
  else releaseBtn(role);
}
cv.addEventListener('pointerup', endPointer);
cv.addEventListener('pointercancel', endPointer);
window.addEventListener('pointerup', endPointer);
window.addEventListener('pointercancel', endPointer);

/* 每帧推进：啃咬按住连发，技能/封印只吃按下那一下 */
function tickTouch(dt){
  if (!MOBILE) return;
  if (mIn.bite){
    mIn.biteT += dt;
    if (mIn.biteT >= 0.26){ mIn.biteT = 0; mIn.bitePulse = 0.07; }
  }
  if (mIn.bitePulse > 0) mIn.bitePulse -= dt;
  if (mIn.skillPulse > 0) mIn.skillPulse -= dt;
  if (mIn.releasePulse > 0) mIn.releasePulse -= dt;
}

function inputFor(p){
  var ax = 0, ay = 0, dash = false, bite = false, skill = false, release = false;
  if (p.id === 0){
    ax = (keys['d'] ? 1 : 0) - (keys['a'] ? 1 : 0);
    ay = (keys['s'] ? 1 : 0) - (keys['w'] ? 1 : 0);
    if (!G.coop){
      ax ||= (keys.arrowright ? 1 : 0) - (keys.arrowleft ? 1 : 0);
      ay ||= (keys.arrowdown ? 1 : 0) - (keys.arrowup ? 1 : 0);
    }
    dash = !!(keys['shift'] || keys[' ']);
    bite = !!(keys['j'] || touch.bite);
    skill = !!keys['k'];
    release = !!keys['q'];
    if (touch.active && !G.coop){ ax = touch.dx; ay = touch.dy; }
    /* 手机模式：触屏输入叠加在键盘之上，接了外接键盘也能用 */
    if (MOBILE && !G.coop){
      if (mIn.mx || mIn.my){ ax = mIn.mx; ay = mIn.my; }
      dash    = dash    || mIn.dash;
      bite    = bite    || mIn.bitePulse > 0;
      skill   = skill   || mIn.skillPulse > 0;
      release = release || mIn.releasePulse > 0;
    }
  } else {
    ax = (keys['arrowright'] ? 1 : 0) - (keys['arrowleft'] ? 1 : 0);
    ay = (keys['arrowdown'] ? 1 : 0) - (keys['arrowup'] ? 1 : 0);
    dash = !!keys['enter'];
    bite = !!(keys['/'] || keys['l']);
    skill = !!(keys[';'] || keys["'"]);
    release = !!(keys['.'] || keys['m']);
  }
  return { ax:ax, ay:ay, dash:dash, bite:bite, skill:skill, release:release };
}

/* ============================================================
   粒子 / 飘字
   ============================================================ */
function addParticle(x, y, vx, vy, life, color, size){
  if (G.particles.length > 900) return;
  G.particles.push({ x:x, y:y, vx:vx, vy:vy, life:life, max:life, color:color, size:size });
}
function burst(x, y, color, n, spd, size){
  for (var i = 0; i < n; i++){
    var a = rand(0, TAU), s = rand(spd * 0.3, spd);
    addParticle(x, y, Math.cos(a)*s, Math.sin(a)*s, rand(0.3, 0.75), color, rand(1.6, size || 4));
  }
}
function floater(x, y, text, color, big){
  G.floaters.push({ x:x, y:y, text:text, color:color || '#fff', life:1.3, max:1.3, big:!!big });
}

/* ------------------------------------------------------------
   打击感：顿帧 + 冲击环 + 镜头顿挫 + 白闪
   ------------------------------------------------------------
   顿帧（hit-stop）是性价比最高的一招：命中瞬间把时间停住几十毫秒，
   玩家的手和眼睛会同时「感觉到」这一下是硬的。
   ------------------------------------------------------------ */
function hitImpact(x, y, color, shake, big){
  G.hitStop = Math.max(G.hitStop, big ? 0.075 : 0.032);
  G.shake = Math.max(G.shake, shake || 0.4);
  G.punch = Math.max(G.punch, big ? 1 : 0.45);
  G.rings.push({ x:x, y:y, r:6, max: big ? 165 : 82, color: color || '#fff', life:0.34, maxLife:0.34 });
  if (big) G.flashT = Math.max(G.flashT, 0.10);
}

/* ============================================================
   玩家
   ============================================================ */
var PLAYER_SKINS = [
  { c1:'#22c1ff', c2:'#a5f3fc', label:'P1' },
  { c1:'#34d399', c2:'#a7f3d0', label:'P2' }
];

function makePlayer(id, coop, fishId){
  var skin = PLAYER_SKINS[id] || PLAYER_SKINS[0];
  var fish = null;
  for (var fi = 0; fi < START_FISH.length; fi++) if (START_FISH[fi].id === fishId) fish = START_FISH[fi];
  if (!fish) fish = START_FISH[0];

  var p = {
    id: id, dead: false, respawnT: 0,
    fishId: fish.id, fish: fish,
    x: WORLD.w/2 + (id === 0 ? -90 : 90), y: 320,
    vx:0, vy:0, ang:0,
    /* 基础上限只有 300：蓝鲸不是默认给你的，得靠器官一点点撬上去 */
    size: 18, maxSize: 300,
    dashT:0, dashCd:0, dashAng:0, invuln:1.6,
    chompCd:0, chompRecover:0, biteHeld:false, chompAnim:0, slowT:0,
    shield:0, itemSpdT:0, itemMagT:0,
    fangT:0, frenzyT:0, stealthT:0, hotT:0, eyeT:0, inflateMul:1.6,
    nettleT:0, phosphorT:0, fearT:0, chainT:0, bloodT:0,
    sealed:null, releaseHeld:false, maxSlots:3,
    /* 初始鱼专属 */
    skillKind:null, skillCd:0, inflateT:0, inflateFrom:0, skillHeld:false, hitBuffT:0,
    hitSpeed:false, summonSchool:false, schoolT:5, dashChomp:false,
    combo:0, comboT:0, eaten:0, score:0, stunT:0,
    c1: skin.c1, c2: skin.c2, label: skin.label,
    /* 乘子 */
    eatReach:0, chompReach:0, chompGain:1, chompMul:1, biteLoss:1,
    sizeGainMul:1, spdMul:1, dashCdMul:1, dr:0,
    dashPow:1, hunt:1, comboWin:1, comboScore:1, zapCdMul:1,
    /* 器官能力 */
    thorns:false, inflateHit:false, poisonTouch:0, burstArmor:false,
    bloodScent:false, bloodrage:false, dashStun:false, dashGhost:false,
    zap:0, stormField:false,
    touchStun:0, touchR:1.0, stunFeast:false,
    ink:false, blink:false,
    stealth:false, idleRegen:0, shadowBite:false,
    attract:0, devourMaw:false,
    heavyHalf:false, glide:false,
    venge:false,
    /* 物种基因追踪 */
    genes:{}, levels:{}, slots:[],
    /* 计时 */
    zapT:2.6, stormT:9, rageT:0, vengeT:0, dashGhostT:0,
    idleT:0, stealthOn:false, armT:0, armCd:0
  };
  for (var i = 0; i < SP_KEYS.length; i++){ p.genes[SP_KEYS[i]] = 0; p.levels[SP_KEYS[i]] = 0; }

  /* 初始鱼的配色与被动 */
  p.c1 = fish.color;
  p.c2 = fish.glow;
  fish.apply(p);

  return p;
}

function availSpecies(p){
  var out = [];
  for (var i = 0; i < SP_KEYS.length; i++){
    var id = SP_KEYS[i];
    if (p.levels[id] >= 3) continue;
    if (p.slots.length >= p.maxSlots && p.slots.indexOf(id) < 0) continue;
    out.push(id);
  }
  return out;
}

function gainGene(p, sid, amount){
  if (!p || p.dead) return;
  if (p.levels[sid] >= 3) return;
  if (p.slots.length >= p.maxSlots && p.slots.indexOf(sid) < 0) return;
  p.genes[sid] += amount;
  var lv = p.levels[sid];
  if (lv < 3 && p.genes[sid] >= GENE_GATE[lv]){
    p.levels[sid] = lv + 1;
    if (p.slots.indexOf(sid) < 0) p.slots.push(sid);
    var S = SPECIES[sid], organ = S.organs[lv];
    organ.apply(p);
    G.mutFlash = { sid:sid, lv:lv + 1, t:2.8, name:organ.name, desc:organ.desc,
                   fish:S.name, who:p.label };
    G.stageEvo.push(p.label + ' · ' + S.name + ' Lv.' + (lv + 1) + ' ' + organ.name);
    G.slowT = 0.55;
    burst(p.x, p.y, S.color, 42, 340, 6);
    floater(p.x, p.y - p.size - 44, '进化 · ' + organ.name, S.glow, true);
    G.shake = Math.min(1, G.shake + 0.5);
    Audio2.mutate();
  }
}

/* ============================================================
   敌人
   ============================================================ */
function rollSpecies(){
  var total = 0, w = [];
  for (var i = 0; i < SP_KEYS.length; i++){
    var id = SP_KEYS[i], S = SPECIES[id];
    var best = 0;
    for (var k = 0; k < G.players.length; k++){
      var p = G.players[k];
      if (p.dead) continue;
      var canGrow = (p.slots.length < p.maxSlots || p.slots.indexOf(id) >= 0) && p.levels[id] < 3;
      if (!canGrow) continue;
      /* 生态响应取两人中更强的那一份，保证「我想练 X」在双人局里依然可执行 */
      best = Math.max(best, 1 + 1.8 * clamp((p.genes[id] || 0) / 18, 0, 1));
    }
    var v = S.w * (best > 0 ? best : 0.5);
    w.push(v); total += v;
  }
  var r = Math.random() * total;
  for (var j = 0; j < SP_KEYS.length; j++){
    r -= w[j];
    if (r <= 0) return SP_KEYS[j];
  }
  return 'round';
}

function playerRefSize(){
  var m = 16;
  for (var i = 0; i < G.players.length; i++){
    if (G.players[i].dead) continue;
    m = Math.max(m, G.players[i].size);
  }
  return m;
}

function spawnEnemy(forceId, forceSmall){
  var psize = playerRefSize();

  /* ── 体型：由海域的生态刻度决定，不再跟着玩家无限上浮 ──
     旧的 base = 1.62 * pow(玩家体型, 0.85) 会让海永远比你大一号，
     再乘到 1.95 甚至 2.3，于是「无论你长多大都还有更大的鱼」。
     现在每片海有自己的绝对尺度，并且硬顶 WHALE。 */
  /* 体型完全由「你在第几段」决定，和你此刻多大无关。
     所以你长多大，都不会把海里的鱼一起长大 ——
     长过头的那一片，就真的归你了。 */
  var scale = ecoScale(G.stage) * (G.curseStage === G.stage ? 1.25 : 1);
  var roll = Math.random(), size;

  /* 玩家远小于这片海的刻度时，额外刷一批细碎食物。
     这是防死亡螺旋的保命阀：被咬小之后海里还有你能吃的东西，才有翻身的可能。
     没有它，玩家一旦掉到「比这片海最小的鱼还小」，就再也长不回去了。 */
  var starving = psize < scale * 0.55;

  if (starving && Math.random() < 0.55){
    size = rand(psize * 0.20, psize * 0.80);
  } else if (roll < 0.54){
    size = scale * rand(0.42, 0.86);        /* 可食 */
  } else if (roll < 0.90){
    size = scale * rand(0.90, 1.30);        /* 势均力敌 */
  } else {
    /* 巨兽的区间要按天花板反过来夹：直接 clamp 会让深海堆满「贴顶 480」的鱼 */
    var bigTop = Math.min(1.42, WHALE / Math.max(1, scale));
    size = scale * rand(1.30, Math.max(1.32, bigTop));
  }
  if (forceSmall) size = scale * rand(0.28, 0.50);

  var sid = forceId || rollSpecies();
  var S = SPECIES[sid];
  /* 物种自身体型倍率（圆润鲀 ×1.35、蝠鲼 ×1.35）不能把鱼推出生态上限，
     否则深海会堆满「贴顶」的鱼，可食比例被稀释掉 */
  size *= S.sizeMul;
  size = Math.min(size, scale * 1.45);

  var tier = 0;
  var rare = 0.055 + G.stage * 0.006;
  var elite = 0.028 + G.stage * 0.010;
  var rr = Math.random();
  if (rr < rare){ tier = 1; size *= 1.12; }
  else if (rr < rare + elite){ tier = 2; size *= 1.32; }
  /* 硬顶：蓝鲸之上没有生物。这一行就是「称霸」能被兑现的原因 */
  size = clamp(size, 7, WHALE);

  /* ── 位置：从远处游进来，而不是贴脸刷出来 ──
     以前在视野边缘外 70px 生成，玩家会看到鱼「凭空出现」，
     海像是道具刷怪机而不是一个生态。现在多数鱼从视野外几百像素处游进来。 */
  var v = viewRect();
  var rad = Math.max(v.w, v.h) * 0.5;
  /* 远处流进来：这是「生态感」的来源。但距离不能太大，
     否则玩家要干等好几秒才看见第一条鱼（实测会把首段拖到 22 秒）。 */
  var far = Math.random() < 0.60;
  /* 下潜世界：七成鱼从斜下方来，迎着你的下潜方向，减少回头路 */
  var ang0 = (Math.random() < 0.7) ? rand(-0.5, Math.PI + 0.5) : rand(0, TAU);
  var dist0 = rad + (far ? rand(230, 540) : rand(80, 180));
  /* 别把鱼堆到世界角落：超出就把距离收回来，方向不变 */
  dist0 = Math.min(dist0, Math.min(WORLD.w, WORLD.h) * 0.46);
  var x = clamp(cam.x + Math.cos(ang0) * dist0, 40, WORLD.w - 40);
  var y = clamp(cam.y + Math.sin(ang0) * dist0, 40, WORLD.h - 40);

  var beh = S.beh;
  var ref = psize;
  /* 生态规则：大鱼不屑追小虾米。
     这条同时是玩家被咬小之后的保命阀 —— 没有它，深海里的小玩家会被瞬间清空。 */
  var tooBig = size > ref * 3.0;
  if (beh === 'wander' && size < ref * 0.75 && Math.random() < 0.45) beh = 'flee';
  if (beh === 'wander' && size > ref * 1.15 && !tooBig && Math.random() < 0.38) beh = 'chase';
  if (tooBig) beh = 'wander';
  if (tier === 2 && !tooBig) beh = 'chase';

  var aggro = clamp(G.stage * 0.055, 0, 0.7);
  var speed = rand(50, 98) * (1 + G.stage * 0.06) * (1 + aggro * 0.30) * S.speedMul * (size > ref ? 0.88 : 1.08);
  if (tier === 2) speed *= 1.14;
  if (tooBig) speed *= 0.72;

  /* 远处生成的鱼朝视野方向游，玩家看到的是「鱼游过来了」 */
  var toCx = cam.x - x, toCy = cam.y - y;
  var tm = Math.hypot(toCx, toCy) || 1;
  var easIn = far ? speed * 0.55 : 0;

  G.enemies.push({
    x:x, y:y, vx: toCx / tm * easIn, vy: toCy / tm * easIn, size:size, ang:0, speed:speed,
    beh:beh, wanderAng: rand(0, TAU), wanderT: rand(0.5, 2.2),
    sid: sid, shape: S.shape, tier: tier,
    c1: S.color, c2: S.glow,
    stunT:0, flash:0, phase: rand(0, TAU), dartT: rand(1.4, 3.4),
    inflate:0, attracted:false
  });
  codexMark('seen', sid);
}

/* 在指定位置生成敌鱼（沙丁鱼召唤 / 事件用） */
/* ============================================================
   蓝鲸：海里的绝对上限
   ------------------------------------------------------------
   它不是 Boss，也不追你 —— 它吃磷虾，对你这点肉没兴趣。
   但它存在的意义是：让你知道「再往上没有了」。
   深渊里小概率出现，撞见它的那一刻，你就到过最深的地方了。
   ============================================================ */
function hasWhale(){
  for (var i = 0; i < G.enemies.length; i++) if (G.enemies[i].whale) return true;
  return false;
}

function spawnWhale(){
  var v = viewRect();
  var ang0 = rand(0, TAU);
  var dist0 = Math.max(v.w, v.h) * 0.5 + rand(240, 520);
  dist0 = Math.min(dist0, Math.min(WORLD.w, WORLD.h) * 0.46);
  var x = clamp(cam.x + Math.cos(ang0) * dist0, 60, WORLD.w - 60);
  var y = clamp(cam.y + Math.sin(ang0) * dist0, 60, WORLD.h - 60);

  G.enemies.push({
    x:x, y:y, vx:0, vy:0, size: WHALE, ang:0, speed: 34,
    beh:'wander', wanderAng: rand(0, TAU), wanderT: rand(2, 5),
    sid:'whale', shape:'whale', tier:0,
    c1:'#3b6ea5', c2:'#bae6fd',
    stunT:0, flash:0, phase: rand(0, TAU), dartT: 9,
    inflate:0, attracted:false, whale:true
  });
  codexMark('seen', 'whale');
  floater(x, y - WHALE * 0.5 - 40, '蓝鲸 · 海的尽头', '#bae6fd', true);
  G.shake = Math.max(G.shake, 0.5);
}

function spawnEnemyNear(x, y, small){
  spawnEnemy(null, small);
  var e = G.enemies[G.enemies.length - 1];
  if (!e) return;
  e.x = clamp(x, 70, WORLD.w - 70);
  e.y = clamp(y, 70, WORLD.h - 70);
  e.beh = 'wander';
  e.size = Math.min(e.size, playerRefSize() * 0.55);
}

/* ============================================================
   漂浮食物颗粒
   ============================================================ */
function spawnFood(){
  var v = viewRect();
  G.foods.push({
    x: rand(v.x - 40, v.x + v.w + 40), y: rand(v.y - 40, v.y + v.h + 40),
    vx: rand(-16, 16), vy: rand(-16, 16), size: rand(2.6, 6),
    phase: rand(0, TAU),
    color: pick(['#7de8ff', '#bfe9ff', '#ffd9a8', '#c9b8ff'])
  });
}

function updateFoods(dt){
  for (var i = G.foods.length - 1; i >= 0; i--){
    var f = G.foods[i];
    /* 深海柱：留在身后 2000px 以外的食物直接回收 */
    if (f.y < cam.y - 2000 || f.y > cam.y + 2800){ G.foods.splice(i, 1); continue; }
    var best = null, bestD = 1e9;
    for (var k = 0; k < G.players.length; k++){
      var p = G.players[k];
      if (p.dead) continue;
      var d = dist(f.x, f.y, p.x, p.y);
      if (d < bestD){ bestD = d; best = p; }
    }
    if (best){
      var dx = best.x - f.x, dy = best.y - f.y, dd = Math.hypot(dx, dy) || 1;
      var magR = 90 + best.size * 1.7;
      if (dd < magR){
        f.x += dx / dd * 260 * dt;
        f.y += dy / dd * 260 * dt;
      } else { f.x += f.vx * dt; f.y += f.vy * dt; }
    } else { f.x += f.vx * dt; f.y += f.vy * dt; }
    if (f.x < -20) f.x = WORLD.w + 20;
    if (f.x > WORLD.w + 20) f.x = -20;
    if (f.y < -20) f.y = WORLD.h + 20;
    if (f.y > WORLD.h + 20) f.y = -20;
    f.phase += dt * 3;
  }
}

function eatFoods(){
  for (var k = 0; k < G.players.length; k++){
    var p = G.players[k];
    if (p.dead) continue;
    for (var i = G.foods.length - 1; i >= 0; i--){
      var f = G.foods[i];
      var rr = p.size * 0.8 + f.size + 12;
      if (dist(f.x, f.y, p.x, p.y) < rr){
        G.foods.splice(i, 1);
        /* 非线性成长：小体型恢复快（避免死亡螺旋），大体型只当零星补给。 */
        p.size = Math.min(p.maxSize, p.size + Math.max(0.06, p.size * 0.0008));
        G.stats.food++;
        addParticle(f.x, f.y, rand(-40, 40), rand(-40, 40), 0.35, f.color, 2.4);
      }
    }
  }
}

/* ============================================================
   掉落物（道具）
   ============================================================ */
function spawnItemFrom(t, x, y){
  G.items.push({
    type: t, x:x, y:y,
    vx: rand(-34, 34), vy: rand(-34, 34),
    r: 13, t0: rand(0, TAU), life: 15
  });
}
function spawnItem(x, y){ spawnItemFrom(rollItem(), x, y); }

function updateItems(dt){
  for (var i = G.items.length - 1; i >= 0; i--){
    var it = G.items[i];
    it.t0 += dt * 3;
    it.life -= dt;
    if (it.life <= 0){ G.items.splice(i, 1); continue; }

    var best = null, bd = 1e9;
    for (var k = 0; k < G.players.length; k++){
      var pp = G.players[k];
      if (pp.dead) continue;
      var d = dist(it.x, it.y, pp.x, pp.y);
      if (d < bd){ bd = d; best = pp; }
    }

    if (best){
      var dx = best.x - it.x, dy = best.y - it.y, dd = Math.hypot(dx, dy) || 1;
      var magR = (110 + best.size * 1.5) * (best.itemMagT > 0 ? 2.1 : 1);
      if (dd < magR){
        it.x += dx / dd * 300 * dt;
        it.y += dy / dd * 300 * dt;
      } else {
        it.x += it.vx * dt; it.y += it.vy * dt;
        it.vx *= 1 - dt * 1.2; it.vy *= 1 - dt * 1.2;
      }
    }
  }
}

/* ============================================================
   封印槽：史诗道具不立刻生效，存起来由你决定什么时候放
   ------------------------------------------------------------
   没有这一层时，史诗道具最尴尬：「雷霆之核」在空场被捡到就是白捡。
   改成封印后，史诗道具的价值从「随机触发」变成「你判断时机」。
   槽里已经有一个时，新的会顶掉旧的 —— 旧的那个当场放掉，不浪费。
   ============================================================ */
function sealItem(p, t){
  if (p.sealed){
    var old = p.sealed;
    p.sealed = null;
    old.apply(p);
    floater(p.x, p.y - p.size - 60, '旧封印自动释放 · ' + old.name, old.color);
  }
  p.sealed = t;
  floater(p.x, p.y - p.size - 34, '封印 · ' + t.name, t.color, true);
  burst(p.x, p.y, t.color, 22, 290, 5);
  G.shockwave = { x:p.x, y:p.y, r:10, max:200, color:t.color };
  Audio2.card();
}

function releaseSeal(p){
  if (!p.sealed) return false;
  var t = p.sealed;
  p.sealed = null;
  t.apply(p);
  floater(p.x, p.y - p.size - 46, t.name + '！', t.color, true);
  hitImpact(p.x, p.y, t.color, 0.7, true);
  G.slowT = Math.max(G.slowT, 0.22);
  return true;
}

function collectItems(){
  for (var k = 0; k < G.players.length; k++){
    var p = G.players[k];
    if (p.dead) continue;
    for (var i = G.items.length - 1; i >= 0; i--){
      var it = G.items[i];
      if (dist(it.x, it.y, p.x, p.y) < p.size * 0.8 + it.r + 10){
        G.items.splice(i, 1);
        G.stats.items++;
        if (it.type.sealed){
          sealItem(p, it.type);
        } else {
          it.type.apply(p);
          floater(p.x, p.y - p.size - 34, it.type.name, it.type.color, true);
          burst(it.x, it.y, it.type.color, 14, 240);
          Audio2.card();
        }
      }
    }
  }
}

/* ============================================================
   宝箱鱼：小、快、会躲，吃掉必吐两个道具
   ============================================================ */
function spawnChestFish(){
  spawnEnemy();
  var e = G.enemies[G.enemies.length - 1];
  if (!e) return;
  e.chest = true;
  e.size = clamp(playerRefSize() * rand(0.34, 0.58), 8, 62);
  e.speed *= 1.4;
  e.beh = 'flee';
  e.tier = 0;
  e.c1 = '#b45309';
  e.c2 = '#fde68a';
  floater(e.x, e.y - 34, '🎁 宝箱鱼', '#ffd166', true);
}

function hasChestFish(){
  for (var i = 0; i < G.enemies.length; i++) if (G.enemies[i].chest) return true;
  return false;
}

/* ============================================================
   海域环境危险物
   ------------------------------------------------------------
   换海域不是换壁纸：每一片海都改一条你的移动或站位规则。
   ============================================================ */
function updateHazards(dt){
  var sea = seaOf(G.stage);
  var v = viewRect();
  G.hazT -= dt;

  if (G.hazT <= 0){
    if (sea.mod === 'ice'){
      G.hazT = 1.5;
      if (G.hazards.length < 7) G.hazards.push({
        type:'ice', x: v.x - 90, y: rand(v.y, v.y + v.h),
        r: rand(26, 56), vx: rand(28, 56), rot: rand(0, TAU), life: 30, max: 30
      });
    } else if (sea.mod === 'lava'){
      G.hazT = 0.5;
      if (G.hazards.length < 12) G.hazards.push({
        type:'lava', x: rand(v.x, v.x + v.w), y: v.y + v.h + 40,
        r: rand(9, 18), vy: -rand(62, 112), phase: rand(0, TAU), life: 12, max: 12
      });
    } else if (sea.mod === 'shock'){
      G.hazT = 2.1;
      if (G.hazards.length < 3) G.hazards.push({
        type:'shock', x: rand(v.x + 90, v.x + v.w - 90), y: rand(v.y + 90, v.y + v.h - 90),
        r: rand(62, 104), t: 1.1, life: 2.4, max: 2.4, phase: rand(0, TAU)
      });
    } else {
      G.hazT = 1.0;
    }
  }

  for (var i = G.hazards.length - 1; i >= 0; i--){
    var h = G.hazards[i];
    h.life -= dt;
    if (h.type === 'ice'){ h.x += h.vx * dt; h.rot += dt * 0.2; }
    else if (h.type === 'lava'){ h.y += h.vy * dt; h.phase += dt * 4; h.x += Math.sin(h.phase) * 26 * dt; }
    else if (h.type === 'shock'){ h.t -= dt; }
    if (h.life <= 0 || h.x > WORLD.w + 140 || h.y < -90) G.hazards.splice(i, 1);
  }
}

/* ============================================================
   碰撞 / 吞食
   ============================================================ */
function autoReach(p){ return p.size * (0.92 + p.eatReach); }
function chompArc(p){ return p.size * (0.95 + p.chompReach * 0.5) + 46; }

function eatEnemy(p, e, idx, viaChomp){
  if (G.story && e.size > p.size * .8){
    G.story.huntedLarge = true;
    raiseAlert(G.story, 2);
  }
  G.enemies.splice(idx, 1);

  var tierMul = e.tier === 2 ? 3.2 : (e.tier === 1 ? 1.8 : 1);
  p.combo++; p.comboT = 2.4 * p.comboWin;
  G.stats.bestCombo = Math.max(G.stats.bestCombo, p.combo);

  var curseMul = (G.curseStage === G.stage) ? 2 : 1;
  var gained = Math.round((10 + e.size * 6) * tierMul * (1 + Math.min(p.combo, 25) * 0.08) * p.comboScore * curseMul);
  p.score += gained;
  p.eaten++; G.eatenStage++; G.stats.eaten++;
  codexMark('eaten', e.sid);

  var rel = e.size / p.size;
  var sizeMul = (viaChomp ? p.chompGain : 1) * (viaChomp && p.bloodScent ? 2 : 1);
  /* 吃小虾米不长个子。
     相对体型越悬殊，这一口的成长越少 —— 于是「你能不能继续长大」
     不取决于某个数字上限，而取决于「海里还有没有够大的东西」。
     这比硬顶一个数字更符合生态，也让称霸来的自然。 */
  var sizeEff = clamp(rel * 1.6, 0.10, 1.30);
  /* 生态软上限：这片海里最大的东西只有「刻度 ×1.6」，
     你不可能靠吃它长到比它还大。想长得更大，只能往更深处游。
     没有这条时，一局里只要前期吃得快，就会一路滚雪球到无敌。 */
  var cap = Math.min(p.maxSize, ecoScale(G.stage) * ECO_CAP_MUL);
  p.size = Math.min(cap, p.size + e.size * SIZE_GAIN * sizeEff * tierMul * p.sizeGainMul * sizeMul * curseMul);
  G.stats.peak = Math.max(G.stats.peak, p.size);

  if (viaChomp){ G.stats.bites++; G.stageBites++; }
  G.stageBestCombo = Math.max(G.stageBestCombo || 0, p.combo);

  /* 只有够分量的猎物才长器官 */
  if (rel >= GENE_MIN_RATIO){
    var S0 = SPECIES[e.sid];
    var g = 1;
    if (e.tier >= 1) g += 1;
    if (e.tier >= 2) g += 2;
    if (viaChomp) g = Math.round(g * CHOMP_GENE_MUL);
    /* 稀有猎物营养更浓缩：难找，但每口更值钱。
       没有这条，权重 22 的圆润鲀会一家独大，其余 10 种器官沦为死内容。 */
    if (S0.w <= RARE_W) g *= 2;
    gainGene(p, e.sid, g);
    floater(e.x, e.y - e.size - 30, '+' + g + ' ' + S0.org, S0.glow);
  }

  /* 连锁吞噬：每次吞食都炸开一圈，把周围敌鱼撞小 ——
     让「吃小鱼」这条最稳的路径也能反哺「打大鱼」，形成滚雪球 */
  if (p.chainT > 0){
    var chR = p.size * 2.6 + 70;
    for (var ci2 = G.enemies.length - 1; ci2 >= 0; ci2--){
      var ce2 = G.enemies[ci2];
      if (dist(ce2.x, ce2.y, e.x, e.y) > chR) continue;
      var cdmg = clamp(ce2.size * 0.14, 1, 26);
      ce2.size = Math.max(6, ce2.size - cdmg);
      ce2.stunT = Math.max(ce2.stunT, 0.35);
      var cdx = ce2.x - e.x, cdy = ce2.y - e.y, cdm = Math.hypot(cdx, cdy) || 1;
      ce2.vx += cdx / cdm * 260;
      ce2.vy += cdy / cdm * 260;
      burst(ce2.x, ce2.y, '#fb923c', 5, 150, 3);
    }
    G.rings.push({ x:e.x, y:e.y, r:12, max:chR, life:0.34, maxLife:0.34, color:'#fb923c', w:3 });
  }

  /* 宝箱鱼：必吐两个道具，并播一段抽奖动画 */
  if (e.chest){
    G.stats.chests++;
    var loot = [rollItem(), rollItem()];
    for (var ci = 0; ci < loot.length; ci++) spawnItemFrom(loot[ci], e.x + rand(-26, 26), e.y + rand(-26, 26));
    G.chestAnim = { t: 0, dur: 2.5, items: loot, x: e.x, y: e.y };
    burst(e.x, e.y, '#ffd166', 30, 340, 7);
    Audio2.card();
  } else {
    var dropChance = e.tier === 2 ? 0.40 : 0.06;
    if (Math.random() < dropChance) spawnItem(e.x, e.y);
  }

  if (p.stunFeast && e.stunT > 0){
    p.size = Math.min(p.maxSize, p.size * 1.06);
    floater(p.x, p.y - p.size - 20, '+6% 体型', '#e9d5ff');
  }

  if (p.bloodrage && p.combo > 0 && p.combo % 4 === 0) p.rageT = 3;

  burst(e.x, e.y, e.c2, e.tier ? 20 : 10, e.tier ? 300 : 200, e.tier ? 6 : 4);
  floater(e.x, e.y - e.size - 12, '+' + gained, viaChomp ? '#ffd166' : '#bfe9ff');
  hitImpact(e.x, e.y, e.c2, e.tier ? 0.7 : 0.28, e.tier >= 1 || e.chest);
  Audio2.eat(p.combo);
}

function hitPlayer(p, srcX, srcY, mulBite){
  if (p.dead || p.invuln > 0 || p.dashT > 0 || p.armT > 0 || p.inflateT > 0) return;

  /* 泡泡护盾：直接吃掉这次伤害 */
  if (p.shield > 0){
    p.shield--;
    p.invuln = 1.2;
    burst(p.x, p.y, '#a78bfa', 20, 260);
    floater(p.x, p.y - p.size - 26, '护盾抵挡', '#c4b5fd', true);
    Audio2.zap();
    return;
  }

  var dmgMul = (mulBite || 1) * (1 - clamp(p.dr, 0, 0.75));
  G.stats.dmg++;
  G.stageDmg++;
  p.invuln = 1.5;
  if (p.hitSpeed) p.hitBuffT = 2;

  var dx = p.x - srcX, dy = p.y - srcY, m = Math.hypot(dx, dy) || 1;
  p.vx = dx/m * 300; p.vy = dy/m * 300;

  if (p.inflateHit){
    for (var i = 0; i < G.enemies.length; i++){
      var e = G.enemies[i];
      if (dist(e.x, e.y, p.x, p.y) < p.size * 2.4){
        var d = dist(e.x, e.y, p.x, p.y) || 1;
        e.vx += (e.x - p.x)/d * 560; e.vy += (e.y - p.y)/d * 560;
      }
    }
    burst(p.x, p.y, '#fed7aa', 14, 260);
  }

  if (p.thorns){
    for (var j = 0; j < G.enemies.length; j++){
      var e2 = G.enemies[j];
      if (dist(e2.x, e2.y, p.x, p.y) < 260){
        var d2 = dist(e2.x, e2.y, p.x, p.y) || 1;
        e2.vx += (e2.x - p.x)/d2 * 520; e2.vy += (e2.y - p.y)/d2 * 520;
        e2.stunT = Math.max(e2.stunT, 1.2);
      }
    }
    burst(p.x, p.y, '#fcd34d', 20, 300);
  }

  var lost = Math.max(1.5, p.size * (0.10 + rand(0, 0.05)) * dmgMul * p.biteLoss);
  p.size = Math.max(9, p.size - lost);

  G.shake = 1; Audio2.hurt();
  burst(p.x, p.y, '#ff8fa3', 14, 240);
  hitImpact(p.x, p.y, '#ff8fa3', 1, true);
  floater(p.x, p.y - p.size - 24, '-' + lost.toFixed(0), '#ff8fa3');

  if (p.venge) p.vengeT = 3;
  if (p.size <= 10.5) downPlayer(p);
}

function downPlayer(p){
  if (G.coop){
    p.dead = true; p.size = 10;
    G.shake = 1.4;
    showBanner(p.label + ' 倒下了！', '队友靠近即可救起');
    Audio2.over();
  } else {
    endRun('你被啃得只剩一层皮');
  }
}

function checkRevives(){
  if (!G.coop) return;
  var alive = alivePlayers();
  if (!alive.length) return;
  for (var i = 0; i < G.players.length; i++){
    var g = G.players[i];
    if (!g.dead) continue;
    for (var k = 0; k < alive.length; k++){
      if (dist(alive[k].x, alive[k].y, g.x, g.y) < 120){
        g.dead = false;
        g.size = 26;
        g.invuln = 2.6;
        g.vx = 0; g.vy = 0;
        G.stats.revives++;
        burst(g.x, g.y, g.c2, 30, 300);
        floater(g.x, g.y - 50, '救援成功', '#8dffc8', true);
        Audio2.revive();
        break;
      }
    }
  }
}

/* ------------------------------------------------------------
   冲刺撞击：把「体型」变成战斗力
   ------------------------------------------------------------
   原理：体型压制比 impact = 自己的体型 / 对方体型。
     · 击退距离 ∝ impact
     · 眩晕时长 ∝ impact
     · 伤害 = 削掉对方体型的百分比（impact 越大削得越狠）
   不给小鱼加血条，而是用「被撞小」来表达受伤 ——
   撞小之后它自然就落进你的吞食范围，形成「撞 → 吃」的连招。
   这就是「体型越大伤害越高」最直接的落地方式。
   ------------------------------------------------------------ */
/* ------------------------------------------------------------
   啃咬（按一下，啃一口）
   ------------------------------------------------------------
   为什么不做「长按姿态」：
     长按等于把风险开关变成了免费增益 —— 你只要一直按着，
     吞食上限就永久翻倍，唯一的代价「不能冲刺」在躲怪时本来也用不上。
     改成单次动作之后，收益变成「多按几次」，每一口都有冷却和后摇，
     而且必须贴到大鱼脸上才能啃 —— 风险和时间成本都是实打实的。
   ------------------------------------------------------------ */
function chompDamage(p, e, dx, dy){
  var impact = p.size / Math.max(8, e.size);
  var mul = p.chompMul * (p.fangT > 0 ? 1.6 : 1) * (p.bloodT > 0 ? 2.4 : 1);   /* 嗜血利齿 / 血怒腺 */
  var dmgFrac = clamp(0.28 * Math.sqrt(impact) * mul, 0.06, 0.30);
  var before = e.size;
  e.size = Math.max(7, e.size * (1 - dmgFrac));
  var dealt = before - e.size;

  var m = Math.hypot(dx, dy) || 1;
  e.vx += dx / m * 170;
  e.vy += dy / m * 170;
  e.stunT = Math.max(e.stunT, 0.32);
  e.flash = 0.16;

  burst(e.x, e.y, '#ffd166', 10, 230, 5);
  if (dealt > 0.6) floater(e.x, e.y - e.size - 16, '-' + dealt.toFixed(0), '#ffd166');
  hitImpact(e.x, e.y, '#ffd166', 0.45, false);
}

function doChomp(p){
  p.chompCd = CHOMP_CD * (p.frenzyT > 0 ? 0.55 : 1) * (p.bloodT > 0 ? 0.55 : 1);
  p.chompRecover = CHOMP_RECOVER;
  p.chompAnim = 0.22;

  const mecha = G.boss;
  if (mecha?.idx === 5 && G.story?.whale === 'resonate'){
    const range = mecha.size * 1.6 + p.size;
    if (dist(mecha.x, mecha.y, p.x, p.y) > range) return;
    mecha.hp -= mecha.maxHp / 3 + 1;
    burst(p.x, p.y, '#8df2dc', 20, 190, 5);
    floater(mecha.x, mecha.y - mecha.size, '鲸鸣 · 机甲收到信号', '#8df2dc', true);
    if (mecha.hp <= 0) killBoss();
    return;
  }

  /* 前冲一小口，帮助够到目标，同时让你更难立刻后撤 */
  p.vx += Math.cos(p.ang) * 210;
  p.vy += Math.sin(p.ang) * 210;

  var reach = chompArc(p);
  var halfArc = 1.15;
  var didHit = false;

  for (var i = G.enemies.length - 1; i >= 0; i--){
    var e = G.enemies[i];
    if (!e) continue;
    var dx = e.x - p.x, dy = e.y - p.y;
    var d = Math.hypot(dx, dy) || 1;
    if (d > reach + e.size * 0.9) continue;
    var diff = Math.abs((((Math.atan2(dy, dx) - p.ang) + Math.PI * 3) % TAU) - Math.PI);
    if (diff > halfArc) continue;

    didHit = true;
    if (e.size <= autoReach(p) * 1.05){
      eatEnemy(p, e, i, true);
    } else {
      chompDamage(p, e, dx, dy);
      /* 啃到够小就顺势吞掉 —— 「把大的啃死」的直接兑现 */
      if (G.enemies[i] === e && e.size <= autoReach(p)) eatEnemy(p, e, i, true);
    }
  }

  /* 咬 Boss */
  if (G.boss){
    var b = G.boss;
    if (dist(b.x, b.y, p.x, p.y) < b.size * 0.9 + p.size * 1.15){
      var bdmg = (6 + p.size * 0.10) * p.hunt * p.chompMul * (b.weakT > 0 ? 2.2 : 1);
      if (G.story?.rageUntil > G.time) bdmg *= 1.3;
      if (G.story?.venom) bdmg *= 1.12;
      b.hp -= bdmg; b.flash = 0.22;
      didHit = true;
      burst(b.x, b.y, b.weakT > 0 ? '#ffd166' : '#bfe9ff', 16, 280);
      floater(b.x, b.y - b.size * 0.5, '-' + Math.round(bdmg), b.weakT > 0 ? '#ffd166' : '#e0f2ff');
      Audio2.hurt();
      if (b.hp <= 0){ killBoss(); return; }
    }
  }

  burst(p.x + Math.cos(p.ang) * p.size * 0.95, p.y + Math.sin(p.ang) * p.size * 0.95,
        didHit ? '#ffd166' : p.c2, didHit ? 14 : 6, 240, 4);
  if (didHit) Audio2.eat(p.combo);
  else Audio2.dash();
}

function dashImpact(p, e, dx, dy){
  /* 一次冲刺对同一个敌鱼只结算一次，否则冲刺的每一帧都会重复砍一刀 */
  if (e.lastDashId === p.dashId) return;
  e.lastDashId = p.dashId;

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

function collisions(dt){
  for (var pi = 0; pi < G.players.length; pi++){
    var p = G.players[pi];
    if (p.dead) continue;
    if (p.invuln > 0) p.invuln -= dt;

    var aR = autoReach(p);
    var shadowing = p.shadowBite && p.stealthOn;

    for (var i = G.enemies.length - 1; i >= 0; i--){
      var e = G.enemies[i];
      if (!e) continue;
      var dx = e.x - p.x, dy = e.y - p.y;
      var rr = p.size * 0.82 + e.size * 0.82;
      if (dx*dx + dy*dy > rr*rr) continue;

      /* 蓝鲸不吃你 —— 它吃磷虾。碰到它只会被它的分量推开。
         它是海里的「尺度」，不是敌人。 */
      if (e.whale){
        var wm = Math.hypot(dx, dy) || 1;
        p.vx += dx / wm * 240;
        p.vy += dy / wm * 240;
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
}

/* ============================================================
   Boss
   ============================================================ */


function startBoss(isElite, secondRuins = false){
  /* 段 1-2→鲨 · 3-4→霜鲸 · 5-6→魟 · 7-8→鳝 · 9-10→水母后 · 11-12→熔岩 */
  var idx = clamp(Math.floor((G.stage - 1) / 2), 0, BOSS_DEFS.length - 1);
  var def = BOSS_DEFS[idx];
  var tier = clamp(Math.floor(idx / 2), 0, 2);
  var hp = Math.round((260 + idx * 120) * (isElite ? 0.62 : (G.coop ? 1.75 : 1)));
  const band = alertBand(G.story?.alert ?? 0);
  hp = Math.round(hp * (1 + Math.max(0, band - 1) * .2) *
    (idx === 5 && (G.story?.ruinsBypass || G.story?.whale === 'devour') ? 1.2 : 1));
  G.boss = {
    name: secondRuins ? '遗迹型追猎潜航器' : (idx === 5 && G.story?.whale === 'resonate' ? '深潜机甲 · 等待应答' : def.name), def: def, tier: tier, idx: idx, secondRuins,
    x: WORLD.w/2, y: cam.y - (H / cam.zoom) * 0.34,
    size: (58 + playerRefSize() * 0.42) * def.sizeMul,
    hp: hp, maxHp: hp,
    state:'enter', timer:1.8, vx:0, vy:0, flash:0,
    weakT: 0, cycT: 4.5, cx:0, cy:0,
    ghostA: 1, venT: 1.2
  };
  Audio2.boss();
  G.shake = 1.3;
  codexMark('seen', bossDrawKey(idx));
  floater(cam.x, cam.y - 60, (isElite ? '💀 精英 · ' : '⚠ ') + def.name + ' 出现', '#fda4af', true);
}

function killBoss(){
  var b = G.boss;
  burst(b.x, b.y, '#ffd166', 60, 420, 8);
  burst(b.x, b.y, '#fda4af', 40, 320, 6);
  G.shake = 1.6;
  G.boss = null;
  for (var i = 0; i < G.players.length; i++){
    var p = G.players[i];
    if (p.dead) continue;
    p.size = Math.min(p.maxSize, p.size * 1.22);
  }
  codexMark('eaten', bossDrawKey(b.idx));
  if (G.story) {
    G.story.defeated.add(b.idx);
    if (b.idx < 5) raiseAlert(G.story, 10);
  }
  if (b.secondRuins) G.story.ruinsSecond = true;
  if (b.idx === 4 && !b.secondRuins) {
    openStory('ruins');
    return;
  }
  if (b.idx === 0 && !G.reefCleared) {
    G.reefCleared = true;
    showBanner('珊瑚浅海 · 已通过', '选择强化后继续下潜');
  }
  floater(b.x, b.y - 40, b.idx === 5 && G.story.whale === 'resonate'
    ? '机甲已应答 · 武器下线' : '吞噬 Boss · 体型 +22%', '#ffd166', true);
  Audio2.mutate();
  if (G.stage >= TOTAL_STAGES){
    openStory('ending');
  } else {
    setTimeout(function(){ completeStage(); }, 420);
  }
}

function updateBoss(dt){
  var b = G.boss;
  if (!b) return;
  if (b.flash > 0) b.flash -= dt;

  var alive = alivePlayers();
  if (!alive.length) return;
  var target = alive[0];
  var bestD = 1e9;
  for (var i = 0; i < alive.length; i++){
    var d0 = dist(alive[i].x, alive[i].y, b.x, b.y);
    if (d0 < bestD){ bestD = d0; target = alive[i]; }
  }

  b.cycT -= dt;
  if (b.cycT <= 0){ b.cycT = 5.2; b.weakT = 1.6; }
  if (b.weakT > 0) b.weakT -= dt;
  if (b.def.g === 'ghost' && b.state !== 'phase') b.ghostA = lerp(b.ghostA, 1, Math.min(1, dt * 5));

  /* 剧毒水母后：游过之处留下毒沼 */
  if (b.def.g === 'venom' && b.state !== 'enter'){
    b.venT -= dt;
    if (b.venT <= 0){
      b.venT = 0.62;
      if (G.hazards.length < 14) G.hazards.push({ type:'venom', x:b.x, y:b.y, r:rand(20,32), phase:rand(0,TAU), life:7, max:7 });
    }
  }

  var dx = target.x - b.x, dy = target.y - b.y, d = Math.hypot(dx, dy) || 1;

  if (b.state === 'enter'){
    b.y = lerp(b.y, cam.y, Math.min(1, dt * 1.2));
    b.timer -= dt;
    if (b.timer <= 0){ b.state = 'idle'; b.timer = rand(1.8, 3.0); }
  } else if (b.state === 'idle'){
    var spd = (52 + b.tier * 14) * b.def.speedMul;
    if (d > 60){ b.vx = lerp(b.vx, dx/d * spd, dt * 1.1); b.vy = lerp(b.vy, dy/d * spd, dt * 1.1); }
    b.x += b.vx * dt; b.y += b.vy * dt;
    b.timer -= dt;
    if (b.timer <= 0){
      var roll = Math.random();
      if (b.def.g === 'ghost' && roll < 0.30){ b.state = 'phase'; b.timer = 0.9; }
      else if (roll < 0.55){ b.state = 'charge'; b.timer = 0.8; }
      else { b.state = 'burst'; b.timer = 0.9; }
    }
  } else if (b.state === 'charge'){
    b.timer -= dt;
    if (b.timer <= 0){
      b.cx = dx/d; b.cy = dy/d;
      b.state = 'charging'; b.timer = 0.85;
      Audio2.dash();
    }
  } else if (b.state === 'charging'){
    var cs = 470 + b.tier * 70;
    b.x += b.cx * cs * dt; b.y += b.cy * cs * dt;
    b.timer -= dt;
    if (b.timer <= 0){ b.state = 'idle'; b.timer = rand(1.6, 2.6); }
  } else if (b.state === 'phase'){
    b.timer -= dt;
    b.ghostA = lerp(b.ghostA, 0.12, Math.min(1, dt * 7));
    if (b.timer <= 0){
      var ba = target.ang || Math.atan2(b.y - target.y, b.x - target.x);
      b.x = clamp(target.x - Math.cos(ba) * 250, b.size, WORLD.w - b.size);
      b.y = clamp(target.y - Math.sin(ba) * 250, b.size, WORLD.h - b.size);
      b.ghostA = 1;
      burst(b.x, b.y, '#c4b5fd', 16, 230, 4);
      Audio2.dash();
      var gd = Math.hypot(target.x - b.x, target.y - b.y) || 1;
      b.cx = (target.x - b.x) / gd; b.cy = (target.y - b.y) / gd;
      b.state = 'charging'; b.timer = 0.75;
    }
  } else if (b.state === 'burst'){
    b.timer -= dt;
    if (b.timer <= 0){
      var n = 10 + b.tier * 3;
      for (var q = 0; q < n; q++){
        var a = q / n * TAU;
        G.particles.push({ x:b.x, y:b.y, vx:Math.cos(a)*220, vy:Math.sin(a)*220,
          life:0.9, max:0.9, color:b.def.c2, size:5, proj:true });
      }
      /* 机制分化：每个头目的爆发都长得不一样 */
      if (b.def.g === 'shock'){
        var base = Math.atan2(dy, dx), n2 = 9;
        for (var q3 = 0; q3 < n2; q3++){
          var a3 = base + (q3 - (n2 - 1) / 2) * 0.15;
          G.particles.push({ x:b.x, y:b.y, vx:Math.cos(a3)*305, vy:Math.sin(a3)*305,
            life:1.6, max:1.6, color:'#6ee7b7', size:6, proj:true });
        }
      }
      if (b.def.g === 'frost'){
        for (var f2 = 0; f2 < 2; f2++) if (G.hazards.length < 10)
          G.hazards.push({ type:'ice', x:b.x+rand(-190,190), y:b.y+rand(-190,190), r:rand(44,68), vx:0, rot:rand(0,TAU), life:9, max:9 });
      }
      if (b.def.g === 'lava'){
        for (var f3 = 0; f3 < 3; f3++) if (G.hazards.length < 12)
          G.hazards.push({ type:'lava', x:b.x+rand(-160,160), y:b.y+rand(-160,160), r:rand(12,20), vy:0, phase:rand(0,TAU), life:9, max:9 });
      }
      Audio2.boss();
      b.state = 'idle'; b.timer = rand(1.8, 2.8);
    }
  }

  for (var j = G.particles.length - 1; j >= 0; j--){
    var q2 = G.particles[j];
    if (!q2.proj) continue;
    for (var m = 0; m < G.players.length; m++){
      var pp = G.players[m];
      if (pp.dead) continue;
      if (dist(q2.x, q2.y, pp.x, pp.y) < pp.size * 0.7 + 8){
        G.particles.splice(j, 1);
        hitPlayer(pp, q2.x, q2.y);
        break;
      }
    }
  }

  b.x = clamp(b.x, b.size, WORLD.w - b.size);
  b.y = clamp(b.y, b.size, WORLD.h - b.size);
}

/* ============================================================
   玩家更新
   ============================================================ */
function tryDash(p){
  /* 啃咬后摇期间不能冲刺：一口咬下去的代价是短暂失去逃生手段 */
  if (p.chompRecover > 0 || p.dashCd > 0 || p.stunT > 0) return;
  var moving = Math.hypot(p.vx, p.vy) > 40;
  p.dashAng = moving ? Math.atan2(p.vy, p.vx) : p.ang;
  p.dashT = 0.2;
  p.dashId = (p.dashId || 0) + 1;
  p.dashCd = 1.4 * p.dashCdMul;
  p.invuln = Math.max(p.invuln, p.glide ? 0.8 : p.dashT + 0.1);
  if (p.dashGhost) p.dashGhostT = 1.2;
  Audio2.dash();
  burst(p.x, p.y, '#a5f3fc', 10, 200, 3);
  if (p.ink) G.inks.push({ x:p.x, y:p.y, r: 30, life:2.2, max:2.2 });
}

function updatePlayer(p, dt){
  if (p.dead){
    p.vx *= 1 - dt * 4; p.vy *= 1 - dt * 4;
    return;
  }
  if (p.invuln > 0) p.invuln -= dt;
  if (p.dashT > 0) p.dashT -= dt;
  if (p.dashCd > 0) p.dashCd -= dt;
  if (p.rageT > 0) p.rageT -= dt;
  if (p.vengeT > 0) p.vengeT -= dt;
  if (p.dashGhostT > 0) p.dashGhostT -= dt;
  if (p.stunT > 0) p.stunT -= dt;

  if (p.burstArmor){
    p.armCd -= dt;
    if (p.armT > 0) p.armT -= dt;
    else if (p.armCd <= 0){
      p.armT = 2; p.armCd = 10;
      for (var i = 0; i < G.enemies.length; i++){
        var e = G.enemies[i];
        if (dist(e.x, e.y, p.x, p.y) < p.size * 2.6){
          var d = dist(e.x, e.y, p.x, p.y) || 1;
          e.vx += (e.x - p.x)/d * 640; e.vy += (e.y - p.y)/d * 640;
          e.stunT = Math.max(e.stunT, 0.8);
        }
      }
      burst(p.x, p.y, '#fed7aa', 30, 360, 6);
      G.shake = 0.8;
    }
  }

  var inp = inputFor(p);
  var ax = inp.ax, ay = inp.ay;

  var moving = Math.hypot(ax, ay) > 0.1;
  if (p.stealth){
    if (moving){ p.idleT = 0; p.stealthOn = false; }
    else {
      p.idleT += dt;
      if (p.idleT > 1) p.stealthOn = true;
      if (p.stealthOn && p.idleRegen > 0){
        p.size = Math.min(p.maxSize, p.size * (1 + p.idleRegen / 100 * dt));
      }
    }
  }

  /* 啃咬：按一下啃一口（边沿触发，按住不会连发） */
  if (p.chompCd > 0) p.chompCd -= dt;
  if (p.chompRecover > 0) p.chompRecover -= dt;
  if (p.chompAnim > 0) p.chompAnim -= dt;
  if (p.itemSpdT > 0) p.itemSpdT -= dt;
  if (p.itemMagT > 0) p.itemMagT -= dt;
  if (p.skillCd > 0) p.skillCd -= dt;
  if (p.hitBuffT > 0) p.hitBuffT -= dt;
  if (p.slowT > 0) p.slowT -= dt;
  if (p.fangT > 0) p.fangT -= dt;
  if (p.frenzyT > 0) p.frenzyT -= dt;
  if (p.hotT > 0) p.hotT -= dt;
  if (p.nettleT > 0) p.nettleT -= dt;
  if (p.phosphorT > 0) p.phosphorT -= dt;
  if (p.fearT > 0) p.fearT -= dt;
  if (p.chainT > 0) p.chainT -= dt;
  if (p.bloodT > 0) p.bloodT -= dt;

  /* 水母刺丝：贴身敌鱼被麻痹 */
  if (p.nettleT > 0){
    for (var ni = 0; ni < G.enemies.length; ni++){
      var ne = G.enemies[ni];
      if (ne.stunT > 0.35) continue;
      if (dist(ne.x, ne.y, p.x, p.y) < p.size * 1.5){
        ne.stunT = Math.max(ne.stunT, 0.9);
        burst(ne.x, ne.y, '#c4b5fd', 6, 170, 4);
      }
    }
  }
  if (p.stealthT > 0){
    p.stealthT -= dt;
    if (p.stealthT <= 0) p.stealthOn = false;
  }

  /* 深海热泉：贴身的敌鱼持续被灼伤、越来越小 */
  if (p.hotT > 0){
    for (var hi2 = 0; hi2 < G.enemies.length; hi2++){
      var he = G.enemies[hi2];
      if (dist(he.x, he.y, p.x, p.y) < p.size * 1.7){
        he.size = Math.max(7, he.size * (1 - 0.16 * dt));
        he.flash = Math.max(he.flash, 0.1);
        if (Math.random() < dt * 5) burst(he.x, he.y, '#ff8e53', 3, 130, 3);
      }
    }
  }

  /* 刺豚 · 膨胀到期：还原体型（取膨胀前后较大值，避免被吃掉收益） */
  if (p.inflateT > 0){
    p.inflateT -= dt;
    if (p.inflateT <= 0){
      p.size = Math.max(p.inflateFrom, p.size / (p.inflateMul || 1.6));
      p.inflateFrom = 0;
      p.inflateMul = 1.6;
      burst(p.x, p.y, '#fed7aa', 16, 240);
    }
  }

  /* 沙丁鱼 · 召唤鱼群 */
  if (p.summonSchool){
    p.schoolT -= dt;
    if (p.schoolT <= 0){
      p.schoolT = 11;
      for (var si = 0; si < 6; si++){
        var sa = rand(0, TAU), sr = rand(130, 270);
        spawnEnemyNear(p.x + Math.cos(sa) * sr, p.y + Math.sin(sa) * sr, true);
      }
      floater(p.x, p.y - p.size - 30, '鱼群聚集', '#e2e8f0');
    }
  }

  /* 封印释放 */
  if (inp.release && !p.releaseHeld && p.sealed && p.dashT <= 0 && p.stunT <= 0){
    releaseSeal(p);
  }
  p.releaseHeld = inp.release;

  var wantChomp = inp.bite;
  if (wantChomp && !p.biteHeld && p.chompCd <= 0 && p.chompRecover <= 0 &&
      p.dashT <= 0 && p.stunT <= 0){
    doChomp(p);
  }
  p.biteHeld = wantChomp;

  /* 初始鱼的主动技能（K / ；） */
  if (inp.skill && !p.skillHeld && p.skillKind === 'inflate' &&
      p.skillCd <= 0 && p.inflateT <= 0 && p.dashT <= 0){
    p.skillCd = 14;
    p.inflateT = 2.5;
    p.inflateFrom = p.size;
    p.size = Math.min(p.maxSize, p.size * 1.6);
    burst(p.x, p.y, '#fed7aa', 34, 380, 6);
    floater(p.x, p.y - p.size - 30, '膨胀！', '#fed7aa', true);
    G.shake = 0.7;
    Audio2.mutate();
  }
  p.skillHeld = inp.skill;

  /* 膨胀期间的光环：把贴脸的鱼弹开 */
  if (p.inflateT > 0){
    for (var ai = 0; ai < G.enemies.length; ai++){
      var ae = G.enemies[ai];
      if (dist(ae.x, ae.y, p.x, p.y) < p.size * 1.55){
        var ad = dist(ae.x, ae.y, p.x, p.y) || 1;
        ae.vx += (ae.x - p.x) / ad * 640 * dt * 4;
        ae.vy += (ae.y - p.y) / ad * 640 * dt * 4;
      }
    }
  }

  if (inp.dash) tryDash(p);

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

  if (p.dashT > 0){
    p.vx = Math.cos(p.dashAng) * 760 * p.dashPow;
    p.vy = Math.sin(p.dashAng) * 760 * p.dashPow;
  } else {
    p.vx = lerp(p.vx, ax * sp, Math.min(1, dt * 7));
    p.vy = lerp(p.vy, ay * sp, Math.min(1, dt * 7));
  }

  p.x += p.vx * dt; p.y += p.vy * dt;
  p.x = clamp(p.x, p.size, WORLD.w - p.size);
  p.y = clamp(p.y, p.size, WORLD.h - p.size);

  var spd = Math.hypot(p.vx, p.vy);
  if (spd > 12) p.ang = angLerp(p.ang, Math.atan2(p.vy, p.vx), Math.min(1, dt * 9));

  if (p.comboT > 0){
    p.comboT -= dt;
    if (p.comboT <= 0) p.combo = 0;
  }

  if (p.zap > 0){
    p.zapT -= dt * p.zapCdMul;
    if (p.zapT <= 0){
      p.zapT = 2.6;
      var pool = G.enemies.slice().sort(function(a, b){
        return dist(a.x, a.y, p.x, p.y) - dist(b.x, b.y, p.x, p.y);
      });
      var n = p.zap === 2 ? 3 : 1;
      for (var k = 0; k < Math.min(n, pool.length); k++){
        var en = pool[k];
        en.stunT = Math.max(en.stunT, p.zap === 2 ? 1.6 : 1.2);
        G.zaps.push({ x1:p.x, y1:p.y, x2:en.x, y2:en.y, life:0.22 });
        burst(en.x, en.y, '#ddd6fe', 12, 240);
      }
      Audio2.zap();
    }
  }

  if (p.stormField){
    p.stormT -= dt * p.zapCdMul;
    if (p.stormT <= 0){
      p.stormT = 9;
      for (var q = 0; q < G.enemies.length; q++) G.enemies[q].stunT = Math.max(G.enemies[q].stunT, 1.5);
      G.shockwave = { x:p.x, y:p.y, r:10, max:1100, color:'#ddd6fe' };
      G.shake = 0.9;
      Audio2.boss();
    }
  }
}

/* ============================================================
   敌人更新
   ============================================================ */
function updateEnemies(dt){
  var alive = alivePlayers();
  for (var i = G.enemies.length - 1; i >= 0; i--){
    var e = G.enemies[i];
    /* 深海柱：远离镜头的杂鱼回收（宝箱鱼/蓝鲸例外，它们有全局唯一性检查） */
    if (!e.chest && !e.whale && (e.y < cam.y - 2100 || e.y > cam.y + 2800)){
      G.enemies.splice(i, 1); continue;
    }
    if (e.flash > 0) e.flash -= dt;

    if (e.stunT > 0){
      e.stunT -= dt;
      e.vx *= 1 - dt * 5; e.vy *= 1 - dt * 5;
      e.x += e.vx * dt; e.y += e.vy * dt;
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
    var dec = G.decoy, lured = false;
    if (dec && dec.t > 0){
      var ddx = dec.x - e.x, ddy = dec.y - e.y, dl = Math.hypot(ddx, ddy) || 1;
      if (dl > e.size * 0.6 + 16){
        tx = ddx / dl * e.speed * 1.45;
        ty = ddy / dl * e.speed * 1.45;
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

    var hidden = p.stealthOn;
    var beh = e.beh;
    if (hidden && beh === 'chase' && d > p.size * 2) beh = 'wander';
    if (p.fearT > 0) beh = 'flee';      /* 恐惧信息素：连掠食者也会退 */

    if (lured){
      /* tx / ty 已由诱饵给出，不再做自身行为判定 */
    } else if (beh === 'chase' && e.size > p.size * 1.02){
      tx = dx/d * e.speed; ty = dy/d * e.speed;
    } else if (beh === 'flee'){
      var fleeR = p.fearT > 0 ? 640 : 320;
      if (d < fleeR){ tx = -dx/d * e.speed * 1.2; ty = -dy/d * e.speed * 1.2; }
      else {
        e.wanderT -= dt;
        if (e.wanderT <= 0){ e.wanderAng = rand(0, TAU); e.wanderT = rand(1.2, 3); }
        tx = Math.cos(e.wanderAng) * e.speed * 0.55;
        ty = Math.sin(e.wanderAng) * e.speed * 0.55;
      }
    } else if (beh === 'chase'){
      tx = dx/d * e.speed * 0.9; ty = dy/d * e.speed * 0.9;
    } else {
      e.wanderT -= dt;
      if (e.wanderT <= 0){ e.wanderAng = rand(0, TAU); e.wanderT = rand(1.0, 2.8); }
      tx = Math.cos(e.wanderAng) * e.speed * 0.6;
      ty = Math.sin(e.wanderAng) * e.speed * 0.6;
    }

    var speedMul = 1;
    for (var k = 0; k < G.inks.length; k++){
      var ink = G.inks[k];
      if (dist(e.x, e.y, ink.x, ink.y) < ink.r){ speedMul = 0.45; break; }
    }

    var resp = lured ? 4.2 : 1.8;   /* 被诱饵吸走时转向更快，否则「引开」会显得拖泥带水 */
    e.vx = lerp(e.vx, tx * speedMul, Math.min(1, dt * resp));
    e.vy = lerp(e.vy, ty * speedMul, Math.min(1, dt * resp));

    if (e.sid === 'squid'){ e.dartT -= dt; if (e.dartT <= 0){ e.vx *= 2.1; e.vy *= 2.1; e.dartT = rand(2.2, 4.2); } }
    if (e.sid === 'seahorse') e.vy += Math.sin(G.time * 1.5 + e.phase) * 26 * dt;
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

/* ============================================================
   流程
   ============================================================ */
function transTo(fn){
  if (G.trans){
    if (!G.trans.fired) G.trans.cb = fn;
    else fn();
    return;
  }
  G.trans = { t: 0, dur: 1.05, cb: fn, fired: false };
}
/* ---------- 奇遇三选一（复用结算面板 DOM） ---------- */
var EVENT_POOL = [
  { name:'🌊 洋流馈赠', desc:'全队体型 +18%',
    run:function(){ for (var i = 0; i < G.players.length; i++){ var p = G.players[i]; p.size = Math.min(p.maxSize, p.size * 1.18); floater(p.x, p.y - p.size - 26, '+18% 体型', '#8dffc8'); } } },
  { name:'🧬 基因潮', desc:'每人随机获得 3 点基因',
    run:function(){ for (var i = 0; i < G.players.length; i++){ var p = G.players[i]; var sid = pick(Object.keys(SPECIES)); gainGene(p, sid, 3); floater(p.x, p.y - p.size - 26, '基因潮 +' + 3, SPECIES[sid].glow, true); } } },
  { name:'⏳ 时之砂', desc:'全队连击窗口 +50%',
    run:function(){ for (var i = 0; i < G.players.length; i++) G.players[i].comboWin *= 1.5; } },
  { name:'🎁 漂流宝箱', desc:'随机一张强化卡，立即生效',
    run:function(){ var c = pick(CARDS); for (var i = 0; i < G.players.length; i++) c.apply(G.players[i]); floater(G.p.x, G.p.y - G.p.size - 30, '获得强化 · ' + c.name, '#ffd166', true); } },
  { name:'🩸 深海献祭', desc:'全队体型 -12%，成长速度永久 +15%',
    run:function(){ for (var i = 0; i < G.players.length; i++){ var p = G.players[i]; p.size = Math.max(12, p.size * 0.88); p.sizeGainMul *= 1.15; } } },
  { name:'⚡ 海神祝福', desc:'全队成长速度永久 +10%',
    run:function(){ for (var i = 0; i < G.players.length; i++) G.players[i].sizeGainMul *= 1.10; } }
];
function showEventChoices(){
  G.mode = 'event';
  Audio2.card();
  ovCards.classList.remove('hide');
  document.getElementById('cardTag').textContent = '深海奇遇';
  document.getElementById('cardTitle').textContent = '❓ 三选一 · 择一而行';
  var badge = document.getElementById('rankBadge');
  badge.textContent = '?'; badge.className = 'rank B';
  document.getElementById('cardSub').textContent = '深海从不白给 —— 每份馈赠都有它的形状';
  document.getElementById('reportGrid').innerHTML = '';
  document.getElementById('evoLine').innerHTML = '';
  var pool = EVENT_POOL.slice(), opts = [];
  while (opts.length < 3 && pool.length) opts.push(pool.splice(Math.floor(Math.random() * pool.length), 1)[0]);
  G.eventOpts = opts;
  var list = document.getElementById('cardList');
  list.innerHTML = '';
  opts.forEach(function(ev, idx){
    var el = document.createElement('div');
    el.className = 'card';
    el.innerHTML = '<div class="t">' + ev.name + '</div><div class="d">' + ev.desc + '</div>';
    el.onclick = function(){ ovCards.classList.add('hide'); resolveEvent(idx); };
    list.appendChild(el);
  });
}
function resolveEvent(idx){
  if (G.trans && !G.trans.fired) return;
  var ev = (G.eventOpts || [])[idx];
  if (ev) ev.run();
  Audio2.card();
  G.mode = 'play';
  hideAll();
}

function startRun(coop, fishA, fishB){
  toggleCodex(false);
  Audio2.init();
  G.coop = !!coop;
  G.mode = 'play';
  G.trans = { t: 0.45, dur: 1.05, cb: null, fired: true, label: '下潜 · 珊瑚浅海' };
  G.stage = 1; G.stageT = 0; G.eatenStage = 0;
  G.reefCleared = false;
  G.story = newStory();
  WORLD.h = TOTAL_STAGES * STAGE_DEPTH;
  G.enemies = []; G.particles = []; G.floaters = [];
  G.inks = []; G.zaps = []; G.foods = []; G.items = []; G.players = [];
  G.hazards = []; G.hazT = 0; G.slowT = 0; G.mileIdx = 0; G.mileBanner = null;
  G.hitStop = 0; G.punch = 0; G.flashT = 0; G.chestAnim = null; G.rings = [];
  G.chestT = 16;
  G.decoy = null; G.stasisT = 0; G.curseStage = 0;
  G.boss = null; G.mutFlash = null; G.shake = 0; G.time = 0;
  G.stats = { eaten:0, bestCombo:0, dmg:0, peak:18, bites:0, food:0, revives:0, chests:0, items:0 };

  /* 追赶者：开局悬在头顶 1400px 之外，给 40 秒左右的喘息，然后开始缓慢下压 */
  G.chase = { y: 320 - 1400, form: CHASE_FORMS[0], hitT: 0 };
  G.bossDelay = 0;
  G.zones = buildZones();

  var n = G.coop ? 2 : 1;
  for (var i = 0; i < n; i++){
    G.players.push(makePlayer(i, G.coop, i === 0 ? fishA : (fishB || fishA)));
  }
  G.p = G.players[0];

  G.stageStartSize = G.p.size;
  G.stageDmg = 0; G.stageBites = 0; G.stageEvo = []; G.stageSea = 0;
  G.stats.peak = G.p.size;

  cam.x = WORLD.w/2; cam.y = 320; cam.zoom = 1;

  /* 装饰粒子只在镜头附近维持密度 —— 31200px 深的世界不可能铺满 */
  G.bubbles = [];
  for (var b1 = 0; b1 < 130; b1++){
    G.bubbles.push({ x: rand(0, WORLD.w), y: rand(cam.y - 400, cam.y + 1400), r: rand(1.4, 6),
      spd: rand(12, 46), wob: rand(0, TAU), wobS: rand(0.6, 1.8), a: rand(0.1, 0.4) });
  }
  G.motes = [];
  for (var m1 = 0; m1 < 120; m1++){
    G.motes.push({ x: rand(0, WORLD.w), y: rand(cam.y - 400, cam.y + 1400), r: rand(0.7, 2.4),
      spd: rand(5, 16), wob: rand(0, TAU), a: rand(0.15, 0.5) });
  }

  /* 开局先撒一批：约三分之一强制小鱼，保证一开始就有东西可吃，
     但别给太多，否则第一段会被白送 */
  for (var k = 0; k < 22; k++) spawnEnemy(null, k < 8);
  for (var f0 = 0; f0 < 50; f0++) spawnFood();

  openStory('prologue');
}

function stageRank(){
  var d = G.stageDmg;
  if (d === 0) return 'S';
  if (d <= 2) return 'A';
  if (d <= 5) return 'B';
  return 'C';
}

function completeStage(doneStage){
  if (G.mode !== 'play') return;
  var stDone = doneStage || G.stage;
  G.mode = 'cards';
  Audio2.card();
  var pool = CARDS.slice(), opts = [];
  for (var i = 0; i < 3 && pool.length; i++){
    opts.push(pool.splice(Math.floor(Math.random() * pool.length), 1)[0]);
  }
  var cur = G.p.size;
  var report = {
    rank: stageRank(),
    stage: stDone,
    from: G.stageStartSize,
    to: cur,
    grow: G.stageStartSize > 0 ? (cur / G.stageStartSize - 1) * 100 : 0,
    eaten: G.eatenStage,
    bites: G.stageBites || 0,
    dmg: G.stageDmg,
    combo: G.stageBestCombo || 0,
    evo: (G.stageEvo || []).slice(),
    sea: seaOf(stDone)
  };
  /* 战报取完数立刻翻篇：下一段从这一刻重新记账 */
  G.stageStartSize = G.p.size;
  G.stageDmg = 0; G.stageBites = 0; G.stageEvo = []; G.stageBestCombo = 0;
  showStagePanel(report, opts);
}

function pickCard(card){
  if (G.trans && !G.trans.fired) return;
  for (var i = 0; i < G.players.length; i++) card.apply(G.players[i]);
  Audio2.card();
  /* 没有航路图了：选完卡，原地下潜继续 */
  G.mode = 'play';
  hideAll();
}

function endRun(reason){
  if (G.mode === 'end') return;
  transTo(function(){ doEndRun(reason); });
}
function doEndRun(reason){
  G.mode = 'end';
  if (G.story && !G.story.ending) reason = '信号消失 · ' + reason;
  Audio2.over();
  showEndPanel(reason);
}

/* ============================================================
   下潜推进：深度就是难度，追赶者就是时钟
   ------------------------------------------------------------
   没有航路图、没有转场重载 —— 玩家往下游，深度过线就进入下一段。
   头顶的蓝鲸 / 污染云 / 岩浆锋面以略慢于玩家的速度持续下压，
   停着不动就会被追上；距离拉太远它会加速兜回来，永远保持压迫感。
   ============================================================ */
function buildZones(){
  /* 段界前 520px 处放一个「洋流小憩」据点；非 Boss 段随机放奇遇泡 */
  var zs = [];
  for (var s = 1; s < TOTAL_STAGES; s++){
    zs.push({ type:'rest', x: WORLD.w/2, y: s * STAGE_DEPTH - 520, done:false, t0: rand(0, TAU) });
  }
  for (var s2 = 1; s2 <= TOTAL_STAGES; s2++){
    if (BOSS_STAGES.indexOf(s2) >= 0) continue;
    if (Math.random() < 0.65)
      zs.push({ type:'event', x: rand(600, WORLD.w - 600), y: (s2 - 1) * STAGE_DEPTH + rand(900, 2000), done:false, t0: rand(0, TAU) });
  }
  return zs;
}

function updateDescent(dt){
  var p0 = alivePlayers()[0];
  if (!p0) return;

  /* ── 深度过线 → 下一段 ── */
  // The reef's exit stays closed until its guardian falls.
  const reefExit = 2 * STAGE_DEPTH;
  if (!G.reefCleared && G.stage >= 2) {
    for (const player of alivePlayers()) {
      if (player.y < reefExit - 56) continue;
      player.y = reefExit - 56;
      player.vy = Math.min(0, player.vy);
    }
  }
  const story = G.story;
  if (story.endless && p0.y > WORLD.h - 1500) WORLD.h += STAGE_DEPTH;
  const st = stageForY(p0.y);
  if (!story.seen.has('boat') && (p0.y < 180 || p0.y > 780)) { openStory('boat'); return; }
  if (st >= 3 && !story.seen.has('net')) { openStory('net'); return; }
  if (st >= 6 && !story.seen.has('ice')) { openStory('ice'); return; }
  if (st >= 7 && !story.seen.has('venom')) { openStory('venom'); return; }
  if (G.boss?.idx === 4 && st >= 11) {
    for (const player of alivePlayers()) {
      player.y = Math.min(player.y, 10 * STAGE_DEPTH - 56);
      player.vy = Math.min(player.vy, 0);
    }
    return;
  }
  if (st >= 11 && !story.seen.has('whale')) { openStory('whale'); return; }
  if (st > G.stage){
    var prevSea = seaIdxForStage(G.stage);
    if (st > G.stage && G.boss && (G.boss.idx === 1 || G.boss.idx === 3)
      && seaIdxForStage(st) > prevSea) {
      story.bypassed++;
      G.boss = null;
    }
    G.stage = st;
    var seaIdx = seaIdxForStage(st);
    if (seaIdx !== prevSea){
      var sN = SEAS[seaIdx];
      G.seaBanner = { name: sN.name, mech: sN.mech, tag: sN.tag, t: 3.8 };
      G.slowT = 0.5;
      Audio2.mutate();
      if (G.time >= story.radioUntil) tellRadio(transmissions[seaIdx]);
    } else {
      floater(p0.x, p0.y - 90, '第 ' + st + ' 段 · ' + depthM(p0.y) + 'm', '#7de8ff', true);
    }
    if (G.chase) G.chase.form = CHASE_FORMS[seaIdx];
    if (BOSS_STAGES.includes(st) && !G.boss && story.skipBossStage !== st && !story.endless){
      G.bossDelay = 1.1;      /* Boss 段：追赶者让位，Boss 登场 */
    } else if (!(prevSea === 0 && st === 3 && G.reefCleared)) {
      completeStage(st - 1);  /* 已领取守卫奖励的海域出口不重复结算 */
    }
  }

  /* ── Boss 延迟登场 ── */
  if (G.bossDelay > 0){
    G.bossDelay -= dt;
    if (G.bossDelay <= 0){
      /* 只在 Boss 段当场生效；玩家已经潜过这段了就作废 */
      if (!G.boss && G.mode === 'play' && BOSS_STAGES.indexOf(G.stage) >= 0) startBoss(false);
      G.bossDelay = 0;
    }
  }

  /* ── 追赶者 ── */
  var c = G.chase;
  if (c){
    c.hitT -= dt;
    /* Boss 战期间几乎冻结：Boss 是这一段的正式考题，别让它背后偷袭 */
    var base = G.boss ? 3 : (26 + G.stage * 5.5) * [0.8, 1, 1.3, 1.6][alertBand(story.alert)];
    var gap = p0.y - c.y;
    /* 橡皮筋：玩家下潜神速时会追回来，但永不反超；封顶避免从远处砸回来 */
    var spd = Math.min(420, base + (gap > 1800 ? (gap - 1800) * 0.35 : 0));
    c.y = Math.min(c.y + spd * dt, WORLD.h - 200);
    /* 追上：整条横向危险带，碰到就持续掉体型（走 hitPlayer 的无敌帧节奏） */
    var band = 130;
    for (var k = 0; k < G.players.length; k++){
      var pk = G.players[k];
      if (pk.dead) continue;
      if (pk.y - c.y < band){
        if (c.hitT <= 0){
          hitPlayer(pk, pk.x, c.y - 40, 0.85);   /* 击退方向朝下：被赶着往下跑 */
          c.hitT = 0.35;
        }
        pk.y = Math.max(pk.y, c.y - band * 0.4); /* 别让玩家嵌进带子里 */
      }
    }
  }

  /* ── 水下据点：休整 & 奇遇 ── */
  for (var z = 0; z < G.zones.length; z++){
    var zn = G.zones[z];
    if (zn.done) continue;
    if (dist(p0.x, p0.y, zn.x, zn.y) > 95) continue;
    zn.done = true;
    if (zn.type === 'rest'){
      for (var r = 0; r < G.players.length; r++){
        var pr = G.players[r];
        if (pr.dead) continue;
        pr.size = Math.min(pr.maxSize, pr.size * 1.15);
        pr.invuln = Math.max(pr.invuln, 1.5);
        floater(pr.x, pr.y - pr.size - 26, '+15% 体型 · 洋流小憩', '#8dffc8', true);
      }
      burst(zn.x, zn.y, '#8dffc8', 30, 300, 6);
      Audio2.revive();
    } else {
      showEventChoices();
    }
  }
}

/* ============================================================
   更新
   ============================================================ */
function update(dt){
  G.time += dt;
  G.stageT += dt;
  if (G.story?.toxicityUntil > G.time) {
    for (const player of alivePlayers()) player.size = Math.max(8, player.size * (1 - dt * .009));
  }

  /* 粒子硬上限：异常爆发时也不让渲染被拖死 */
  var pcap = LOWQ ? 260 : 520;
  if (G.particles.length > pcap) G.particles.splice(0, G.particles.length - pcap);

  for (var i = 0; i < G.players.length; i++) updatePlayer(G.players[i], dt);

  /* 时间凝滞：只慢敌人和 Boss，玩家一帧都不慢 —— 这才叫「你的时间」 */
  if (G.stasisT > 0) G.stasisT -= dt;
  var edt = dt * (G.stasisT > 0 ? 0.30 : 1);

  updateEnemies(edt);
  updateFoods(dt);
  updateItems(dt);
  updateHazards(dt);
  collisions(dt);
  eatFoods();
  collectItems();
  if (G.boss) updateBoss(edt);
  checkRevives();

  /* 诱饵浮标计时 */
  if (G.decoy){
    G.decoy.t -= dt;
    G.decoy.phase += dt * 3;
    if (G.decoy.t <= 0) G.decoy = null;
  }

  if (G.coop && !alivePlayers().length) { endRun('两人都被啃光了'); return; }

  G.spawnT -= dt;
  var maxE = Math.round((32 + G.stage * 2.4) * (G.coop ? 1.45 : 1));
  if (G.spawnT <= 0 && G.enemies.length < maxE){
    spawnEnemy();
    G.spawnT = Math.max(0.12, 0.52 - G.stage * 0.022);
  }

  if (G.foods.length < 70 && Math.random() < dt * 11) spawnFood();

  /* 宝箱鱼：一段最多同时存在一只，死了才会再刷 */
  /* 蓝鲸：只在深渊出现，一段最多一条，且不与宝箱鱼抢刷新 */
  if (G.stage >= 11 && !hasWhale() && Math.random() < dt * 0.035) spawnWhale();

  G.chestT -= dt;
  if (G.chestT <= 0){
    if (G.stage >= 2 && !hasChestFish()){ spawnChestFish(); G.chestT = rand(17, 27); }
    else G.chestT = 3;
  }

  updateDescent(dt);

  /* 镜头：跟随存活玩家的重心 */
  var alive = alivePlayers();
  var cx = cam.x, cy = cam.y, maxSize = 18, anyEye = false;
  if (alive.length){
    cx = 0; cy = 0;
    for (var a = 0; a < alive.length; a++){
      cx += alive[a].x; cy += alive[a].y;
      maxSize = Math.max(maxSize, alive[a].size);
      if (alive[a].eyeT > 0) anyEye = true;
    }
    cx /= alive.length; cy /= alive.length;
  }
  var zTarget = clamp(1.18 - maxSize * 0.0016, 0.62, 1.18) * camCtl.zoom * seaOf(G.stage).zoom * viewFit();
  if (anyEye) zTarget *= 1.22;
  if (G.coop) zTarget *= 0.88;   /* 双人拉远一点，两边都看得见 */
  cam.zoom = lerp(cam.zoom, zTarget, Math.min(1, dt * 2.2));

  var vw = W / cam.zoom, vh = H / cam.zoom;
  cam.x = lerp(cam.x, cx, Math.min(1, dt * 4));
  cam.y = lerp(cam.y, cy, Math.min(1, dt * 4));
  cam.x = vw >= WORLD.w ? WORLD.w/2 : clamp(cam.x, vw/2, WORLD.w - vw/2);
  cam.y = vh >= WORLD.h ? WORLD.h/2 : clamp(cam.y, vh/2, WORLD.h - vh/2);

  if (G.shake > 0) G.shake -= dt * 3.2;
  if (G.punch > 0) G.punch -= dt * 5;
  if (G.flashT > 0) G.flashT -= dt;
  for (var ri2 = G.rings.length - 1; ri2 >= 0; ri2--){
    var rg3 = G.rings[ri2];
    rg3.life -= dt;
    rg3.r += (rg3.max - rg3.r) * Math.min(1, dt * 11);
    if (rg3.life <= 0) G.rings.splice(ri2, 1);
  }

  for (var pi = G.particles.length - 1; pi >= 0; pi--){
    var q = G.particles[pi];
    q.life -= dt;
    if (q.life <= 0){ G.particles.splice(pi, 1); continue; }
    q.x += q.vx * dt; q.y += q.vy * dt;
    if (!q.proj){ q.vx *= 1 - dt * 2.2; q.vy *= 1 - dt * 2.2; }
  }
  for (var fi = G.floaters.length - 1; fi >= 0; fi--){
    var fl = G.floaters[fi];
    fl.life -= dt; fl.y -= dt * 52;
    if (fl.life <= 0) G.floaters.splice(fi, 1);
  }
  for (var zi = G.zaps.length - 1; zi >= 0; zi--){
    G.zaps[zi].life -= dt;
    if (G.zaps[zi].life <= 0) G.zaps.splice(zi, 1);
  }
  for (var ki = G.inks.length - 1; ki >= 0; ki--){
    var ink = G.inks[ki];
    ink.life -= dt; ink.r += dt * 26;
    if (ink.life <= 0) G.inks.splice(ki, 1);
  }
  if (G.shockwave){
    G.shockwave.r += dt * 900;
    if (G.shockwave.r > (G.shockwave.max || 300)) G.shockwave = null;
  }
  if (G.mutFlash){
    G.mutFlash.t -= dt;
    if (G.mutFlash.t <= 0) G.mutFlash = null;
  }
  if (G.bannerT > 0) G.bannerT -= dt;
  if (G.seaBanner && G.seaBanner.t > 0) G.seaBanner.t -= dt;
  if (G.mileBanner && G.mileBanner.t > 0) G.mileBanner.t -= dt;

  /* 体型里程碑：每跨过一个，世界对你的反应就变一次 */
  var maxS = 0;
  for (var ms2 = 0; ms2 < G.players.length; ms2++) maxS = Math.max(maxS, G.players[ms2].size);
  var ms = MILESTONES[G.mileIdx];
  while (ms && maxS >= ms.at){
    G.mileIdx++;
    G.mileBanner = { title: ms.title, sub: ms.sub, t: 3.4 };
    G.slowT = 0.5;
    burst(G.p.x, G.p.y, '#ffd166', 46, 420, 8);
    Audio2.mutate();
    ms = MILESTONES[G.mileIdx];
  }

  updateAmbient(dt);
}

function updateAmbient(dt){
  for (var i = 0; i < G.bubbles.length; i++){
    var b = G.bubbles[i];
    b.y -= b.spd * dt;
    b.wob += b.wobS * dt;
    b.x += Math.sin(b.wob) * 16 * dt;
    /* 深海柱太长，粒子只在镜头附近循环：飘出视野上方就绕到视野下方 */
    if (b.y < cam.y - H * 0.9){ b.y = cam.y + H * 0.9 + rand(0, 300); b.x = rand(0, WORLD.w); }
    if (b.x < -30) b.x = WORLD.w + 30;
    if (b.x > WORLD.w + 30) b.x = -30;
  }
  for (var j = 0; j < G.motes.length; j++){
    var m = G.motes[j];
    m.y -= m.spd * dt;
    m.wob += dt * 0.8;
    m.x += Math.sin(m.wob) * 9 * dt;
    if (m.y < cam.y - H * 0.9){ m.y = cam.y + H * 0.9 + rand(0, 300); m.x = rand(0, WORLD.w); }
  }
}

function showBanner(main, sub){
  G.banner = { main: main, sub: sub, t: 2.4 };
}

/* ============================================================
   渲染
   ============================================================ */
/* 两个十六进制色按 t 插值（背景渐变专用，机制色仍取整段） */
function mixHex(a, b, t){
  var pa = parseInt(a.slice(1), 16), pb = parseInt(b.slice(1), 16);
  var r = Math.round(((pa >> 16) & 255) + (((pb >> 16) & 255) - ((pa >> 16) & 255)) * t);
  var g = Math.round(((pa >> 8) & 255) + (((pb >> 8) & 255) - ((pa >> 8) & 255)) * t);
  var bl = Math.round((pa & 255) + ((pb & 255) - (pa & 255)) * t);
  return 'rgb(' + r + ',' + g + ',' + bl + ')';
}
/* 深度连续 → 调色板连续：跨过海域边界前 700px 开始渐变，
   色值按 1/8 步进取整，让渐变缓存仍能命中（不然每帧新建渐变对象） */
function stagePalette(){
  var y = G.p ? G.p.y : (G.stage - 1) * STAGE_DEPTH + 100;
  var st = stageForY(y);
  var a = seaOf(st), b = seaOf(st + 1);
  if (st >= TOTAL_STAGES || !b || a === b) return a;
  var t = clamp(1 - (st * STAGE_DEPTH - y) / 700, 0, 1);
  t = Math.round(t * 8) / 8;
  if (t <= 0) return a;
  return { name: a.name, mech: a.mech, tag: a.tag, mod: a.mod, zoom: a.zoom, accent: a.accent,
    top: mixHex(a.top, b.top, t), mid: mixHex(a.mid, b.mid, t), bot: mixHex(a.bot, b.bot, t) };
}

function drawBackground(){
  var pal = stagePalette();
  /* 主渐变：同一配色 + 同一高度下复用对象（换海域才重建） */
  var g = cgLin('bg|' + pal.top + pal.mid + pal.bot + '|' + H, 0, 0, 0, H,
    [[0, pal.top], [0.48, pal.mid], [1, pal.bot]]);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);

  /* 视差层：两层缓慢漂移的柔光斑，给纵深（低画质跳过） */
  if (!LOWQ){
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (var L = 0; L < 2; L++){
      var sp = 6 + L * 15, a = 0.015 - L * 0.007;
      for (var m = 0; m < 5; m++){
        var px = ((G.time * sp + m * 262 + L * 97) % (W + 340)) - 170;
        var py = H * (0.15 + m * 0.16 + L * 0.03) + Math.sin(G.time * 0.32 + m * 1.7 + L) * 24;
        ctx.beginPath();
        ctx.ellipse(px, py, 112 - L * 36, 70 - L * 24, 0, 0, TAU);
        ctx.fillStyle = rgba(pal.accent, a);
        ctx.fill();
      }
    }
    ctx.restore();
  }

  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (var i = 0; i < 7; i++){
    var sx = ((i * 271 + G.time * 9) % (W + 400)) - 200;
    var wdt = 70 + Math.sin(i) * 30;
    /* 光柱渐变只与宽度/颜色有关，坐标靠 transform 平移 —— 不再每帧新建 */
    var lg = cgLin('ray|' + i + '|' + pal.accent + '|' + Math.round(H), 0, 0, wdt, H,
      [[0, rgba(pal.accent, 0.032)], [1, rgba(pal.accent, 0)]]);
    ctx.save();
    ctx.translate(sx, 0);
    ctx.fillStyle = lg;
    ctx.beginPath();
    ctx.moveTo(0, 0); ctx.lineTo(wdt, 0);
    ctx.lineTo(wdt * 2.4, H); ctx.lineTo(wdt * 1.2, H);
    ctx.closePath(); ctx.fill();
    ctx.restore();
  }
  ctx.restore();
}

/* ============================================================
   追赶者绘制：蓝鲸口 / 污染云 / 岩浆锋面
   一整条横贯世界的危险带，从头顶缓慢压下来
   ============================================================ */
function drawChase(view){
  const chase = G.chase;
  if (chase && chase.y >= view.y - 60) drawPaperPursuit(ctx, view, chase.y + 16, chase.form, G.time);
}

/* ============================================================
   水下据点：洋流小憩（休整）与奇遇泡
   ============================================================ */
function drawZones(v){
  for (var i = 0; i < G.zones.length; i++){
    var z = G.zones[i];
    if (z.done || z.y < v.y - 130 || z.y > v.y + v.h + 130) continue;
    var col = z.type === 'rest' ? '#8dffc8' : '#c4b5fd';
    var pulse = 1 + Math.sin(G.time * 2.4 + z.t0) * 0.1;
    ctx.save();
    ctx.globalAlpha = 0.85;
    ctx.strokeStyle = rgba(col, 0.55);
    ctx.lineWidth = 3;
    ctx.setLineDash([10, 8]);
    ctx.beginPath(); ctx.arc(z.x, z.y, 86 * pulse, G.time * 0.5 + z.t0, G.time * 0.5 + z.t0 + TAU); ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = rgba(col, 0.10);
    ctx.beginPath(); ctx.arc(z.x, z.y, 86 * pulse, 0, TAU); ctx.fill();
    ctx.font = '26px sans-serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    drawPaperPickup(ctx, z.x, z.y, 16, col, z.type === 'rest' ? 'epic' : 'rare', G.time * .32);
    ctx.font = '11px "PingFang SC",system-ui,sans-serif';
    ctx.fillStyle = rgba(col, 0.9);
    ctx.fillText(z.type === 'rest' ? '洋流小憩' : '深海奇遇', z.x, z.y + 30);
    ctx.restore();
  }
}

/* ============================================================
   横幅：海域变更 / 体型里程碑 / 广播
   （v1.2 里这三类横幅只被赋值从未被绘制 —— 这里补齐）
   ============================================================ */
function drawBanners(){
  var b = G.seaBanner;
  if (b && b.t > 0){
    var a = clamp(b.t / 0.6, 0, 1) * clamp((3.8 - b.t) / 0.4 + 1, 0, 1);
    a = Math.min(a, 1);
    ctx.save();
    ctx.textAlign = 'center';
    ctx.globalAlpha = a;
    ctx.font = '600 ' + Math.round(Math.min(34, W * 0.055)) + 'px system-ui, sans-serif';
    ctx.fillStyle = 'rgba(183,243,255,0.96)';
    ctx.fillText(b.name, W / 2, H * 0.22);
    ctx.font = '13px "PingFang SC",system-ui,sans-serif';
    ctx.fillStyle = 'rgba(125,232,255,0.85)';
    ctx.fillText(b.tag, W / 2, H * 0.22 + 30);
    ctx.font = '12px "PingFang SC",system-ui,sans-serif';
    ctx.fillStyle = 'rgba(143,180,208,0.9)';
    ctx.fillText(b.mech, W / 2, H * 0.22 + 54);
    ctx.restore();
  }
  var mb = G.mileBanner;
  if (mb && mb.t > 0){
    var ma = Math.min(clamp(mb.t / 0.5, 0, 1), 1);
    ctx.save();
    ctx.globalAlpha = ma;
    ctx.textAlign = 'center';
    ctx.font = 'bold ' + Math.round(Math.min(26, W * 0.045)) + 'px "PingFang SC",system-ui,sans-serif';
    ctx.fillStyle = '#ffd166';
    ctx.fillText(mb.title, W / 2, H * 0.30);
    ctx.font = '12.5px "PingFang SC",system-ui,sans-serif';
    ctx.fillStyle = 'rgba(255,209,102,0.75)';
    ctx.fillText(mb.sub, W / 2, H * 0.30 + 26);
    ctx.restore();
  }
  var nb = G.banner;
  if (nb && nb.t > 0){
    var na = Math.min(clamp(nb.t / 0.4, 0, 1), 1);
    ctx.save();
    ctx.globalAlpha = na;
    ctx.textAlign = 'center';
    ctx.font = 'bold ' + Math.round(Math.min(22, W * 0.04)) + 'px "PingFang SC",system-ui,sans-serif';
    ctx.fillStyle = '#fda4af';
    ctx.fillText(nb.main, W / 2, H * 0.38);
    ctx.font = '12px "PingFang SC",system-ui,sans-serif';
    ctx.fillStyle = 'rgba(253,164,175,0.8)';
    ctx.fillText(nb.sub, W / 2, H * 0.38 + 24);
    ctx.restore();
  }
}

/* ============================================================
   右上角小地图：整根深海柱的纵览
   追赶者位置（红线）、你（白点）、海域分段、Boss 段标记
   ============================================================ */
function drawMinimap(y0){
  var bh = Math.min(220, H - y0 - (MOBILE ? 160 : 150));
  if (bh < 90) return;
  var bw = 14, bx = W - 30;

  /* 海域分段底色 */
  for (var i = 0; i < SEAS.length; i++){
    var sy = y0 + bh * (i * SEA_SPAN / TOTAL_STAGES);
    var sh = bh * (SEA_SPAN / TOTAL_STAGES);
    ctx.fillStyle = rgba(SEAS[i].mid, 0.45);
    ctx.fillRect(bx, sy, bw, sh);
  }
  /* 段界刻度 */
  ctx.fillStyle = 'rgba(255,255,255,0.35)';
  for (var s = 1; s < TOTAL_STAGES; s++){
    ctx.fillRect(bx - 3, y0 + bh * s / TOTAL_STAGES, bw + 6, 1);
  }
  /* Boss 段标记 */
  ctx.textAlign = 'center';
  ctx.font = '8px sans-serif';
  for (var b2 = 0; b2 < BOSS_STAGES.length; b2++){
    ctx.fillStyle = 'rgba(253,164,175,0.9)';
    ctx.fillText('☠', bx + bw / 2, y0 + bh * (BOSS_STAGES[b2] - 0.5) / TOTAL_STAGES + 3);
  }
  /* 深度标签：与右侧文字列对齐，避免和「蓝鲸%」打架 */
  ctx.font = '9.5px ui-monospace,monospace';
  ctx.textAlign = 'right';
  ctx.fillStyle = 'rgba(160,195,220,0.85)';
  ctx.fillText(depthM(G.p.y) + 'm', W - 22, y0 - 6);
  ctx.fillStyle = 'rgba(160,195,220,0.5)';
  ctx.fillText(depthM(WORLD.h) + 'm', W - 22, y0 + bh + 13);
  /* 外框 */
  ctx.strokeStyle = 'rgba(255,255,255,0.22)';
  ctx.lineWidth = 1;
  ctx.strokeRect(bx - 0.5, y0 - 0.5, bw + 1, bh + 1);

  /* 追赶者：红色横线（压下来就越低） */
  if (G.chase){
    var cf = clamp(G.chase.y / WORLD.h, 0, 1);
    var cy2 = y0 + bh * cf;
    var danger = (G.p.y - G.chase.y) < 420;
    ctx.fillStyle = danger ? '#fb7185' : 'rgba(251,113,133,0.75)';
    ctx.fillRect(bx - 6, cy2 - 1.5, bw + 12, 3);
  }
  /* 玩家：白色亮点 + 呼吸圈 */
  var pf = clamp(G.p.y / WORLD.h, 0, 1);
  var py2 = y0 + bh * pf;
  ctx.fillStyle = 'rgba(255,255,255,0.28)';
  ctx.beginPath(); ctx.arc(bx + bw / 2, py2, 6.5 + Math.sin(G.time * 4) * 1.5, 0, TAU); ctx.fill();
  ctx.fillStyle = '#ffffff';
  ctx.beginPath(); ctx.arc(bx + bw / 2, py2, 3.6, 0, TAU); ctx.fill();
}

/* ============================================================
   鱼体绘制：圆 + 二次曲线 + 分节尾
   ------------------------------------------------------------
   这套画法来自用户给的思路：以「头圆」为基准单位 R，
     身体 = 三点二次贝塞尔（上侧一条，镜像一条）
     鱼鳍 = 起点/控制点/终点三点曲线，镜像成一对
     尾巴 = 一串逐渐变小、逐渐偏转的圆，用四边形把相邻两圆缝起来
   好处是每个部件都能用「角度 + 长度」描述，于是整条鱼可以完全参数化，
   8 种主角鱼只要换一组数字就是不同的鱼，不用各写一套绘制函数。
   ============================================================ */
/* ============================================================
   鱼体绘制：圆 + 二次曲线 + 分节尾
   ------------------------------------------------------------
   这套画法来自用户给的思路：以「头圆」为基准单位 R，
     身体 = 三点二次贝塞尔（上侧一条，镜像一条）
     鱼鳍 = 起点/控制点/终点三点曲线，镜像成一对
     尾巴 = 一串逐渐变小、逐渐偏转的圆，用四边形把相邻两圆缝起来
   好处是每个部件都能用「角度 + 长度」描述，于是整条鱼可以完全参数化，
   8 种主角鱼只要换一组数字就是不同的鱼，不用各写一套绘制函数。

   实拍修正记录（第一版截图暴露的问题）：
     · 头圆单独填纯色 → 看起来像「球插在身体上」，改成沿身体长度方向取渐变
     · 尾巴太短太细 → 整条鱼读作「一团 + 一个小尖」，加长加粗尾节
     · 鱼鳍被身体盖住 → 只画尾、翅在身后，胸鳍改到身体之后画
     · 海马/蝠鲼直接套鱼体轮廓不像 → 各自单独处理尾卷与大翼
   ============================================================ */
/* ============================================================
   鱼体绘制：圆 + 二次曲线 + 分节尾
   ------------------------------------------------------------
   这套画法来自用户给的思路：以「头圆」为基准单位 R，
     身体 = 三点二次贝塞尔（上侧一条，镜像一条）
     鱼鳍 = 起点/控制点/终点三点曲线，镜像成一对
     尾巴 = 一串逐渐变小、逐渐偏转的圆，用四边形把相邻两圆缝起来
   于是整条鱼可以完全参数化，8 种主角鱼只要换一组数字就是不同的鱼。

   实拍修正记录：
     第 1 版：头圆填纯色 → 像「球插在身体上」；尾巴发白 → 用了光色填充
     第 2 版：头圆半径恒等于 R，细长鱼的头比身体还宽 → 仍然是球；尾仍偏白
     第 3 版：头圆改成独立倍率 hs（细长鱼 <1）；尾巴改用体色填充；
             所有鱼的身体加厚到与头圆匹配，细长鱼不再读作「棒子」
   ============================================================ */
var DEG = Math.PI / 180;
function polar(p, a, len){
  return { x: p.x + Math.cos(a) * len, y: p.y + Math.sin(a) * len };
}

var FISH_SPECS = {
  /* ---------- 敌方通用体型 ---------- */
  round:  { head:1.00, hs:1.00, headX:1.45, body:[[1.45,-1.00],[0.10,-1.62],[-1.55,-0.60]],
            fin:[-102,0.62,-74,1.95,-92,0.55],
            tail:[{r:0.60},{a:16,len:1.15,r:0.40},{a:14,len:0.95,r:0.16}] },

  puffer: { head:0.95, hs:0.96, headX:1.28, body:[[1.28,-1.08],[0.05,-1.86],[-1.28,-0.96]],
            fin:[-96,0.40,-78,0.85,-90,0.36],
            tail:[{r:0.50},{a:12,len:0.85,r:0.28},{a:12,len:0.70,r:0.12}],
            extra:'spike' },

  pred:   { head:0.92, hs:0.88, headX:1.62, body:[[1.62,-0.80],[0.10,-1.10],[-1.80,-0.48]],
            fin:[-110,0.58,-78,2.20,-92,0.52],
            tail:[{r:0.52},{a:24,len:1.45,r:0.34},{a:22,len:1.20,r:0.13}],
            extra:'dorsal' },

  dart:   { head:0.80, hs:0.84, headX:1.72, body:[[1.72,-0.62],[0.10,-0.88],[-1.95,-0.36]],
            fin:[-108,0.46,-82,1.45,-90,0.40],
            tail:[{r:0.42},{a:26,len:1.45,r:0.30},{a:24,len:1.20,r:0.11}] },

  eel:    { head:0.74, hs:0.72, headX:1.60, body:[[1.60,-0.56],[0.10,-0.74],[-2.10,-0.34]],
            fin:[-106,0.26,-86,0.70,-90,0.22],
            tail:[{r:0.38},{a:12,len:1.35,r:0.32},{a:11,len:1.30,r:0.24},
                  {a:10,len:1.15,r:0.16},{a:9,len:1.00,r:0.09}] },

  wing:   { head:0.86, hs:0.80, headX:1.35, body:[[1.35,-0.92],[0.10,-1.10],[-1.40,-0.50]],
            fin:[-112,0.70,-56,2.60,-86,0.62],
            tail:[{r:0.30},{a:8,len:1.70,r:0.15},{a:6,len:1.50,r:0.07}],
            extra:'wing' },

  /* ---------- 8 条主角鱼 ---------- */
  /* 蓝潮鲀：圆胖，长尾，均衡 */
  p_blue: { head:1.00, hs:0.98, headX:1.45, body:[[1.45,-1.04],[0.10,-1.64],[-1.55,-0.62]],
            fin:[-100,0.66,-72,2.10,-92,0.58],
            tail:[{r:0.62},{a:16,len:1.30,r:0.42},{a:14,len:1.05,r:0.18}] },

  /* 刺豚：更圆 + 一圈尖刺 */
  p_puffer: { head:0.95, hs:0.96, headX:1.26, body:[[1.26,-1.12],[0.05,-1.92],[-1.26,-1.00]],
              fin:[-94,0.38,-76,0.80,-90,0.34],
              tail:[{r:0.50},{a:12,len:0.92,r:0.30},{a:12,len:0.74,r:0.13}],
              extra:'spike' },

  /* 剑鱼：细长 + 长吻 + 高背鳍 + 深叉尾 */
  whale:  { head:0.60, hs:0.76, headX:1.58,
             body:[[1.58,-0.90],[-0.35,-1.10],[-3.05,-0.44]],
             fin:[-108,0.50,-78,1.40,-92,0.44],
             tail:[{r:0.30},{a:34,len:1.72,r:0.20},{a:30,len:1.48,r:0.07}] },
  p_sword: { head:0.80, hs:0.70, headX:1.78, body:[[1.78,-0.74],[0.10,-1.02],[-2.45,-0.38]],
             fin:[-116,0.60,-74,2.45,-88,0.54],
             tail:[{r:0.34},{a:28,len:1.55,r:0.22},{a:26,len:1.30,r:0.08}],
             extra:'bill' },

  /* 灯笼鮟鱇：大头大嘴 + 头顶发光竿 */
  p_lantern: { head:1.00, hs:1.12, headX:1.30, body:[[1.30,-0.92],[0.05,-1.42],[-1.38,-0.58]],
               fin:[-100,0.38,-80,0.80,-90,0.34],
               tail:[{r:0.48},{a:14,len:0.98,r:0.28},{a:12,len:0.80,r:0.12}],
               extra:'lure' },

  /* 沙丁鱼：细长，银蓝，深叉尾 */
  p_sardine: { head:0.74, hs:0.72, headX:1.62, body:[[1.62,-0.62],[0.10,-0.84],[-1.80,-0.32]],
               fin:[-108,0.38,-84,1.05,-90,0.32],
               tail:[{r:0.28},{a:30,len:1.40,r:0.20},{a:28,len:1.15,r:0.07}] },

  /* 电鳗：长条 + 沿身发光节点 */
  p_eel: { head:0.70, hs:0.66, headX:1.58, body:[[1.58,-0.56],[0.10,-0.72],[-2.35,-0.30]],
           fin:[-106,0.22,-88,0.55,-90,0.20],
           tail:[{r:0.34},{a:10,len:1.50,r:0.32},{a:9,len:1.42,r:0.26},
                 {a:8,len:1.26,r:0.18},{a:8,len:1.10,r:0.10}],
           extra:'node' },

  /* 海马：长吻 + 圆腹 + 卷尾 */
  p_seahorse: { head:0.88, hs:0.86, headX:1.52, body:[[1.52,-0.86],[0.05,-1.50],[-1.15,-1.10]],
                fin:[-96,0.26,-82,0.52,-90,0.22],
                tail:[{r:0.46},{a:30,len:0.55,r:0.34},{a:36,len:0.50,r:0.26}],
                extra:'seahorse' },

  /* 蝠鲼：宽翼 + 细长尾 */
  p_ray: { head:0.86, hs:0.72, headX:1.30, body:[[1.30,-0.86],[0.10,-1.02],[-1.45,-0.42]],
           fin:[-120,0.90,-44,2.60,-78,0.86],
           tail:[{r:0.24},{a:6,len:2.20,r:0.12},{a:5,len:1.95,r:0.05}],
           extra:'wing' }
};

function fishBodyPath(b1, b2, b3){
  ctx.beginPath();
  ctx.moveTo(b1.x, b1.y);
  ctx.quadraticCurveTo(b2.x, b2.y, b3.x, b3.y);
  ctx.lineTo(b3.x, -b3.y);
  ctx.quadraticCurveTo(b2.x, -b2.y, b1.x, -b1.y);
  ctx.closePath();
}


/* ============================================================
   物种矢量绘制 · 合并自「生物图鉴」
   ------------------------------------------------------------
   17 种鱼全部为侧视剖面、鱼头朝右、原点在身体中心的纯矢量画法。
   不预渲染位图：运行时内存增量 ≈ 0（仅共享一张 64px 辉光贴图），
   渐变对象在局部坐标系中创建，随 ctx.scale 适配任意体型不糊。
   ============================================================ */
var GLOW = {
  cyan:   '125,232,255',
  gold:   '255,209,102',
  purple: '192,132,252',
  orange: '255,142,83',
  teal:   '94,234,212',
  red:    '255,90,90',
  pink:   '244,114,182',
  ice:    '180,240,255'
};

var GLOW_SPRITE = (function(){
  var c = document.createElement('canvas');
  c.width = c.height = 64;
  var g = c.getContext('2d');
  var grd = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  grd.addColorStop(0.00, 'rgba(255,255,255,1)');
  grd.addColorStop(0.16, 'rgba(255,255,255,0.72)');
  grd.addColorStop(0.42, 'rgba(255,255,255,0.20)');
  grd.addColorStop(1.00, 'rgba(255,255,255,0)');
  g.fillStyle = grd;
  g.fillRect(0, 0, 64, 64);
  return c;
})();

/* 手机默认先关掉辉光精灵：真机掉帧比「好看 5%」值得先保 */
var LOWQ = MOBILE;
var PERF = { fps: 60, bad: 0, good: 0, acc: 0, frames: 0 };
function setLowQ(on){
  if (LOWQ === on) return;
  LOWQ = on;
  if (G.mode === 'play' && G.p){
    floater(cam.x, cam.y - 130, on ? '帧率吃紧 · 画质已自动下调' : '画质已恢复', '#7de8ff');
  }
}
function glowDot(x, y, r, rgb, a){
  if (a <= 0.012) return;
  var s = r * 6;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.globalAlpha = a;
  /* 低画质：省掉 64px 精灵叠加，只留实心光点 */
  if (!LOWQ) ctx.drawImage(GLOW_SPRITE, x - s, y - s, s * 2, s * 2);
  ctx.globalAlpha = a * 0.85;
  ctx.beginPath();
  ctx.arc(x, y, r * 0.9, 0, TAU);
  ctx.fillStyle = 'rgba(' + rgb + ',1)';
  ctx.fill();
  ctx.globalAlpha = a * 0.92;
  ctx.beginPath();
  ctx.arc(x, y, r * 0.45, 0, TAU);
  ctx.fillStyle = '#ffffff';
  ctx.fill();
  ctx.restore();
}

/* 3.1 蓝潮鲀 */
function drawBlue(ph, bob, t){
  const p = ph;

  ctx.save();
  ctx.translate(-62, 0);
  ctx.rotate(Math.sin(p) * 0.30);
  ctx.beginPath();
  ctx.moveTo(6, 0);
  ctx.quadraticCurveTo(-16, -16, -42, -36);
  ctx.quadraticCurveTo(-26, -12, -24, 0);
  ctx.quadraticCurveTo(-26, 12, -42, 36);
  ctx.quadraticCurveTo(-16, 16, 6, 0);
  ctx.closePath();
  const tg = ctx.createLinearGradient(-42, 0, 4, 0);
  tg.addColorStop(0, 'rgba(125,232,255,0.10)');
  tg.addColorStop(0.6, 'rgba(80,180,230,0.55)');
  tg.addColorStop(1, 'rgba(40,130,190,0.88)');
  ctx.fillStyle = tg;
  ctx.fill();
  ctx.restore();

  ctx.beginPath();
  ctx.moveTo(16, -50);
  ctx.quadraticCurveTo(-8, -82, -38, -48);
  ctx.quadraticCurveTo(-10, -56, 16, -50);
  ctx.closePath();
  const dg = ctx.createLinearGradient(0, -80, 0, -48);
  dg.addColorStop(0, 'rgba(125,232,255,0.35)');
  dg.addColorStop(1, 'rgba(30,110,170,0.75)');
  ctx.fillStyle = dg;
  ctx.fill();

  ctx.beginPath();
  ctx.moveTo(12, 48);
  ctx.quadraticCurveTo(-10, 74, -34, 46);
  ctx.quadraticCurveTo(-8, 52, 12, 48);
  ctx.closePath();
  ctx.fillStyle = 'rgba(30,110,170,0.62)';
  ctx.fill();

  const bodyPath = () => {
    ctx.beginPath();
    ctx.moveTo(80, -2);
    ctx.bezierCurveTo(72, -40, 22, -58, -28, -50);
    ctx.bezierCurveTo(-52, -44, -62, -22, -64, 0);
    ctx.bezierCurveTo(-62, 22, -52, 44, -28, 50);
    ctx.bezierCurveTo(22, 58, 72, 40, 80, -2);
    ctx.closePath();
  };
  bodyPath();
  const bg = ctx.createLinearGradient(0, -58, 0, 58);
  bg.addColorStop(0.00, '#b9f5ff');
  bg.addColorStop(0.28, '#5ed8ff');
  bg.addColorStop(0.58, '#1d7fc4');
  bg.addColorStop(0.85, '#0a3a63');
  bg.addColorStop(1.00, '#051f38');
  ctx.fillStyle = bg;
  ctx.fill();

  ctx.save();
  bodyPath();
  ctx.clip();
  const hl = ctx.createLinearGradient(0, -52, 0, 0);
  hl.addColorStop(0, 'rgba(230,252,255,0.55)');
  hl.addColorStop(1, 'rgba(230,252,255,0)');
  ctx.beginPath();
  ctx.ellipse(6, -34, 46, 16, -0.05, 0, TAU);
  ctx.fillStyle = hl;
  ctx.fill();
  ctx.restore();

  ctx.beginPath();
  ctx.moveTo(40, -38);
  ctx.quadraticCurveTo(34, 0, 38, 34);
  ctx.strokeStyle = 'rgba(6,30,52,0.35)';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  ctx.save();
  ctx.translate(12, 14);
  ctx.rotate(0.4 + Math.sin(p * 1.2) * 0.35);
  ctx.beginPath();
  ctx.ellipse(0, 0, 16, 8, 0, 0, TAU);
  const pg = ctx.createLinearGradient(-16, 0, 16, 0);
  pg.addColorStop(0, 'rgba(125,232,255,0.15)');
  pg.addColorStop(1, 'rgba(60,150,210,0.85)');
  ctx.fillStyle = pg;
  ctx.fill();
  ctx.restore();

  ctx.beginPath(); ctx.arc(50, -14, 10, 0, TAU);
  ctx.fillStyle = '#0a1a2a'; ctx.fill();
  ctx.beginPath(); ctx.arc(50, -14, 7, 0, TAU);
  ctx.fillStyle = '#1b6ea8'; ctx.fill();
  ctx.beginPath(); ctx.arc(50, -14, 4, 0, TAU);
  ctx.fillStyle = '#06121e'; ctx.fill();
  ctx.beginPath(); ctx.arc(53, -18, 2.6, 0, TAU);
  ctx.fillStyle = 'rgba(235,252,255,0.95)'; ctx.fill();

  ctx.beginPath();
  ctx.moveTo(76, 4);
  ctx.quadraticCurveTo(66, 10, 58, 6);
  ctx.strokeStyle = 'rgba(6,30,52,0.6)';
  ctx.lineWidth = 2;
  ctx.lineCap = 'round';
  ctx.stroke();

  for (let i = 0; i < 4; i++){
    const fl = 0.35 + 0.35 * Math.sin(t * 2 + i * 1.4 + bob);
    glowDot(-20 + i * 18, 40 - i * 2, 1.6, GLOW.cyan, fl);
  }
}

/* 3.2 刺豚 */
function drawPuffer(ph, bob, t){
  const inflate = 1 + Math.sin(t * 1.5 + bob) * 0.05;

  for (let i = 0; i < 26; i++){
    const a = i / 26 * TAU;
    const r = 52 * inflate;
    const len = 13 + Math.sin(a * 4) * 4;
    const x1 = Math.cos(a) * r,             y1 = Math.sin(a) * r * 0.94;
    const x2 = Math.cos(a) * (r + len),     y2 = Math.sin(a) * (r + len) * 0.94;
    const x3 = Math.cos(a + 0.11) * r,      y3 = Math.sin(a + 0.11) * r * 0.94;
    ctx.beginPath();
    ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.lineTo(x3, y3);
    ctx.closePath();
    ctx.fillStyle = 'rgba(255,170,90,0.60)';
    ctx.fill();
  }

  ctx.beginPath();
  ctx.ellipse(0, 0, 54 * inflate, 50 * inflate, 0, 0, TAU);
  const g = ctx.createRadialGradient(-16, -20, 6, 0, 0, 66 * inflate);
  g.addColorStop(0.00, '#fff0b8');
  g.addColorStop(0.35, '#ffc247');
  g.addColorStop(0.72, '#e8801f');
  g.addColorStop(1.00, '#8a3f08');
  ctx.fillStyle = g;
  ctx.fill();

  ctx.save();
  ctx.beginPath();
  ctx.ellipse(0, 0, 54 * inflate, 50 * inflate, 0, 0, TAU);
  ctx.clip();
  ctx.fillStyle = 'rgba(255,245,215,0.35)';
  ctx.beginPath();
  ctx.ellipse(4, 26, 40, 18, 0, 0, TAU);
  ctx.fill();
  ctx.restore();

  ctx.fillStyle = 'rgba(160,70,10,0.28)';
  for (let i = 0; i < 12; i++){
    const a = i * 2.1;
    ctx.beginPath();
    ctx.arc(Math.cos(a) * 26, Math.sin(a * 1.6) * 22, 2.2, 0, TAU);
    ctx.fill();
  }

  ctx.beginPath();
  ctx.ellipse(52 * inflate, 6, 8, 5, 0.2, 0, TAU);
  ctx.fillStyle = '#c95f14'; ctx.fill();
  ctx.beginPath();
  ctx.ellipse(52 * inflate, 6, 5, 2.6, 0.2, 0, TAU);
  ctx.fillStyle = '#5a2205'; ctx.fill();

  ctx.save();
  ctx.translate(6, 24);
  ctx.rotate(0.5 + Math.sin(t * 9 + bob) * 0.5);
  ctx.beginPath();
  ctx.ellipse(0, 0, 12, 6, 0, 0, TAU);
  ctx.fillStyle = 'rgba(255,190,100,0.88)';
  ctx.fill();
  ctx.restore();

  ctx.beginPath(); ctx.arc(28, -20, 8, 0, TAU);
  ctx.fillStyle = '#201005'; ctx.fill();
  ctx.beginPath(); ctx.arc(30, -22, 2.6, 0, TAU);
  ctx.fillStyle = 'rgba(255,250,230,0.95)'; ctx.fill();
}

/* 3.3 剑鱼 */
function drawSword(ph, bob, t){
  const p = ph;

  ctx.save();
  ctx.translate(-72, 0);
  ctx.rotate(Math.sin(p) * 0.25);
  ctx.beginPath();
  ctx.moveTo(6, 0);
  ctx.quadraticCurveTo(-12, -26, -30, -38);
  ctx.quadraticCurveTo(-18, -14, -16, 0);
  ctx.quadraticCurveTo(-18, 14, -30, 38);
  ctx.quadraticCurveTo(-12, 26, 6, 0);
  ctx.closePath();
  ctx.fillStyle = 'rgba(70,150,200,0.82)';
  ctx.fill();
  ctx.restore();

  const bodyPath = () => {
    ctx.beginPath();
    ctx.moveTo(70, -4);
    ctx.bezierCurveTo(56, -22, 24, -32, -4, -28);
    ctx.bezierCurveTo(-34, -24, -58, -12, -72, -2);
    ctx.bezierCurveTo(-58, 10, -34, 22, -4, 24);
    ctx.bezierCurveTo(24, 26, 56, 14, 70, -4);
    ctx.closePath();
  };
  bodyPath();
  const bg = ctx.createLinearGradient(0, -30, 0, 26);
  bg.addColorStop(0.00, '#e0f8ff');
  bg.addColorStop(0.35, '#8ecbe8');
  bg.addColorStop(0.62, '#3b8cbb');
  bg.addColorStop(1.00, '#0a2c48');
  ctx.fillStyle = bg;
  ctx.fill();

  ctx.beginPath();
  ctx.moveTo(66, -11);
  ctx.quadraticCurveTo(116, -17, 158, -9);
  ctx.quadraticCurveTo(116, -2, 66, 1);
  ctx.closePath();
  const sg = ctx.createLinearGradient(66, -12, 158, -4);
  sg.addColorStop(0, '#c8e8f8');
  sg.addColorStop(1, '#f4fdff');
  ctx.fillStyle = sg;
  ctx.fill();

  ctx.beginPath();
  ctx.moveTo(8, -28);
  ctx.quadraticCurveTo(-16, -68, -48, -26);
  ctx.quadraticCurveTo(-18, -34, 8, -28);
  ctx.closePath();
  const fg = ctx.createLinearGradient(0, -66, 0, -26);
  fg.addColorStop(0, 'rgba(150,220,250,0.55)');
  fg.addColorStop(1, 'rgba(40,120,170,0.85)');
  ctx.fillStyle = fg;
  ctx.fill();

  ctx.save();
  bodyPath();
  ctx.clip();
  const hl = ctx.createLinearGradient(0, -20, 0, 4);
  hl.addColorStop(0, 'rgba(255,255,255,0.6)');
  hl.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.beginPath();
  ctx.ellipse(0, -14, 60, 10, 0, 0, TAU);
  ctx.fillStyle = hl;
  ctx.fill();
  ctx.restore();

  ctx.beginPath(); ctx.arc(48, -8, 5, 0, TAU);
  ctx.fillStyle = '#061624'; ctx.fill();
  ctx.beginPath(); ctx.arc(49.5, -9.5, 1.8, 0, TAU);
  ctx.fillStyle = 'rgba(220,248,255,0.95)'; ctx.fill();

  ctx.beginPath();
  ctx.moveTo(18, 8);
  ctx.quadraticCurveTo(6, 26, -6, 22);
  ctx.quadraticCurveTo(4, 12, 8, 6);
  ctx.closePath();
  ctx.fillStyle = 'rgba(60,150,200,0.7)';
  ctx.fill();
}

/* 3.4 灯笼鮟鱇 */
function drawLantern(ph, bob, t){
  const p = ph;

  ctx.save();
  ctx.translate(-42, 4);
  ctx.rotate(Math.sin(p) * 0.35);
  ctx.beginPath();
  ctx.moveTo(4, 0);
  ctx.quadraticCurveTo(-10, -14, -22, -20);
  ctx.quadraticCurveTo(-14, -6, -13, 0);
  ctx.quadraticCurveTo(-14, 8, -22, 16);
  ctx.quadraticCurveTo(-8, 10, 4, 0);
  ctx.closePath();
  ctx.fillStyle = 'rgba(120,90,40,0.72)';
  ctx.fill();
  ctx.restore();

  const bodyPath = () => {
    ctx.beginPath();
    ctx.moveTo(46, -4);
    ctx.bezierCurveTo(42, -40, 8, -54, -24, -42);
    ctx.bezierCurveTo(-50, -32, -56, 4, -42, 26);
    ctx.bezierCurveTo(-20, 48, 32, 42, 46, 10);
    ctx.closePath();
  };
  bodyPath();
  const g = ctx.createRadialGradient(8, -16, 6, 0, 4, 64);
  g.addColorStop(0.00, '#a07c38');
  g.addColorStop(0.45, '#4e3516');
  g.addColorStop(1.00, '#181005');
  ctx.fillStyle = g;
  ctx.fill();

  ctx.save();
  bodyPath();
  ctx.clip();
  ctx.fillStyle = 'rgba(255,209,102,0.10)';
  for (let i = 0; i < 16; i++){
    const a = i * 2.1;
    ctx.beginPath();
    ctx.arc(Math.cos(a) * 30 + 2, Math.sin(a * 1.5) * 28 + 2, 3 + (i % 3), 0, TAU);
    ctx.fill();
  }
  ctx.restore();

  ctx.beginPath();
  ctx.moveTo(46, 0);
  ctx.quadraticCurveTo(30, -4, 20, -10);
  ctx.lineTo(20, 22);
  ctx.quadraticCurveTo(32, 18, 46, 10);
  ctx.closePath();
  ctx.fillStyle = '#0e0a05';
  ctx.fill();

  ctx.fillStyle = 'rgba(245,238,220,0.92)';
  for (let i = 0; i < 4; i++){
    const x = 42 - i * 5, y = -2 - i * 2.2;
    ctx.beginPath();
    ctx.moveTo(x, y); ctx.lineTo(x - 3, y + 1.5); ctx.lineTo(x - 1, y + 7);
    ctx.closePath(); ctx.fill();
  }
  for (let i = 0; i < 4; i++){
    const x = 42 - i * 5, y = 7 + i * 2.6;
    ctx.beginPath();
    ctx.moveTo(x, y); ctx.lineTo(x - 3, y - 1.5); ctx.lineTo(x - 1, y - 7);
    ctx.closePath(); ctx.fill();
  }

  ctx.beginPath(); ctx.arc(26, -18, 5, 0, TAU);
  ctx.fillStyle = '#0a0704'; ctx.fill();
  ctx.beginPath(); ctx.arc(27.5, -19.5, 1.6, 0, TAU);
  ctx.fillStyle = 'rgba(255,220,150,0.9)'; ctx.fill();

  const sway = Math.sin(t * 1.2 + bob) * 7;
  ctx.beginPath();
  ctx.moveTo(8, -44);
  ctx.bezierCurveTo(18, -72, 38, -84, 58 + sway, -78 + sway * 0.3);
  ctx.strokeStyle = 'rgba(190,160,100,0.75)';
  ctx.lineWidth = 3;
  ctx.lineCap = 'round';
  ctx.stroke();

  const pulse = 0.75 + 0.25 * Math.sin(t * 3 + bob * 2);
  glowDot(58 + sway, -78 + sway * 0.3, 5.5, GLOW.gold, pulse);
}

/* 3.5 沙丁鱼 */
function drawSardine(ph, bob, t){
  const p = ph;

  ctx.save();
  ctx.translate(-58, 0);
  ctx.rotate(Math.sin(p) * 0.5);
  ctx.beginPath();
  ctx.moveTo(4, 0);
  ctx.quadraticCurveTo(-8, -8, -22, -26);
  ctx.quadraticCurveTo(-12, -8, -10, 0);
  ctx.quadraticCurveTo(-12, 8, -22, 26);
  ctx.quadraticCurveTo(-8, 8, 4, 0);
  ctx.closePath();
  ctx.fillStyle = 'rgba(160,200,225,0.78)';
  ctx.fill();
  ctx.restore();

  ctx.beginPath();
  ctx.moveTo(64, 0);
  ctx.bezierCurveTo(48, -16, 8, -22, -34, -10);
  ctx.bezierCurveTo(-52, -5, -60, -2, -62, 0);
  ctx.bezierCurveTo(-60, 2, -52, 5, -34, 10);
  ctx.bezierCurveTo(8, 22, 48, 16, 64, 0);
  ctx.closePath();
  const g = ctx.createLinearGradient(0, -22, 0, 22);
  g.addColorStop(0.00, '#4c7d9e');
  g.addColorStop(0.35, '#a8cfe4');
  g.addColorStop(0.60, '#e6f4fb');
  g.addColorStop(1.00, '#c2dced');
  ctx.fillStyle = g;
  ctx.fill();

  ctx.beginPath();
  ctx.moveTo(54, -3);
  ctx.quadraticCurveTo(10, -6, -46, -2);
  ctx.strokeStyle = 'rgba(255,255,255,0.6)';
  ctx.lineWidth = 1.2;
  ctx.stroke();

  ctx.beginPath(); ctx.arc(46, -3, 3.2, 0, TAU);
  ctx.fillStyle = '#08192a'; ctx.fill();
  ctx.beginPath(); ctx.arc(47, -4, 1.1, 0, TAU);
  ctx.fillStyle = 'rgba(230,248,255,0.95)'; ctx.fill();
}

/* 3.6 电鳗 */
function drawEel(ph, bob, t){
  const p = ph;
  const N = 26;
  const pts = [];
  for (let i = 0; i <= N; i++){
    const u = i / N;
    const x = 86 - u * 184;
    const y = Math.sin(p - u * 4.6) * (1 + u * 18);
    const w = 13 * Math.pow(1 - u, 0.5) + 1.2;
    pts.push({ x: x, y: y, w: w });
  }

  ctx.beginPath();
  ctx.moveTo(pts[0].x, pts[0].y - pts[0].w);
  for (let i = 1; i <= N; i++) ctx.lineTo(pts[i].x, pts[i].y - pts[i].w - 4);
  for (let i = N; i >= 0; i--) ctx.lineTo(pts[i].x, pts[i].y - pts[i].w);
  ctx.closePath();
  ctx.fillStyle = 'rgba(160,120,230,0.35)';
  ctx.fill();

  ctx.beginPath();
  ctx.moveTo(pts[0].x, pts[0].y - pts[0].w);
  for (let i = 1; i <= N; i++) ctx.lineTo(pts[i].x, pts[i].y - pts[i].w);
  for (let i = N; i >= 0; i--) ctx.lineTo(pts[i].x, pts[i].y + pts[i].w);
  ctx.closePath();
  const g = ctx.createLinearGradient(0, -14, 0, 14);
  g.addColorStop(0.00, '#d4b8ff');
  g.addColorStop(0.40, '#8b5cf6');
  g.addColorStop(1.00, '#2e1065');
  ctx.fillStyle = g;
  ctx.fill();

  ctx.beginPath();
  ctx.ellipse(pts[0].x - 4, pts[0].y, 20, 13, 0, 0, TAU);
  const hg = ctx.createRadialGradient(pts[0].x, pts[0].y - 4, 2, pts[0].x, pts[0].y, 22);
  hg.addColorStop(0, '#c4a8ff');
  hg.addColorStop(1, '#4c2a8a');
  ctx.fillStyle = hg;
  ctx.fill();

  ctx.beginPath(); ctx.arc(pts[0].x + 8, pts[0].y - 4, 3, 0, TAU);
  ctx.fillStyle = '#0a0518'; ctx.fill();
  ctx.beginPath(); ctx.arc(pts[0].x + 9, pts[0].y - 5, 1, 0, TAU);
  ctx.fillStyle = 'rgba(230,220,255,0.95)'; ctx.fill();

  for (let i = 4; i < N - 2; i += 3){
    const pt = pts[i];
    const fl = 0.5 + 0.5 * Math.sin(t * 3 + i * 0.9 + bob);
    glowDot(pt.x, pt.y, 1.6, GLOW.purple, fl * 0.85);
  }
}

/* 3.7 海马 */
function drawSeahorse(ph, bob, t){
  const fin = Math.sin(t * 13 + bob);

  ctx.save();
  ctx.translate(-12, -10);
  ctx.rotate(fin * 0.4);
  ctx.beginPath();
  ctx.ellipse(0, 0, 6, 16, 0.2, 0, TAU);
  ctx.fillStyle = 'rgba(94,234,212,0.55)';
  ctx.fill();
  ctx.restore();

  ctx.beginPath();
  ctx.moveTo(10, -58);
  ctx.bezierCurveTo(26, -28, 24, 8, 8, 30);
  ctx.bezierCurveTo(-2, 44, -12, 44, -14, 32);
  ctx.strokeStyle = '#1f8a76';
  ctx.lineWidth = 24;
  ctx.lineCap = 'round';
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(10, -58);
  ctx.bezierCurveTo(26, -28, 24, 8, 8, 30);
  ctx.bezierCurveTo(-2, 44, -12, 44, -14, 32);
  ctx.strokeStyle = '#3fbfa8';
  ctx.lineWidth = 17;
  ctx.lineCap = 'round';
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(-8, 30, 9, 0.4, TAU * 0.9);
  ctx.strokeStyle = '#2f9e8a';
  ctx.lineWidth = 9;
  ctx.lineCap = 'round';
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(20, -58);
  ctx.lineTo(48, -64);
  ctx.strokeStyle = '#3fbfa8';
  ctx.lineWidth = 9;
  ctx.lineCap = 'round';
  ctx.stroke();
  ctx.beginPath(); ctx.arc(48, -64, 3.5, 0, TAU);
  ctx.fillStyle = '#1f8a76'; ctx.fill();

  ctx.beginPath();
  ctx.ellipse(14, -62, 14, 12, -0.2, 0, TAU);
  const hg = ctx.createRadialGradient(10, -66, 2, 14, -62, 16);
  hg.addColorStop(0, '#a8f5e8');
  hg.addColorStop(1, '#1f8a76');
  ctx.fillStyle = hg;
  ctx.fill();

  ctx.beginPath(); ctx.arc(20, -62, 3.6, 0, TAU);
  ctx.fillStyle = '#062a22'; ctx.fill();
  ctx.beginPath(); ctx.arc(21, -63, 1.2, 0, TAU);
  ctx.fillStyle = 'rgba(220,255,248,0.95)'; ctx.fill();

  ctx.save();
  ctx.translate(20, -30);
  ctx.rotate(fin * 0.6);
  ctx.beginPath();
  ctx.ellipse(0, 0, 5, 9, 0.3, 0, TAU);
  ctx.fillStyle = 'rgba(94,234,212,0.6)';
  ctx.fill();
  ctx.restore();

  glowDot(-6, -40, 1.4, GLOW.teal, 0.4 + 0.3 * Math.sin(t * 2 + bob));
  glowDot(10, -14, 1.4, GLOW.teal, 0.4 + 0.3 * Math.sin(t * 2 + 2 + bob));
}

/* 3.8 蝠鲼 */
function drawRay(ph, bob, t){
  const p = ph;
  const flap = Math.sin(p) * 20;

  ctx.beginPath();
  ctx.moveTo(-42, 0);
  ctx.quadraticCurveTo(-72, -3 + Math.sin(p * 0.8) * 6, -110, 2);
  ctx.strokeStyle = 'rgba(45,120,105,0.75)';
  ctx.lineWidth = 2.5;
  ctx.lineCap = 'round';
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(54, 0);
  ctx.bezierCurveTo(30, -12, 8, -16, -8, -14 - flap);
  ctx.bezierCurveTo(-28, -12 - flap * 1.2, -40, -3, -44, 0);
  ctx.bezierCurveTo(-40, 3, -28, 12 + flap * 1.2, -8, 14 + flap);
  ctx.bezierCurveTo(8, 16, 30, 12, 54, 0);
  ctx.closePath();
  const g = ctx.createLinearGradient(0, -36, 0, 36);
  g.addColorStop(0.00, '#5eead4');
  g.addColorStop(0.45, '#0f766e');
  g.addColorStop(1.00, '#062a26');
  ctx.fillStyle = g;
  ctx.fill();

  ctx.beginPath();
  ctx.ellipse(44, 0, 14, 9, 0, 0, TAU);
  ctx.fillStyle = '#0d5a52';
  ctx.fill();

  ctx.beginPath();
  ctx.moveTo(52, -3);
  ctx.quadraticCurveTo(60, -8, 64, -3);
  ctx.quadraticCurveTo(58, 0, 52, 1);
  ctx.closePath();
  ctx.fillStyle = '#1a8a7e';
  ctx.fill();

  ctx.beginPath(); ctx.arc(46, -4, 2.4, 0, TAU);
  ctx.fillStyle = '#03130f'; ctx.fill();
  ctx.beginPath(); ctx.arc(46, 4, 2.4, 0, TAU);
  ctx.fillStyle = '#03130f'; ctx.fill();

  ctx.strokeStyle = 'rgba(180,255,240,0.18)';
  ctx.lineWidth = 1.2;
  for (let i = 0; i < 4; i++){
    ctx.beginPath();
    ctx.moveTo(10, -4 - i * 2);
    ctx.quadraticCurveTo(-16, -6 - i * 3 - flap * 0.5, -36 + i * 4, -2 - i);
    ctx.stroke();
  }
}

/* 3.9 圆润鲀 */
function drawRound(ph, bob, t){
  const p = ph;

  ctx.save();
  ctx.translate(-32, 0);
  ctx.rotate(Math.sin(p) * 0.5);
  ctx.beginPath();
  ctx.moveTo(3, 0);
  ctx.quadraticCurveTo(-8, -6, -16, -14);
  ctx.quadraticCurveTo(-10, -3, -10, 0);
  ctx.quadraticCurveTo(-10, 3, -16, 14);
  ctx.quadraticCurveTo(-8, 6, 3, 0);
  ctx.closePath();
  ctx.fillStyle = 'rgba(200,230,240,0.72)';
  ctx.fill();
  ctx.restore();

  ctx.beginPath();
  ctx.ellipse(0, 0, 34, 29, 0, 0, TAU);
  const g = ctx.createRadialGradient(-8, -10, 4, 0, 0, 40);
  g.addColorStop(0.00, '#f0fbff');
  g.addColorStop(0.50, '#c9e8f0');
  g.addColorStop(1.00, '#6a9eb0');
  ctx.fillStyle = g;
  ctx.fill();

  ctx.beginPath();
  ctx.moveTo(4, -27);
  ctx.quadraticCurveTo(-6, -42, -18, -26);
  ctx.quadraticCurveTo(-6, -30, 4, -27);
  ctx.closePath();
  ctx.fillStyle = 'rgba(200,235,245,0.72)';
  ctx.fill();

  ctx.beginPath(); ctx.arc(16, -6, 8, 0, TAU);
  ctx.fillStyle = '#ffffff'; ctx.fill();
  ctx.beginPath(); ctx.arc(17, -6, 5.5, 0, TAU);
  ctx.fillStyle = '#1a3a4a'; ctx.fill();
  ctx.beginPath(); ctx.arc(18.5, -8, 2, 0, TAU);
  ctx.fillStyle = 'rgba(255,255,255,0.95)'; ctx.fill();

  ctx.beginPath();
  ctx.moveTo(34, 4);
  ctx.quadraticCurveTo(28, 8, 24, 5);
  ctx.strokeStyle = 'rgba(50,90,110,0.5)';
  ctx.lineWidth = 1.5;
  ctx.stroke();
}

/* 3.10 翻车鱼 */
function drawSunfish(ph, bob, t){
  const p = ph;
  const wob = Math.sin(p * 0.7) * 4;

  ctx.beginPath();
  ctx.moveTo(-6, -68 + wob);
  ctx.quadraticCurveTo(-30, -104 + wob, -46, -60 + wob);
  ctx.quadraticCurveTo(-24, -70 + wob, -6, -68 + wob);
  ctx.closePath();
  ctx.fillStyle = 'rgba(90,110,90,0.88)';
  ctx.fill();

  ctx.beginPath();
  ctx.moveTo(-6, 68 + wob);
  ctx.quadraticCurveTo(-30, 104 + wob, -46, 60 + wob);
  ctx.quadraticCurveTo(-24, 70 + wob, -6, 68 + wob);
  ctx.closePath();
  ctx.fillStyle = 'rgba(90,110,90,0.88)';
  ctx.fill();

  const bodyPath = () => {
    ctx.beginPath();
    ctx.ellipse(0, 0, 60, 76, 0, 0, TAU);
  };
  bodyPath();
  const g = ctx.createLinearGradient(0, -76, 0, 76);
  g.addColorStop(0.00, '#9aa89a');
  g.addColorStop(0.45, '#6a7a6a');
  g.addColorStop(1.00, '#3a4a3a');
  ctx.fillStyle = g;
  ctx.fill();

  ctx.save();
  bodyPath();
  ctx.clip();
  ctx.fillStyle = 'rgba(200,220,200,0.12)';
  for (let i = 0; i < 10; i++){
    ctx.beginPath();
    ctx.arc(-20 + (i % 4) * 16, -40 + (i * 13) % 90, 5 + (i % 3) * 2, 0, TAU);
    ctx.fill();
  }
  ctx.restore();

  ctx.beginPath();
  ctx.moveTo(-58, -14);
  ctx.quadraticCurveTo(-78, 0, -58, 14);
  ctx.quadraticCurveTo(-66, 0, -58, -14);
  ctx.closePath();
  ctx.fillStyle = 'rgba(70,90,70,0.9)';
  ctx.fill();

  ctx.beginPath(); ctx.arc(36, -8, 6, 0, TAU);
  ctx.fillStyle = '#101810'; ctx.fill();
  ctx.beginPath(); ctx.arc(38, -10, 2, 0, TAU);
  ctx.fillStyle = 'rgba(220,240,220,0.9)'; ctx.fill();

  ctx.beginPath();
  ctx.moveTo(58, 6);
  ctx.quadraticCurveTo(50, 12, 44, 8);
  ctx.strokeStyle = 'rgba(30,45,30,0.6)';
  ctx.lineWidth = 2;
  ctx.stroke();
}

/* 3.11 猎影鲨 */
function drawShark(ph, bob, t){
  const p = ph;

  ctx.save();
  ctx.translate(-64, 0);
  ctx.rotate(Math.sin(p) * 0.22);
  ctx.beginPath();
  ctx.moveTo(8, 0);
  ctx.quadraticCurveTo(-6, -30, -30, -44);
  ctx.quadraticCurveTo(-18, -20, -16, 0);
  ctx.quadraticCurveTo(-18, 16, -30, 32);
  ctx.quadraticCurveTo(-6, 22, 8, 0);
  ctx.closePath();
  ctx.fillStyle = '#5a7285';
  ctx.fill();
  ctx.restore();

  ctx.beginPath();
  ctx.moveTo(6, -28);
  ctx.quadraticCurveTo(-10, -62, -30, -28);
  ctx.quadraticCurveTo(-8, -34, 6, -28);
  ctx.closePath();
  ctx.fillStyle = '#63798c';
  ctx.fill();

  ctx.beginPath();
  ctx.moveTo(16, 14);
  ctx.quadraticCurveTo(2, 40, -16, 34);
  ctx.quadraticCurveTo(2, 26, 10, 12);
  ctx.closePath();
  ctx.fillStyle = '#5a7285';
  ctx.fill();

  ctx.beginPath();
  ctx.moveTo(72, -4);
  ctx.bezierCurveTo(64, -22, 34, -32, 2, -30);
  ctx.bezierCurveTo(-30, -28, -54, -14, -64, -2);
  ctx.bezierCurveTo(-54, 10, -30, 24, 2, 26);
  ctx.bezierCurveTo(34, 28, 64, 14, 72, -4);
  ctx.closePath();
  const g = ctx.createLinearGradient(0, -32, 0, 28);
  g.addColorStop(0.00, '#8fa5b8');
  g.addColorStop(0.42, '#6a8195');
  g.addColorStop(0.62, '#e8f0f6');
  g.addColorStop(1.00, '#ffffff');
  ctx.fillStyle = g;
  ctx.fill();

  ctx.strokeStyle = 'rgba(30,50,65,0.4)';
  ctx.lineWidth = 1.2;
  for (let i = 0; i < 5; i++){
    const x = 30 - i * 4;
    ctx.beginPath();
    ctx.moveTo(x, -12);
    ctx.quadraticCurveTo(x - 2, 0, x, 10);
    ctx.stroke();
  }

  ctx.beginPath();
  ctx.moveTo(70, -2);
  ctx.quadraticCurveTo(60, 8, 44, 10);
  ctx.strokeStyle = 'rgba(20,35,48,0.6)';
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.beginPath(); ctx.arc(56, -10, 3.4, 0, TAU);
  ctx.fillStyle = '#0a141c'; ctx.fill();
  ctx.beginPath(); ctx.arc(56.8, -10.8, 1.1, 0, TAU);
  ctx.fillStyle = 'rgba(200,235,255,0.9)'; ctx.fill();
}

/* 3.12 幽光水母 */
function drawJelly(ph, bob, t){
  const p = ph;
  const s = Math.sin(p);
  const w = 34 * (1 + s * 0.12);
  const h = 30 * (1 - s * 0.15);

  ctx.strokeStyle = 'rgba(232,166,255,0.35)';
  ctx.lineCap = 'round';
  for (let i = 0; i < 8; i++){
    const ox = -w * 0.75 + i * (w * 1.5 / 7);
    const len = 50 + (i % 3) * 22;
    ctx.beginPath();
    ctx.moveTo(ox, 4);
    ctx.bezierCurveTo(
      ox + Math.sin(t * 1.4 + i) * 12,       4 + len * 0.40,
      ox - Math.sin(t * 1.1 + i * 1.7) * 16, 4 + len * 0.75,
      ox + Math.sin(t * 1.7 + i * 2.3) * 10, 4 + len
    );
    ctx.lineWidth = 1.8;
    ctx.stroke();
  }

  ctx.beginPath();
  ctx.moveTo(-w, 0);
  ctx.bezierCurveTo(-w * 0.92, -h * 2.0, w * 0.92, -h * 2.0, w, 0);
  ctx.quadraticCurveTo(w * 0.6, h * 0.55, 0, h * 0.45);
  ctx.quadraticCurveTo(-w * 0.6, h * 0.55, -w, 0);
  ctx.closePath();
  const g = ctx.createRadialGradient(0, -h * 0.5, 2, 0, -h * 0.3, w * 1.4);
  g.addColorStop(0.00, 'rgba(250,220,255,0.70)');
  g.addColorStop(0.45, 'rgba(200,120,255,0.35)');
  g.addColorStop(1.00, 'rgba(90,30,140,0.05)');
  ctx.fillStyle = g;
  ctx.fill();
  ctx.strokeStyle = 'rgba(240,200,255,0.40)';
  ctx.lineWidth = 1.3;
  ctx.stroke();

  ctx.beginPath();
  ctx.ellipse(0, -h * 0.55, w * 0.4, h * 0.35, 0, 0, TAU);
  ctx.fillStyle = 'rgba(255,230,255,0.20)';
  ctx.fill();

  glowDot(0, -h * 0.55, 3, GLOW.pink, 0.5 + 0.25 * Math.sin(t * 2 + bob));
}

/* 3.13 箭鱿 */
function drawSquid(ph, bob, t){
  ctx.lineCap = 'round';
  for (let i = 0; i < 6; i++){
    const oy = -8 + i * 3.2;
    ctx.beginPath();
    ctx.moveTo(34, oy);
    ctx.bezierCurveTo(
      58, oy + Math.sin(t * 2.2 + i) * 5,
      78, oy + Math.sin(t * 1.8 + i * 1.5) * 8,
      98, oy + Math.sin(t * 1.4 + i * 2) * 10
    );
    ctx.strokeStyle = i % 2 ? 'rgba(150,120,180,0.65)' : 'rgba(120,95,155,0.72)';
    ctx.lineWidth = 2.4;
    ctx.stroke();
  }

  ctx.beginPath();
  ctx.moveTo(-10, -22);
  ctx.lineTo(-46, -40);
  ctx.lineTo(-30, -14);
  ctx.closePath();
  ctx.fillStyle = 'rgba(150,120,180,0.55)';
  ctx.fill();

  ctx.beginPath();
  ctx.moveTo(-10, 22);
  ctx.lineTo(-46, 40);
  ctx.lineTo(-30, 14);
  ctx.closePath();
  ctx.fillStyle = 'rgba(150,120,180,0.55)';
  ctx.fill();

  ctx.beginPath();
  ctx.moveTo(38, 0);
  ctx.bezierCurveTo(26, -20, -18, -26, -52, -12);
  ctx.bezierCurveTo(-64, -6, -64, 6, -52, 12);
  ctx.bezierCurveTo(-18, 26, 26, 20, 38, 0);
  ctx.closePath();
  const g = ctx.createLinearGradient(0, -26, 0, 26);
  g.addColorStop(0.00, '#c8b0e0');
  g.addColorStop(0.45, '#8a6ea8');
  g.addColorStop(1.00, '#3a2a4e');
  ctx.fillStyle = g;
  ctx.fill();

  ctx.beginPath(); ctx.arc(24, -8, 5.5, 0, TAU);
  ctx.fillStyle = '#0e0a14'; ctx.fill();
  ctx.beginPath(); ctx.arc(25.5, -9.5, 1.8, 0, TAU);
  ctx.fillStyle = 'rgba(230,220,255,0.95)'; ctx.fill();
  ctx.beginPath(); ctx.arc(24, 8, 5.5, 0, TAU);
  ctx.fillStyle = '#0e0a14'; ctx.fill();
  ctx.beginPath(); ctx.arc(25.5, 6.5, 1.8, 0, TAU);
  ctx.fillStyle = 'rgba(230,220,255,0.95)'; ctx.fill();
}

/* 3.14 蓝鲸 */
function drawWhale(ph, bob, t){
  const p = ph;
  const sway = Math.sin(p * 0.7) * 6;

  ctx.save();
  ctx.translate(-96, sway * 0.4);
  ctx.rotate(Math.sin(p * 0.8) * 0.15);
  ctx.beginPath();
  ctx.moveTo(10, 0);
  ctx.quadraticCurveTo(-10, -24, -34, -40);
  ctx.quadraticCurveTo(-16, -14, -14, 0);
  ctx.quadraticCurveTo(-16, 14, -34, 40);
  ctx.quadraticCurveTo(-10, 24, 10, 0);
  ctx.closePath();
  const tg = ctx.createLinearGradient(-34, 0, 10, 0);
  tg.addColorStop(0, 'rgba(60,100,140,0.4)');
  tg.addColorStop(1, 'rgba(60,100,140,0.9)');
  ctx.fillStyle = tg;
  ctx.fill();
  ctx.restore();

  const bodyPath = () => {
    ctx.beginPath();
    ctx.moveTo(100, -6);
    ctx.bezierCurveTo(92, -50, 40, -66, -20, -58);
    ctx.bezierCurveTo(-58, -52, -86, -28, -96, 0);
    ctx.bezierCurveTo(-86, 30, -58, 50, -20, 56);
    ctx.bezierCurveTo(40, 64, 92, 44, 100, -6);
    ctx.closePath();
  };
  bodyPath();
  const g = ctx.createLinearGradient(0, -66, 0, 64);
  g.addColorStop(0.00, '#7fa8c8');
  g.addColorStop(0.35, '#4a7396');
  g.addColorStop(0.62, '#2a4a68');
  g.addColorStop(0.82, '#8fb0c8');
  g.addColorStop(1.00, '#d0e2ee');
  ctx.fillStyle = g;
  ctx.fill();

  ctx.save();
  bodyPath();
  ctx.clip();

  ctx.strokeStyle = 'rgba(220,235,245,0.25)';
  ctx.lineWidth = 1.6;
  for (let i = 0; i < 7; i++){
    const y = 18 + i * 5.5;
    ctx.beginPath();
    ctx.moveTo(88, y);
    ctx.quadraticCurveTo(10, y + 7, -80, y + 2);
    ctx.stroke();
  }

  ctx.fillStyle = 'rgba(180,210,230,0.14)';
  for (let i = 0; i < 26; i++){
    const a = i * 2.37;
    ctx.beginPath();
    ctx.ellipse(Math.cos(a) * 56, Math.sin(a * 1.3) * 38, 3 + (i % 4) * 1.6, 2 + (i % 3), a, 0, TAU);
    ctx.fill();
  }
  ctx.restore();

  ctx.beginPath();
  ctx.moveTo(100, 0);
  ctx.quadraticCurveTo(82, 12, 60, 14);
  ctx.strokeStyle = 'rgba(15,35,55,0.55)';
  ctx.lineWidth = 2.4;
  ctx.stroke();

  ctx.beginPath(); ctx.arc(74, -10, 4.2, 0, TAU);
  ctx.fillStyle = '#06121e'; ctx.fill();
  ctx.beginPath(); ctx.arc(75, -11, 1.4, 0, TAU);
  ctx.fillStyle = 'rgba(200,235,255,0.9)'; ctx.fill();

  ctx.save();
  ctx.translate(48, 26);
  ctx.rotate(0.3 + Math.sin(p * 1.1) * 0.15);
  ctx.beginPath();
  ctx.ellipse(0, 0, 26, 8, 0, 0, TAU);
  ctx.fillStyle = 'rgba(40,80,110,0.7)';
  ctx.fill();
  ctx.restore();
}

/* 3.15 深渊巨鲨（Boss） */
function drawBossShark(ph, bob, t){
  const p = ph;

  ctx.save();
  ctx.translate(-78, 0);
  ctx.rotate(Math.sin(p) * 0.20);
  ctx.beginPath();
  ctx.moveTo(10, 0);
  ctx.quadraticCurveTo(-8, -38, -38, -56);
  ctx.quadraticCurveTo(-22, -24, -20, 0);
  ctx.quadraticCurveTo(-22, 20, -38, 40);
  ctx.quadraticCurveTo(-8, 28, 10, 0);
  ctx.closePath();
  ctx.fillStyle = '#3e2a30';
  ctx.fill();
  ctx.restore();

  ctx.beginPath();
  ctx.moveTo(8, -34);
  ctx.quadraticCurveTo(-14, -80, -38, -34);
  ctx.quadraticCurveTo(-10, -42, 8, -34);
  ctx.closePath();
  ctx.fillStyle = '#4a3038';
  ctx.fill();

  ctx.beginPath();
  ctx.moveTo(18, 18);
  ctx.quadraticCurveTo(2, 52, -22, 44);
  ctx.quadraticCurveTo(2, 34, 12, 16);
  ctx.closePath();
  ctx.fillStyle = '#4a3038';
  ctx.fill();

  ctx.beginPath();
  ctx.moveTo(88, -6);
  ctx.bezierCurveTo(78, -28, 42, -40, 4, -38);
  ctx.bezierCurveTo(-34, -36, -64, -18, -78, -2);
  ctx.bezierCurveTo(-64, 14, -34, 32, 4, 34);
  ctx.bezierCurveTo(42, 36, 78, 18, 88, -6);
  ctx.closePath();
  const g = ctx.createLinearGradient(0, -40, 0, 36);
  g.addColorStop(0.00, '#5a4550');
  g.addColorStop(0.40, '#3e2a34');
  g.addColorStop(0.60, '#7a2e36');
  g.addColorStop(1.00, '#a83a42');
  ctx.fillStyle = g;
  ctx.fill();

  ctx.strokeStyle = 'rgba(200,150,160,0.45)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(30, -30); ctx.lineTo(22, -10);
  ctx.moveTo(20, -26); ctx.lineTo(26, -12);
  ctx.moveTo(-10, -30); ctx.lineTo(-18, -14);
  ctx.stroke();

  ctx.fillStyle = 'rgba(240,232,220,0.95)';
  for (let row = 0; row < 2; row++){
    for (let i = 0; i < 6; i++){
      const x = 84 - i * 6;
      const y = 2 + row * 7 + i * 1.2;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x - 2.4, y - 1.4);
      ctx.lineTo(x - 1, y - 7);
      ctx.closePath();
      ctx.fill();
    }
  }

  ctx.beginPath(); ctx.arc(66, -14, 4.4, 0, TAU);
  ctx.fillStyle = '#0a0408'; ctx.fill();
  glowDot(66, -14, 2.2, GLOW.red, 0.7 + 0.25 * Math.sin(t * 3));
}

/* 3.16 冰霜古鲸（Boss） */
function drawBossWhale(ph, bob, t){
  const p = ph;
  const sway = Math.sin(p * 0.6) * 8;

  ctx.save();
  ctx.translate(-104, sway * 0.4);
  ctx.rotate(Math.sin(p * 0.7) * 0.13);
  ctx.beginPath();
  ctx.moveTo(12, 0);
  ctx.quadraticCurveTo(-12, -30, -40, -50);
  ctx.quadraticCurveTo(-20, -18, -18, 0);
  ctx.quadraticCurveTo(-20, 18, -40, 50);
  ctx.quadraticCurveTo(-12, 30, 12, 0);
  ctx.closePath();
  const tg = ctx.createLinearGradient(-40, 0, 12, 0);
  tg.addColorStop(0, 'rgba(160,210,240,0.35)');
  tg.addColorStop(1, 'rgba(160,210,240,0.85)');
  ctx.fillStyle = tg;
  ctx.fill();
  ctx.restore();

  const bodyPath = () => {
    ctx.beginPath();
    ctx.moveTo(108, -6);
    ctx.bezierCurveTo(98, -56, 42, -74, -22, -64);
    ctx.bezierCurveTo(-62, -58, -92, -30, -104, 0);
    ctx.bezierCurveTo(-92, 32, -62, 54, -22, 62);
    ctx.bezierCurveTo(42, 72, 98, 48, 108, -6);
    ctx.closePath();
  };
  bodyPath();
  const g = ctx.createLinearGradient(0, -74, 0, 70);
  g.addColorStop(0.00, '#cfeaf8');
  g.addColorStop(0.32, '#8ec4e0');
  g.addColorStop(0.58, '#4a7fa0');
  g.addColorStop(0.80, '#b8dcee');
  g.addColorStop(1.00, '#eaf8ff');
  ctx.fillStyle = g;
  ctx.fill();

  ctx.save();
  bodyPath();
  ctx.clip();
  ctx.strokeStyle = 'rgba(230,250,255,0.55)';
  ctx.lineWidth = 2;
  ctx.fillStyle = 'rgba(200,240,255,0.18)';
  for (let i = 0; i < 9; i++){
    const x = 70 - i * 18;
    const hgt = 26 - Math.abs(i - 4) * 2.5;
    ctx.beginPath();
    ctx.moveTo(x, -20);
    ctx.lineTo(x - 9, -20 - hgt);
    ctx.lineTo(x - 18, -20);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }
  ctx.restore();

  glowDot(60, -46, 4, GLOW.ice, 0.5 + 0.25 * Math.sin(t * 2.2));

  ctx.beginPath();
  ctx.moveTo(108, 0);
  ctx.quadraticCurveTo(88, 14, 64, 16);
  ctx.strokeStyle = 'rgba(30,60,85,0.55)';
  ctx.lineWidth = 2.4;
  ctx.stroke();

  ctx.beginPath(); ctx.arc(80, -12, 4.6, 0, TAU);
  ctx.fillStyle = '#041824'; ctx.fill();
  glowDot(80, -12, 2.4, GLOW.ice, 0.75 + 0.2 * Math.sin(t * 2.6));

  ctx.save();
  ctx.translate(52, 30);
  ctx.rotate(0.28 + Math.sin(p) * 0.12);
  ctx.beginPath();
  ctx.ellipse(0, 0, 28, 9, 0, 0, TAU);
  ctx.fillStyle = 'rgba(120,180,215,0.65)';
  ctx.fill();
  ctx.restore();
}

/* 3.17 熔岩巨兽（Boss） */
function drawBossLava(ph, bob, t){
  const p = ph;
  const flap = Math.sin(p) * 14;

  ctx.beginPath();
  ctx.moveTo(30, -10);
  ctx.bezierCurveTo(6, -50 - flap, -40, -58 - flap, -60, -30);
  ctx.bezierCurveTo(-40, -26, -10, -16, 20, -6);
  ctx.closePath();
  const wg = ctx.createLinearGradient(0, -60, 0, -6);
  wg.addColorStop(0, 'rgba(255,110,40,0.25)');
  wg.addColorStop(1, 'rgba(120,30,10,0.88)');
  ctx.fillStyle = wg;
  ctx.fill();

  ctx.beginPath();
  ctx.moveTo(30, 10);
  ctx.bezierCurveTo(6, 50 + flap, -40, 58 + flap, -60, 30);
  ctx.bezierCurveTo(-40, 26, -10, 16, 20, 6);
  ctx.closePath();
  ctx.fillStyle = wg;
  ctx.fill();

  ctx.beginPath();
  ctx.moveTo(-56, 0);
  ctx.quadraticCurveTo(-78, -18, -92, -12);
  ctx.quadraticCurveTo(-78, 0, -92, 12);
  ctx.quadraticCurveTo(-78, 18, -56, 0);
  ctx.closePath();
  ctx.fillStyle = 'rgba(90,28,12,0.9)';
  ctx.fill();

  const bodyPath = () => {
    ctx.beginPath();
    ctx.moveTo(78, -4);
    ctx.bezierCurveTo(70, -38, 30, -52, -14, -46);
    ctx.bezierCurveTo(-46, -40, -62, -16, -62, 0);
    ctx.bezierCurveTo(-62, 16, -46, 40, -14, 46);
    ctx.bezierCurveTo(30, 52, 70, 38, 78, -4);
    ctx.closePath();
  };
  bodyPath();
  const g = ctx.createLinearGradient(0, -52, 0, 52);
  g.addColorStop(0.00, '#5a2420');
  g.addColorStop(0.45, '#3a1410');
  g.addColorStop(0.70, '#2a0c08');
  g.addColorStop(1.00, '#4a1a14');
  ctx.fillStyle = g;
  ctx.fill();

  ctx.save();
  bodyPath();
  ctx.clip();
  ctx.strokeStyle = 'rgba(255,140,50,0.85)';
  ctx.lineWidth = 2.2;
  ctx.shadowColor = 'rgba(255,120,30,0.9)';
  ctx.shadowBlur = 10;
  const cracks = [
    [[20, -40], [6, -18], [-12, -24], [-30, -6]],
    [[40, -18], [28, 2], [8, -4], [-14, 10]],
    [[-30, 30], [-16, 18], [-34, 6]],
    [[10, 32], [-6, 20], [-24, 26]]
  ];
  for (let i = 0; i < cracks.length; i++){
    ctx.beginPath();
    const c = cracks[i];
    ctx.moveTo(c[0][0], c[0][1]);
    for (let j = 1; j < c.length; j++) ctx.lineTo(c[j][0], c[j][1]);
    ctx.stroke();
  }
  ctx.shadowBlur = 0;
  ctx.restore();

  ctx.beginPath(); ctx.arc(58, -14, 5, 0, TAU);
  ctx.fillStyle = '#1a0604'; ctx.fill();
  glowDot(58, -14, 3, GLOW.orange, 0.8 + 0.2 * Math.sin(t * 3.2));

  ctx.beginPath();
  ctx.moveTo(76, 2);
  ctx.quadraticCurveTo(64, 12, 50, 14);
  ctx.strokeStyle = 'rgba(255,150,60,0.7)';
  ctx.lineWidth = 2;
  ctx.stroke();
}

/* ---------- 分发表：span = 该物种在局部坐标里的头尾跨度 ---------- */
var CODEX_DRAW = {
  blue:     { span:150, fn:drawBlue },
  puffer:   { span:132, fn:drawPuffer },
  sword:    { span:260, fn:drawSword },
  lantern:  { span:130, fn:drawLantern },
  sardine:  { span:126, fn:drawSardine },
  eel:      { span:190, fn:drawEel },
  seahorse: { span:112, fn:drawSeahorse },
  ray:      { span:178, fn:drawRay },
  round:    { span:82,  fn:drawRound },
  sunfish:  { span:120, fn:drawSunfish },
  shark:    { span:140, fn:drawShark },
  squid:    { span:165, fn:drawSquid },
  whale:    { span:200, fn:drawWhale }
};
/* 水母仍走旧的 drawJellyShape（伞盖需要保持竖直，不随朝向旋转） */
/* 3.20 幽灵魟（Boss） */
function drawBossRay(ph, bob, t){
  const p = ph;
  const flap = Math.sin(p * 1.4) * 10;

  ctx.beginPath();
  ctx.moveTo(70, 0);
  ctx.bezierCurveTo(40, -46 - flap, -20, -52 - flap * 0.6, -66, -10 - flap * 0.3);
  ctx.bezierCurveTo(-30, -14, 10, -10, 70, 0);
  ctx.closePath();
  const gt = ctx.createLinearGradient(0, -56, 0, 8);
  gt.addColorStop(0, '#4c3f7d'); gt.addColorStop(1, '#2a2350');
  ctx.fillStyle = gt;
  ctx.fill();

  ctx.beginPath();
  ctx.moveTo(70, 0);
  ctx.bezierCurveTo(36, 40 + flap, -18, 46 + flap * 0.6, -62, 12 + flap * 0.3);
  ctx.bezierCurveTo(-26, 12, 8, 8, 70, 0);
  ctx.closePath();
  const gb = ctx.createLinearGradient(0, 8, 0, 48);
  gb.addColorStop(0, '#241d44'); gb.addColorStop(1, '#3b2f63');
  ctx.fillStyle = gb;
  ctx.fill();

  ctx.strokeStyle = 'rgba(196,181,253,0.75)';
  ctx.lineWidth = 3;
  const ty2 = Math.sin(p * 2.2 + 1.2) * 18;
  ctx.beginPath();
  ctx.moveTo(-60, 0);
  ctx.quadraticCurveTo(-96, Math.sin(p * 2.2) * 12, -128, ty2);
  ctx.stroke();
  glowDot(-128, ty2, 3.2, GLOW.purple, 0.8);

  for (let i = 0; i < 5; i++){
    const sx = 40 - i * 22, sy = -8 + i * 3.2;
    glowDot(sx, sy, 2.2, GLOW.purple, 0.35 + 0.25 * Math.sin(t * 2.4 + i * 1.1));
  }

  ctx.beginPath(); ctx.arc(52, -8, 4.6, 0, TAU);
  ctx.fillStyle = '#0a0618'; ctx.fill();
  glowDot(52, -8, 2.4, GLOW.purple, 0.9);
}

/* 3.21 雷暴海鳝（Boss） */
function drawBossEel(ph, bob, t){
  const p = ph;
  const N = 30;
  const pts = [];
  for (let i = 0; i <= N; i++){
    const u = i / N;
    const x = 108 - u * 226;
    const y = Math.sin(p - u * 4.2) * (2 + u * 24);
    const w = 21 * Math.pow(1 - u, 0.55) + 2;
    pts.push({ x: x, y: y, w: w });
  }

  ctx.beginPath();
  ctx.moveTo(pts[0].x, pts[0].y - pts[0].w);
  for (let i = 1; i <= N; i++) ctx.lineTo(pts[i].x, pts[i].y - pts[i].w - 7);
  for (let i = N; i >= 0; i--) ctx.lineTo(pts[i].x, pts[i].y - pts[i].w);
  ctx.closePath();
  ctx.fillStyle = 'rgba(110,231,183,0.28)';
  ctx.fill();

  ctx.beginPath();
  ctx.moveTo(pts[0].x, pts[0].y - pts[0].w);
  for (let i = 1; i <= N; i++) ctx.lineTo(pts[i].x, pts[i].y - pts[i].w);
  for (let i = N; i >= 0; i--) ctx.lineTo(pts[i].x, pts[i].y + pts[i].w);
  ctx.closePath();
  const g = ctx.createLinearGradient(0, -22, 0, 22);
  g.addColorStop(0, '#8ff5d0'); g.addColorStop(0.42, '#1f8f77'); g.addColorStop(1, '#0b3b34');
  ctx.fillStyle = g;
  ctx.fill();

  ctx.strokeStyle = 'rgba(190,255,235,0.85)';
  ctx.lineWidth = 1.8;
  for (let i = 2; i < N - 3; i += 4){
    const pt = pts[i];
    const z = 14 * Math.sin(t * 9 + i);
    ctx.beginPath();
    ctx.moveTo(pt.x, pt.y - pt.w * 0.5);
    ctx.lineTo(pt.x - 5 + z * 0.2, pt.y - 2);
    ctx.lineTo(pt.x + 4 - z * 0.2, pt.y + 3);
    ctx.lineTo(pt.x - 3, pt.y + pt.w * 0.5);
    ctx.stroke();
  }

  ctx.beginPath();
  ctx.ellipse(pts[0].x - 2, pts[0].y, 28, 17, 0, 0, TAU);
  const hg = ctx.createRadialGradient(pts[0].x, pts[0].y - 5, 3, pts[0].x, pts[0].y, 30);
  hg.addColorStop(0, '#9ff7d8'); hg.addColorStop(1, '#14554a');
  ctx.fillStyle = hg;
  ctx.fill();

  ctx.beginPath(); ctx.arc(pts[0].x + 14, pts[0].y - 6, 4.6, 0, TAU);
  ctx.fillStyle = '#04120f'; ctx.fill();
  glowDot(pts[0].x + 14, pts[0].y - 6, 3, GLOW.teal, 0.95);
  glowDot(pts[0].x + 4, pts[0].y + 6, 2.2, GLOW.teal, 0.5 + 0.3 * Math.sin(t * 6));
}

/* 3.22 剧毒水母后（Boss） */
function drawBossJelly(ph, bob, t){
  const p = ph;
  const puls = 1 + Math.sin(p * 1.6) * 0.07;

  ctx.beginPath();
  ctx.moveTo(-70, 6);
  ctx.bezierCurveTo(-66, -52 * puls, -20, -64 * puls, 8, -62 * puls);
  ctx.bezierCurveTo(48, -58 * puls, 74, -30, 72, 4);
  ctx.bezierCurveTo(50, 16, -40, 18, -70, 6);
  ctx.closePath();
  const g = ctx.createLinearGradient(0, -64, 0, 18);
  g.addColorStop(0, 'rgba(240,171,252,0.95)');
  g.addColorStop(0.55, 'rgba(168,85,247,0.88)');
  g.addColorStop(1, 'rgba(74,29,94,0.95)');
  ctx.fillStyle = g;
  ctx.fill();

  ctx.strokeStyle = 'rgba(240,171,252,0.6)';
  ctx.lineWidth = 2;
  for (let i = 0; i < 7; i++){
    const x = -58 + i * 20;
    ctx.beginPath();
    ctx.arc(x, 10, 9, 0.15 * Math.PI, 0.85 * Math.PI);
    ctx.stroke();
  }

  for (let i = 0; i < 9; i++){
    const x0 = -56 + i * 15;
    const sw = Math.sin(p * 2 + i * 0.8) * 10;
    ctx.strokeStyle = 'rgba(216,180,254,' + (0.5 + 0.2 * Math.sin(t * 3 + i)).toFixed(2) + ')';
    ctx.lineWidth = 3.4 - i * 0.15;
    ctx.beginPath();
    ctx.moveTo(x0, 14);
    ctx.quadraticCurveTo(x0 + sw * 0.5, 44, x0 + sw, 78 + Math.cos(p + i) * 8);
    ctx.stroke();
    glowDot(x0 + sw, 78 + Math.cos(p + i) * 8, 2.4, GLOW.pink, 0.6);
  }

  ctx.beginPath(); ctx.arc(4, -18, 13, 0, TAU);
  const cg = ctx.createRadialGradient(4, -18, 2, 4, -18, 14);
  cg.addColorStop(0, 'rgba(255,220,255,0.95)');
  cg.addColorStop(1, 'rgba(192,60,220,0.4)');
  ctx.fillStyle = cg;
  ctx.fill();
  glowDot(4, -18, 4.2, GLOW.pink, 0.85 + 0.15 * Math.sin(t * 5));
}

var BOSS_DRAW = [
  { key:'boss_shark',  span:170, fn:drawBossShark },
  { key:'boss_whale',  span:215, fn:drawBossWhale },
  { key:'boss_ray',    span:190, fn:drawBossRay },
  { key:'boss_eel',    span:230, fn:drawBossEel },
  { key:'boss_jelly',  span:160, fn:drawBossJelly },
  { key:'boss_lava',   span:175, fn:drawBossLava }
];

/* ---------- 绘制对象缓存：渐变是每帧最大的垃圾来源 ---------- */
var GCACHE = {}, GCACHE_N = 0, GCACHE_MAX = 600;
var RAW_LIN = ctx.createLinearGradient.bind(ctx);
var RAW_RAD = ctx.createRadialGradient.bind(ctx);
function gradScope(ns){
  var seq = 0;
  function pick(kind, args, make){
    var key = ns + '#' + (seq++) + '|' + kind + args.join(',');
    var g = GCACHE[key];
    if (g) return g;
    if (GCACHE_N >= GCACHE_MAX) return make();
    g = GCACHE[key] = make(); GCACHE_N++;
    return g;
  }
  ctx.createLinearGradient = function(a, b, c, d){
    var args = [a, b, c, d];
    return pick('L', args, function(){ return RAW_LIN(a, b, c, d); });
  };
  ctx.createRadialGradient = function(a, b, c, d, e, f){
    var args = [a, b, c, d, e, f];
    return pick('R', args, function(){ return RAW_RAD(a, b, c, d, e, f); });
  };
}
function gradScopeEnd(){
  ctx.createLinearGradient = RAW_LIN;
  ctx.createRadialGradient = RAW_RAD;
}
/* 背景用的显式缓存（不经过作用域） */
function cgLin(key, x0, y0, x1, y1, stops){
  var g = GCACHE[key];
  if (g) return g;
  g = RAW_LIN(x0, y0, x1, y1);
  for (var i = 0; i < stops.length; i++) g.addColorStop(stops[i][0], stops[i][1]);
  if (GCACHE_N < GCACHE_MAX){ GCACHE[key] = g; GCACHE_N++; }
  return g;
}

/* 统一入口：按 sid 画矢量鱼。返回 false 表示该 sid 无矢量画法（回落旧画法）。
   视觉长度 ≈ 体型 × 2.55，与碰撞半径保持同一比例语义。 */
function drawCodexFish(key, x, y, ang, size, phase, bob, t, alpha, flash){
  const guardian = BOSS_DRAW.findIndex(entry => entry.key === key);
  if (guardian >= 0) {
    drawPaperGuardian(ctx, guardian, x, y, ang, size, t, alpha, flash);
    return true;
  }
  if (drawSpecimen(ctx, key, x, y, ang, size, t + phase * .12, alpha, flash)) return true;
  var span = 0, fn = null, i;
  var cd = CODEX_DRAW[key];
  if (cd){ span = cd.span; fn = cd.fn; }
  else {
    for (i = 0; i < BOSS_DRAW.length; i++){
      if (BOSS_DRAW[i].key === key){ span = BOSS_DRAW[i].span; fn = BOSS_DRAW[i].fn; break; }
    }
  }
  if (!fn) return false;
  var k = (size * 2.55) / span;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(ang);
  ctx.globalAlpha = alpha === undefined ? 1 : alpha;
  if (flash){ ctx.filter = 'brightness(2.6) saturate(0.25)'; }
  ctx.scale(k, k);
  gradScope(key);
  try { fn(phase, bob, t); } finally { gradScopeEnd(); }
  ctx.restore();
  return true;
}

/* ============================================================
   生物图鉴面板（Tab 开关 · 暂停游戏）
   ============================================================ */
var CODEX_STATE = { seen:{}, eaten:{} };
function codexMark(kind, key){
  if (!key) return;
  var bag = (kind === 'eaten') ? CODEX_STATE.eaten : CODEX_STATE.seen;
  bag[key] = (bag[key] || 0) + 1;
  if (G.codexOpen) refreshCodex();
}
function bossDrawKey(idx){ return BOSS_DRAW[idx % BOSS_DRAW.length].key; }

function toggleCodex(force){
  var el = document.getElementById('codex');
  if (!el) return;
  G.codexOpen = (force === undefined) ? !G.codexOpen : !!force;
  el.classList.toggle('hide', !G.codexOpen);
  if (G.codexOpen){ G.paused = true; refreshCodex(); }
  else { G.paused = false; }
}

function codexMetaOf(k){
  for (var i = 0; i < BOSS_DRAW.length; i++){
    if (BOSS_DRAW[i].key === k) return { name:BOSS_DEFS[i].name, color:BOSS_DEFS[i].c1 };
  }
  var f = fishById(k);
  if (f && f.id === k) return { name:f.name, color:f.glow };
  var S = SPECIES[k];
  return S ? { name:S.name, color:S.color } : { name:k, color:'#7de8ff' };
}

var CODEX_META = {
  blue:{en:'Blue Puffer',kind:'玩家可选'},   puffer:{en:'Porcupine Puffer',kind:'玩家可选'},
  sword:{en:'Swordfish',kind:'玩家可选'},    lantern:{en:'Lantern Angler',kind:'玩家可选'},
  sardine:{en:'Sardine',kind:'玩家可选'},    eel:{en:'Electric Eel',kind:'玩家可选'},
  seahorse:{en:'Seahorse',kind:'玩家可选'},  ray:{en:'Manta Ray',kind:'玩家可选'},
  round:{en:'Round Fish',kind:'敌鱼'},       sunfish:{en:'Sunfish',kind:'敌鱼'},
  shark:{en:'Shadow Shark',kind:'敌鱼'},     jelly:{en:'Glow Jelly',kind:'敌鱼'},
  squid:{en:'Arrow Squid',kind:'敌鱼'},      whale:{en:'Blue Whale',kind:'特殊'},
  boss_shark:{en:'Abyss Megalodon',kind:'Boss'},
  boss_whale:{en:'Frost Leviathan',kind:'Boss'},
  boss_ray:{en:'Phantom Ray',kind:'Boss'},
  boss_eel:{en:'Storm Moray',kind:'Boss'},
  boss_jelly:{en:'Venom Queen',kind:'Boss'},
  boss_lava:{en:'Lava Behemoth',kind:'Boss'}
};

var codexItemMap = {};
function buildCodexPanel(){
  var list = document.getElementById('codexList');
  if (!list) return;
  list.innerHTML = '';
  codexItemMap = {};
  var order = ['blue','puffer','sword','lantern','sardine','eel','seahorse','ray',
               'round','sunfish','shark','jelly','squid','whale',
               'boss_shark','boss_whale','boss_ray','boss_eel','boss_jelly','boss_lava'];
  var groups = {};
  order.forEach(function(k){
    var meta = codexMetaOf(k);
    var kind = CODEX_META[k].kind;
    if (!groups[kind]) groups[kind] = [];
    groups[kind].push({ key:k, name:meta.name, color:meta.color, en:CODEX_META[k].en });
  });
  Object.keys(groups).forEach(function(g){
    var h = document.createElement('div');
    h.className = 'c-group';
    h.textContent = g + ' · ' + groups[g].length;
    list.appendChild(h);
    groups[g].forEach(function(it){
      var li = document.createElement('div');
      li.className = 'c-item';
      var dot = document.createElement('span');
      dot.className = 'c-dot';
      dot.style.background = it.color;
      dot.style.boxShadow = '0 0 7px ' + it.color;
      var nm = document.createElement('span');
      nm.className = 'c-name';
      nm.textContent = it.name;
      var ct = document.createElement('span');
      ct.className = 'c-cnt';
      li.appendChild(dot); li.appendChild(nm); li.appendChild(ct);
      list.appendChild(li);
      codexItemMap[it.key] = { li:li, ct:ct, nm:nm, dot:dot, name:it.name, color:it.color, locked:null };
    });
  });
  refreshCodex();
}
function refreshCodex(){
  var k, it, unlockedNow = 0;
  for (k in codexItemMap){
    it = codexItemMap[k];
    var seen = CODEX_STATE.seen[k] || 0;
    var eaten = CODEX_STATE.eaten[k] || 0;
    var locked = !seen && !eaten;
    if (locked){
      /* 未遭遇：剪影 + ???，名字与配色都不剧透 */
      if (it.locked !== true) it.li.className = 'c-item dim locked';
      it.nm.textContent = '???';
      it.dot.style.background = '#22384a';
      it.dot.style.boxShadow = 'none';
      it.ct.textContent = '未遭遇';
    } else {
      var justUnlocked = (it.locked === true);
      it.li.className = justUnlocked ? 'c-item unlock' : 'c-item';
      it.nm.textContent = it.name;
      it.dot.style.background = it.color;
      it.dot.style.boxShadow = '0 0 7px ' + it.color;
      it.ct.textContent = '遇 ' + seen + ' · 食 ' + eaten;
      if (justUnlocked){
        unlockedNow++;
        G.codexLastUnlock = it.name;
        (function(node){ setTimeout(function(){ node.className = 'c-item'; }, 520); })(it.li);
      }
    }
    it.locked = locked;
  }
  if (unlockedNow) G.codexUnlocks = (G.codexUnlocks || 0) + unlockedNow;
  var foot = document.getElementById('codexFoot');
  if (foot){
    var ts = 0, te = 0, total = 0;
    for (k in codexItemMap) total++;
    for (k in CODEX_STATE.seen) ts++;
    for (k in CODEX_STATE.eaten) te++;
    foot.textContent = '已遭遇 ' + ts + ' / ' + total + ' · 已吞噬 ' + te + ' / ' + total +
      ' · ' + (MOBILE ? '点 ≡ 关闭' : 'Tab 关闭');
  }
}
buildCodexPanel();

function drawFishShape(x, y, ang, size, shape, color, glow, t, phase, alpha, flash){
  if (shape?.startsWith('p_') && drawSpecimen(ctx, shape.slice(2), x, y, ang, size, t + phase, alpha ?? 1)) return;
  if (shape === 'jelly'){ drawJellyShape(x, y, size, color, glow, t, phase, alpha, flash); return; }

  var s = FISH_SPECS[shape] || FISH_SPECS.round;
  var R = size * s.head;
  var HR = R * (s.hs || 1);          /* 头圆半径：细长鱼要小于 R，否则头比身体宽 */
  var wob = Math.sin(t * 6.5 + phase);

  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(ang);
  ctx.globalAlpha = alpha === undefined ? 1 : alpha;

  var col = flash ? '#ffffff' : color;
  var glowc = flash ? '#ffffff' : glow;
  ctx.shadowColor = glowc;
  ctx.shadowBlur = size * (flash ? 2.4 : 0.9);

  var headPt = { x:s.headX * R, y:0 };
  var b1 = { x:s.body[0][0] * R, y:s.body[0][1] * R };
  var b2 = { x:s.body[1][0] * R, y:s.body[1][1] * R };
  var b3 = { x:s.body[2][0] * R, y:s.body[2][1] * R };

  var grad = ctx.createLinearGradient(headPt.x + HR, 0, b3.x, 0);
  grad.addColorStop(0, rgba(glowc, 0.96));
  grad.addColorStop(0.55, col);
  grad.addColorStop(1, rgba(col, 0.86));

  /* ---------- 尾巴 ---------- */
  var pts = [{ p:{ x:b3.x, y:0 }, r:s.tail[0].r * R }];
  var accA = Math.PI;
  var cur = pts[0].p;
  for (var i = 1; i < s.tail.length; i++){
    var sg = s.tail[i];
    accA += sg.a * DEG + wob * 0.12 * i;
    cur = polar(cur, accA, sg.len * R);
    pts.push({ p:cur, r:sg.r * R });
  }

  /* 尾巴渐变：根部接近体色，尾端偏光色，这样尾巴看起来是身体延伸出来的 */
  var tailGrad = ctx.createLinearGradient(pts[0].p.x, 0, pts[pts.length - 1].p.x, 0);
  tailGrad.addColorStop(0, rgba(col, 0.95));
  tailGrad.addColorStop(1, rgba(col, 0.34));

  for (var k = 0; k < pts.length - 1; k++){
    var A = pts[k], B = pts[k + 1];
    var segA = Math.atan2(B.p.y - A.p.y, B.p.x - A.p.x);
    var v1 = polar(A.p, segA - Math.PI / 2, A.r);
    var v2 = polar(B.p, segA - Math.PI / 2, B.r);
    var v3 = polar(B.p, segA + Math.PI / 2, B.r);
    var v4 = polar(A.p, segA + Math.PI / 2, A.r);
    ctx.beginPath();
    ctx.moveTo(v1.x, v1.y); ctx.lineTo(v2.x, v2.y);
    ctx.lineTo(v3.x, v3.y); ctx.lineTo(v4.x, v4.y);
    ctx.closePath();
    ctx.fillStyle = tailGrad;
    ctx.fill();
  }
  for (var m = 0; m < pts.length; m++){
    ctx.beginPath();
    ctx.arc(pts[m].p.x, pts[m].p.y, pts[m].r, 0, TAU);
    ctx.fillStyle = tailGrad;
    ctx.fill();
  }

  /* ---------- 蝠鲼的翼在身体后面 ---------- */
  if (s.extra === 'wing') drawFishExtra('wing', R, HR, headPt, pts, col, glowc, t, phase);

  /* ---------- 鱼鳍 ---------- */
  function drawFin(sign){
    var p1 = polar(headPt, s.fin[0] * sign * DEG, s.fin[1] * R);
    var p2 = polar({ x:0, y:0 }, s.fin[2] * sign * DEG, s.fin[3] * R);
    var p3 = polar({ x:0, y:0 }, s.fin[4] * sign * DEG, s.fin[5] * R);
    ctx.beginPath();
    ctx.moveTo(p1.x, p1.y);
    ctx.quadraticCurveTo(p2.x, p2.y, p3.x, p3.y);
    ctx.fillStyle = rgba(glowc, 0.62);
    ctx.fill();
  }
  drawFin(1);
  drawFin(-1);

  /* ---------- 身体 ---------- */
  fishBodyPath(b1, b2, b3);
  ctx.fillStyle = grad;
  ctx.fill();

  /* ---------- 头部（与身体同渐变，半径用 HR） ---------- */
  ctx.beginPath();
  ctx.arc(headPt.x, headPt.y, HR, 0, TAU);
  ctx.fillStyle = grad;
  ctx.fill();

  /* 鳃线 */
  ctx.strokeStyle = rgba(col, 0.5);
  ctx.lineWidth = Math.max(1, R * 0.06);
  ctx.beginPath();
  ctx.arc(headPt.x - HR * 0.5, 0, HR * 0.78, -1.0, 1.0);
  ctx.stroke();

  /* ---------- 专属部件 ---------- */
  if (s.extra !== 'wing') drawFishExtra(s.extra, R, HR, headPt, pts, col, glowc, t, phase);

  /* ---------- 眼睛 ---------- */
  ctx.shadowBlur = 0;
  var ex = headPt.x + HR * 0.24, ey = -HR * 0.32;
  ctx.beginPath(); ctx.arc(ex, ey, Math.max(1.5, HR * 0.30), 0, TAU);
  ctx.fillStyle = '#05121f'; ctx.fill();
  ctx.beginPath(); ctx.arc(ex + HR * 0.10, ey - HR * 0.10, Math.max(0.8, HR * 0.12), 0, TAU);
  ctx.fillStyle = '#eafcff'; ctx.fill();

  /* 嘴 */
  ctx.strokeStyle = rgba('#05121f', 0.42);
  ctx.lineWidth = Math.max(1, HR * 0.07);
  ctx.beginPath();
  ctx.arc(headPt.x + HR * 0.82, HR * 0.40, HR * 0.24, -0.9, 0.5);
  ctx.stroke();

  ctx.restore();
}

/* 各鱼种的专属部件 */
function drawFishExtra(kind, R, HR, headPt, pts, col, glowc, t, phase){
  if (!kind) return;

  if (kind === 'spike'){
    var rx = headPt.x * 0.58, ry = R * 1.68;
    ctx.fillStyle = rgba(glowc, 0.9);
    for (var i = 0; i < 20; i++){
      var a = i / 20 * TAU;
      var x1 = Math.cos(a) * rx, y1 = Math.sin(a) * ry;
      var x2 = Math.cos(a) * rx * 1.20, y2 = Math.sin(a) * ry * 1.20;
      ctx.beginPath();
      ctx.moveTo(x1 - Math.sin(a) * R * 0.10, y1 + Math.cos(a) * R * 0.10);
      ctx.lineTo(x2, y2);
      ctx.lineTo(x1 + Math.sin(a) * R * 0.10, y1 - Math.cos(a) * R * 0.10);
      ctx.closePath();
      ctx.fill();
    }
  } else if (kind === 'dorsal'){
    ctx.beginPath();
    ctx.moveTo(R * 0.75, -R * 0.66);
    ctx.lineTo(-R * 0.10, -R * 2.30);
    ctx.lineTo(-R * 1.15, -R * 0.56);
    ctx.closePath();
    ctx.fillStyle = rgba(glowc, 0.72);
    ctx.fill();
  } else if (kind === 'bill'){
    /* 剑鱼长吻：细长锥，用体色 */
    ctx.beginPath();
    ctx.moveTo(headPt.x + HR * 0.55, -HR * 0.26);
    ctx.lineTo(headPt.x + HR * 4.10, 0);
    ctx.lineTo(headPt.x + HR * 0.55, HR * 0.26);
    ctx.closePath();
    ctx.fillStyle = rgba(glowc, 0.95);
    ctx.fill();
  } else if (kind === 'lure'){
    var sway = Math.sin(t * 2.2 + phase) * HR * 0.16;
    var base = { x: headPt.x - HR * 0.42, y: -HR * 0.80 };
    var tip = { x: headPt.x + HR * 0.42 + sway, y: -HR * 2.15 + sway * 0.5 };
    ctx.strokeStyle = rgba(glowc, 0.9);
    ctx.lineWidth = Math.max(1.3, HR * 0.09);
    ctx.beginPath();
    ctx.moveTo(base.x, base.y);
    ctx.quadraticCurveTo(base.x + HR * 0.30, -HR * 1.85, tip.x, tip.y);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(tip.x, tip.y, HR * 0.30, 0, TAU);
    ctx.fillStyle = '#fef3c7';
    ctx.shadowColor = '#fbbf24'; ctx.shadowBlur = HR * 2.0;
    ctx.fill();
    ctx.shadowBlur = 0;
  } else if (kind === 'node'){
    ctx.shadowColor = glowc; ctx.shadowBlur = R * 1.2;
    for (var n = 1; n < pts.length; n++){
      ctx.beginPath();
      ctx.arc(pts[n].p.x, pts[n].p.y, Math.max(1.3, pts[n].r * 0.5), 0, TAU);
      ctx.fillStyle = '#e9d5ff';
      ctx.fill();
    }
    ctx.shadowBlur = 0;
  } else if (kind === 'seahorse'){
    /* 海马：长吻 + 卷曲的尾 */
    ctx.beginPath();
    ctx.moveTo(headPt.x + HR * 0.60, -HR * 0.30);
    ctx.lineTo(headPt.x + HR * 1.95, -HR * 0.02);
    ctx.lineTo(headPt.x + HR * 0.60, HR * 0.30);
    ctx.closePath();
    ctx.fillStyle = rgba(glowc, 0.95);
    ctx.fill();

    var c = pts[1].p;
    ctx.strokeStyle = rgba(col, 0.95);
    ctx.lineWidth = Math.max(1.8, R * 0.30);
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(pts[0].p.x, pts[0].p.y);
    ctx.lineTo(c.x, c.y);
    var turns = 1.15, steps = 26;
    for (var q = 1; q <= steps; q++){
      var tt = q / steps;
      var ang2 = Math.PI * 0.55 + tt * turns * TAU;
      var rad = R * (0.78 - tt * 0.60);
      ctx.lineTo(c.x + rad * Math.cos(ang2), c.y + rad * Math.sin(ang2));
    }
    ctx.stroke();
    ctx.lineCap = 'butt';
  } else if (kind === 'wing'){
    /* 蝠鲼：两片宽大的三角翼，前缘平、后缘收 */
    ctx.fillStyle = rgba(col, 0.55);
    ctx.shadowBlur = 0;
    for (var w = -1; w <= 1; w += 2){
      ctx.beginPath();
      ctx.moveTo(R * 1.18, w * R * 0.10);
      ctx.quadraticCurveTo(R * 0.70, w * R * 2.10, -R * 0.85, w * R * 2.70);
      ctx.quadraticCurveTo(-R * 1.30, w * R * 1.25, -R * 1.05, w * R * 0.28);
      ctx.closePath();
      ctx.fill();
    }
  }
}

/* 水母：伞盖 + 触手 */
function drawJellyShape(x, y, size, color, glow, t, phase, alpha, flash){
  ctx.save();
  ctx.translate(x, y);
  ctx.globalAlpha = alpha === undefined ? 1 : alpha;
  var col = flash ? '#ffffff' : color;
  var glowc = flash ? '#ffffff' : glow;
  ctx.shadowColor = glowc;
  ctx.shadowBlur = size * 1.0;

  var rr = size * 0.86;
  var bg = ctx.createRadialGradient(0, -rr * 0.3, 0, 0, 0, rr);
  bg.addColorStop(0, rgba(glowc, 0.95));
  bg.addColorStop(1, col);
  ctx.beginPath();
  ctx.ellipse(0, 0, rr, rr * 0.92, 0, Math.PI, TAU);
  ctx.quadraticCurveTo(0, rr * 0.36, -rr, 0);
  ctx.fillStyle = bg;
  ctx.fill();

  ctx.shadowBlur = 0;
  ctx.strokeStyle = rgba(glowc, 0.55);
  ctx.lineWidth = Math.max(1.2, size * 0.055);
  for (var i = 0; i < 6; i++){
    var ox = (i - 2.5) * size * 0.30;
    ctx.beginPath();
    ctx.moveTo(ox, size * 0.16);
    ctx.quadraticCurveTo(ox + Math.sin(t * 3 + i) * size * 0.35, size * 0.85,
                         ox + Math.sin(t * 2.2 + i * 1.7) * size * 0.5, size * 1.55);
    ctx.stroke();
  }
  ctx.restore();
}

function drawPlayer(p){
  if (p.dead){
    ctx.save();
    ctx.globalAlpha = 0.35 + Math.sin(G.time * 3) * 0.12;
    ctx.beginPath();
    ctx.arc(p.x, p.y, 16, 0, TAU);
    ctx.fillStyle = rgba(p.c2, 0.5); ctx.fill();
    ctx.font = 'bold 11px "PingFang SC",sans-serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#eafcff';
    ctx.fillText('灵魂', p.x, p.y - 26);
    ctx.restore();
    return;
  }

  if (p.chompAnim > 0){
    /* 啃咬的瞬间：一道扇形咬痕 */
    var t01 = 1 - p.chompAnim / 0.22;
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(p.ang);
    ctx.globalAlpha = 1 - t01;
    ctx.strokeStyle = '#ffd166';
    ctx.lineWidth = Math.max(2, p.size * 0.12);
    ctx.shadowColor = '#ffd166'; ctx.shadowBlur = 20;
    var r0 = p.size * (0.9 + t01 * 0.7);
    ctx.beginPath();
    ctx.arc(0, 0, r0, -1.05, 1.05);
    ctx.stroke();
    ctx.restore();
  }

  if (p.dashT > 0){
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.strokeStyle = rgba('#a5f3fc', 0.5);
    ctx.lineWidth = p.size * 0.6;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(p.x, p.y);
    ctx.lineTo(p.x - Math.cos(p.dashAng) * p.size * 2.6, p.y - Math.sin(p.dashAng) * p.size * 2.6);
    ctx.stroke();
    ctx.restore();
  }

  var alpha = 1;
  if (p.invuln > 0) alpha = 0.55 + Math.sin(G.time * 40) * 0.28;
  if (p.stealthOn) alpha = 0.28;

  for (var i = 0; i < p.slots.length; i++){
    var sid = p.slots[i];
    var S = SPECIES[sid];
    var lv = p.levels[sid];
    for (var k = 0; k < lv; k++){
      var a = G.time * 1.6 + i * 2.1 + k * 0.7;
      var r = p.size * (1.35 + k * 0.18);
      ctx.beginPath();
      ctx.arc(p.x + Math.cos(a) * r, p.y + Math.sin(a) * r, p.size * 0.1, 0, TAU);
      ctx.fillStyle = S.glow;
      ctx.shadowColor = S.color; ctx.shadowBlur = 12;
      ctx.fill(); ctx.shadowBlur = 0;
    }
  }

  if (p.armT > 0){
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.strokeStyle = rgba('#fed7aa', 0.7);
    ctx.lineWidth = 4;
    ctx.beginPath(); ctx.arc(p.x, p.y, p.size * 1.45, 0, TAU); ctx.stroke();
    ctx.restore();
  }

  drawFishShape(p.x, p.y, p.ang, p.size, 'p_' + p.fishId, p.c1, p.c2, G.time, p.id * 2.1, alpha, false);

  /* P2 头顶标记，避免双人时认错自己 */
  if (G.coop){
    ctx.save();
    ctx.font = 'bold 10px "PingFang SC",sans-serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = rgba(p.c2, 0.85);
    ctx.fillText(p.label, p.x, p.y - p.size * 1.7);
    ctx.restore();
  }
}

function drawEnemy(e){
  var players = G.players;
  var minA = 1e9, maxB = 0;
  for (var i = 0; i < players.length; i++){
    if (players[i].dead) continue;
    minA = Math.min(minA, autoReach(players[i]));
    /* 可啃食上限：超过自己 2.2 倍的鱼啃起来太慢，不值得标记 */
    maxB = Math.max(maxB, players[i].size * 2.2);
  }
  if (minA === 1e9) minA = 0;

  /* 宝箱鱼：金色光环 + 宝箱图标 */
  if (e.chest){
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    var cg = ctx.createRadialGradient(e.x, e.y, 0, e.x, e.y, e.size * 2.6);
    cg.addColorStop(0, 'rgba(255,209,102,0.42)');
    cg.addColorStop(1, 'rgba(255,209,102,0)');
    ctx.fillStyle = cg;
    ctx.beginPath(); ctx.arc(e.x, e.y, e.size * 2.6, 0, TAU); ctx.fill();
    ctx.restore();
    drawPaperPickup(ctx, e.x, e.y - e.size * 1.55 + Math.sin(G.time * 3) * 3, 10, '#e8b36b', 'epic');
  }

  if (e.size > minA && e.size <= maxB){
    ctx.save();
    ctx.setLineDash([4, 6]);
    ctx.lineDashOffset = -G.time * 26;
    ctx.strokeStyle = rgba('#ffd166', 0.5);
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.arc(e.x, e.y, e.size * 1.35, 0, TAU);
    ctx.stroke();
    ctx.restore();
  }

  /* 可长器官的猎物：中心一个小实心点 */
  var ref = 1e9;
  for (var r = 0; r < players.length; r++) if (!players[r].dead) ref = Math.min(ref, players[r].size);
  if (ref < 1e9 && SPECIES[e.sid] && e.size >= ref * GENE_MIN_RATIO && e.size <= maxB){
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.beginPath();
    ctx.arc(e.x, e.y, 2.6, 0, TAU);
    ctx.fillStyle = rgba(SPECIES[e.sid].glow, 0.85);
    ctx.fill();
    ctx.restore();
  }

  if (!drawCodexFish(e.sid, e.x, e.y, e.ang, e.size, e.phase, e.phase * 0.7, G.time,
      e.stunT > 0 ? 0.72 : 1, e.flash > 0))
    drawFishShape(e.x, e.y, e.ang, e.size, e.shape, e.c1, e.c2,
      G.time, e.phase, e.stunT > 0 ? 0.72 : 1, e.flash > 0);

  if (e.stunT > 0){
    ctx.save();
    ctx.strokeStyle = rgba('#ddd6fe', 0.8);
    ctx.lineWidth = 1.6;
    for (var s = 0; s < 3; s++){
      var a = G.time * 9 + s * 2.1;
      ctx.beginPath();
      ctx.moveTo(e.x + Math.cos(a) * e.size, e.y + Math.sin(a) * e.size);
      ctx.lineTo(e.x + Math.cos(a + 1.6) * e.size * 1.5, e.y + Math.sin(a + 1.6) * e.size * 1.5);
      ctx.stroke();
    }
    ctx.restore();
  }

  if (e.tier === 2){
    ctx.save();
    ctx.strokeStyle = rgba('#ffd166', 0.65);
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(e.x, e.y, e.size * 1.5, 0, TAU); ctx.stroke();
    ctx.restore();
  }
}

function drawBoss(){
  var b = G.boss; if (!b) return;
  var alive = alivePlayers();
  var tx = alive.length ? alive[0].x : WORLD.w/2;
  var ty = alive.length ? alive[0].y : WORLD.h/2;
  var ang = b.def.g === 'venom' ? (tx >= b.x ? 0 : Math.PI) : Math.atan2(ty - b.y, tx - b.x);
  var gA = (b.def.g === 'ghost') ? b.ghostA : 1;
  ctx.save();
  ctx.globalAlpha = gA;
  var hit = drawCodexFish(bossDrawKey(b.idx), b.x, b.y, ang, b.size, G.time * 2.2, G.time * 1.3, G.time, 1, b.flash > 0);
  if (!hit) drawFishShape(b.x, b.y, ang, b.size, b.def.shape, b.def.c1, b.def.c2, G.time, 0, 1, b.flash > 0);
  ctx.restore();

  if (b.weakT > 0){
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    var r = b.size * (0.9 + Math.sin(G.time * 12) * 0.12);
    var rg = ctx.createRadialGradient(b.x, b.y, 0, b.x, b.y, r);
    rg.addColorStop(0, 'rgba(255,209,102,0.55)');
    rg.addColorStop(1, 'rgba(255,209,102,0)');
    ctx.fillStyle = rg;
    ctx.beginPath(); ctx.arc(b.x, b.y, r, 0, TAU); ctx.fill();
    ctx.restore();
  }
}

function render(){
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  ctx.clearRect(0, 0, W, H);
  drawBackground();
  drawReef(ctx, W, H, cam.y, cam.x, menuT + G.time);

  if (!G.p) return;

  var sh = G.shake > 0 ? G.shake : 0;
  var ox = (Math.random() - 0.5) * sh * 26;
  var oy = (Math.random() - 0.5) * sh * 26;

  ctx.save();
  ctx.translate(W/2 + ox, H/2 + oy);
  var punchZoom = cam.zoom * (1 + Math.max(0, G.punch) * 0.028);
  ctx.scale(punchZoom, punchZoom);
  ctx.translate(-cam.x, -cam.y);

  var v = viewRect();
  var pad = 150;

  /* 追赶者与水下据点：都画在世界层，压在鱼群之下 */
  drawChase(v);
  drawZones(v);
  const reefGateY = STAGE_DEPTH * 2 - 56;
  if (!G.reefCleared && reefGateY > v.y && reefGateY < v.y + v.h){
    ctx.save();
    ctx.strokeStyle = 'rgba(255,214,151,.6)';
    ctx.lineWidth = 2;
    ctx.setLineDash([8, 9]);
    ctx.beginPath();
    ctx.moveTo(v.x, reefGateY);
    ctx.lineTo(v.x + v.w, reefGateY);
    ctx.stroke();
    ctx.fillStyle = '#ffe2b4';
    ctx.font = 'bold 16px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('击败珊瑚守卫后开启', cam.x, reefGateY - 15);
    ctx.restore();
  }

  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (var i = 0; !LOWQ && i < G.bubbles.length; i++){
    var bb = G.bubbles[i];
    if (bb.x < v.x - 40 || bb.x > v.x + v.w + 40 || bb.y < v.y - 40 || bb.y > v.y + v.h + 40) continue;
    ctx.beginPath(); ctx.arc(bb.x, bb.y, bb.r, 0, TAU);
    ctx.fillStyle = rgba('#bfe9ff', bb.a * 0.5); ctx.fill();
  }
  for (var j = 0; !LOWQ && j < G.motes.length; j++){
    var mm = G.motes[j];
    if (mm.x < v.x - 20 || mm.x > v.x + v.w + 20 || mm.y < v.y - 20 || mm.y > v.y + v.h + 20) continue;
    ctx.beginPath(); ctx.arc(mm.x, mm.y, mm.r, 0, TAU);
    ctx.fillStyle = rgba('#e0f2ff', mm.a * 0.5); ctx.fill();
  }
  for (var k = 0; k < G.inks.length; k++){
    var ink = G.inks[k];
    var ig = ctx.createRadialGradient(ink.x, ink.y, 0, ink.x, ink.y, ink.r);
    ig.addColorStop(0, rgba('#1e1b4b', 0.55 * (ink.life / ink.max)));
    ig.addColorStop(1, rgba('#1e1b4b', 0));
    ctx.fillStyle = ig;
    ctx.beginPath(); ctx.arc(ink.x, ink.y, ink.r, 0, TAU); ctx.fill();
  }
  ctx.restore();

  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (var fdi = 0; fdi < G.foods.length; fdi++){
    var fd = G.foods[fdi];
    if (fd.x < v.x - 24 || fd.x > v.x + v.w + 24 || fd.y < v.y - 24 || fd.y > v.y + v.h + 24) continue;
    var prad = fd.size * (1 + Math.sin(fd.phase) * 0.16);
    ctx.beginPath(); ctx.arc(fd.x, fd.y, prad, 0, TAU);
    ctx.fillStyle = rgba(fd.color, 0.8); ctx.fill();
  }
  ctx.restore();

  /* 诱饵浮标：告诉玩家「海被引到那边去了」 */
  if (G.decoy){
    var dc = G.decoy;
    var dpul = 0.62 + Math.sin(dc.phase) * 0.38;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    var dg = ctx.createRadialGradient(dc.x, dc.y, 0, dc.x, dc.y, 132 * dpul);
    dg.addColorStop(0, 'rgba(252,211,77,0.50)');
    dg.addColorStop(1, 'rgba(252,211,77,0)');
    ctx.fillStyle = dg;
    ctx.beginPath(); ctx.arc(dc.x, dc.y, 132 * dpul, 0, TAU); ctx.fill();
    ctx.restore();

    ctx.save();
    ctx.strokeStyle = 'rgba(252,211,77,0.8)';
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(dc.x, dc.y, 17 + Math.sin(dc.phase * 1.5) * 4, 0, TAU); ctx.stroke();
    ctx.beginPath(); ctx.arc(dc.x, dc.y, 7, 0, TAU);
    ctx.fillStyle = 'rgba(252,211,77,0.92)'; ctx.fill();
    /* 剩余时间弧 */
    ctx.strokeStyle = 'rgba(255,255,255,0.5)';
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.arc(dc.x, dc.y, 28, -Math.PI / 2, -Math.PI / 2 + TAU * clamp(dc.t / dc.max, 0, 1));
    ctx.stroke();
    ctx.restore();
  }

  /* 掉落道具 */
  for (var ii = 0; ii < G.items.length; ii++){
    var it = G.items[ii];
    if (it.x < v.x - 40 || it.x > v.x + v.w + 40 || it.y < v.y - 40 || it.y > v.y + v.h + 40) continue;
    var bob = Math.sin(it.t0) * 3;
    var blink = it.life < 3 ? (Math.sin(G.time * 12) * 0.35 + 0.65) : 1;
    ctx.save();
    ctx.globalAlpha = blink;
    ctx.globalCompositeOperation = 'lighter';
    var ig2 = ctx.createRadialGradient(it.x, it.y + bob, 0, it.x, it.y + bob, it.r * 2.6);
    ig2.addColorStop(0, rgba(it.type.color, 0.55));
    ig2.addColorStop(1, rgba(it.type.color, 0));
    ctx.fillStyle = ig2;
    ctx.beginPath(); ctx.arc(it.x, it.y + bob, it.r * 2.6, 0, TAU); ctx.fill();
    ctx.restore();

    drawPaperPickup(ctx, it.x, it.y + bob, it.r * .75, it.type.color, it.type.rarity, Math.sin(it.t0) * .25, blink);
  }

  /* 海域环境物 */
  for (var hz2 = 0; hz2 < G.hazards.length; hz2++){
    var hz = G.hazards[hz2];
    if (hz.x < v.x - 180 || hz.x > v.x + v.w + 180 || hz.y < v.y - 180 || hz.y > v.y + v.h + 180) continue;
    if (hz.type === 'ice'){
      ctx.save();
      ctx.translate(hz.x, hz.y); ctx.rotate(hz.rot);
      ctx.beginPath();
      for (var k2 = 0; k2 < 6; k2++){
        var a2 = k2 / 6 * TAU;
        var rr2 = hz.r * (0.82 + 0.18 * Math.sin(k2 * 2.1 + G.time));
        if (k2 === 0) ctx.moveTo(Math.cos(a2) * rr2, Math.sin(a2) * rr2);
        else ctx.lineTo(Math.cos(a2) * rr2, Math.sin(a2) * rr2);
      }
      ctx.closePath();
      ctx.fillStyle = 'rgba(102,186,211,0.31)';
      ctx.strokeStyle = 'rgba(209,243,227,0.74)';
      ctx.lineWidth = 1.6;
      ctx.fill(); ctx.stroke();
      ctx.restore();
    } else if (hz.type === 'lava'){
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      var lg2 = ctx.createRadialGradient(hz.x, hz.y, 0, hz.x, hz.y, hz.r * 2.2);
      lg2.addColorStop(0, 'rgba(255,170,110,0.9)');
      lg2.addColorStop(1, 'rgba(255,90,40,0)');
      ctx.fillStyle = lg2;
      ctx.beginPath(); ctx.arc(hz.x, hz.y, hz.r * 2.2, 0, TAU); ctx.fill();
      ctx.restore();
    } else if (hz.type === 'shock'){
      var armed = hz.t <= 0;
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.strokeStyle = armed
        ? 'rgba(109,255,212,' + (0.55 + Math.sin(G.time * 30) * 0.35) + ')'
        : 'rgba(109,255,212,0.28)';
      ctx.lineWidth = armed ? 5 : 2;
      ctx.beginPath(); ctx.arc(hz.x, hz.y, hz.r, 0, TAU); ctx.stroke();
      ctx.restore();
    } else if (hz.type === 'venom'){
      ctx.save();
      var vg = ctx.createRadialGradient(hz.x, hz.y, 0, hz.x, hz.y, hz.r);
      vg.addColorStop(0, 'rgba(216,180,254,' + (0.38 + 0.14 * Math.sin(G.time * 4 + hz.phase)).toFixed(2) + ')');
      vg.addColorStop(1, 'rgba(132,60,180,0)');
      ctx.fillStyle = vg;
      ctx.beginPath(); ctx.arc(hz.x, hz.y, hz.r, 0, TAU); ctx.fill();
      ctx.restore();
    }
  }

  /* 磷光鳞片：视野外的敌鱼在屏幕边缘亮一点 —— 不是画给你看，是告诉你「那边有东西」 */
  var anyPhos = false;
  for (var pp3 = 0; pp3 < G.players.length; pp3++) if (G.players[pp3].phosphorT > 0) anyPhos = true;
  if (anyPhos){
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (var pe = 0; pe < G.enemies.length; pe++){
      var peE = G.enemies[pe];
      if (peE.x > v.x && peE.x < v.x + v.w && peE.y > v.y && peE.y < v.y + v.h) continue;
      var mx = clamp(peE.x, v.x + 28, v.x + v.w - 28);
      var my = clamp(peE.y, v.y + 28, v.y + v.h - 28);
      var pa2 = 0.34 + Math.sin(G.time * 4 + pe) * 0.14;
      ctx.beginPath(); ctx.arc(mx, my, peE.chest ? 7 : 4.5, 0, TAU);
      ctx.fillStyle = rgba(peE.chest ? '#ffd166' : (peE.c2 || '#67e8f9'), pa2);
      ctx.fill();
    }
    ctx.restore();
  }

  for (var e = 0; e < G.enemies.length; e++){
    var en = G.enemies[e];
    if (en.x < v.x - pad || en.x > v.x + v.w + pad || en.y < v.y - pad || en.y > v.y + v.h + pad) continue;
    drawEnemy(en);
  }

  for (var pl = 0; pl < G.players.length; pl++) drawPlayer(G.players[pl]);
  drawBoss();

  if (G.zaps.length){
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (var z = 0; z < G.zaps.length; z++){
      var zp = G.zaps[z];
      ctx.strokeStyle = rgba('#ddd6fe', zp.life / 0.22);
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(zp.x1, zp.y1);
      for (var sg = 1; sg <= 4; sg++){
        var tt = sg / 4;
        ctx.lineTo(lerp(zp.x1, zp.x2, tt) + (Math.random() - 0.5) * 30,
                   lerp(zp.y1, zp.y2, tt) + (Math.random() - 0.5) * 30);
      }
      ctx.stroke();
    }
    ctx.restore();
  }

  if (G.shockwave){
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    var sw = G.shockwave;
    ctx.strokeStyle = rgba(sw.color || '#fda4af', clamp(1 - sw.r / (sw.max || 300), 0, 1) * 0.8);
    ctx.lineWidth = 6;
    ctx.beginPath(); ctx.arc(sw.x, sw.y, sw.r, 0, TAU); ctx.stroke();
    ctx.restore();
  }

  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (var pi = 0; pi < G.particles.length; pi++){
    var q = G.particles[pi];
    var al = q.life / q.max;
    const shard = q.size * al;
    ctx.beginPath();
    ctx.moveTo(q.x - shard, q.y + shard * .28);
    ctx.lineTo(q.x + shard * .45, q.y - shard);
    ctx.lineTo(q.x + shard, q.y + shard * .62);
    ctx.closePath();
    ctx.fillStyle = rgba(q.color, al * .86);
    ctx.fill();
  }
  ctx.restore();

  /* 冲击环 */
  if (G.rings.length){
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (var ri3 = 0; ri3 < G.rings.length; ri3++){
      var rr3 = G.rings[ri3];
      var rl = clamp(rr3.life / rr3.maxLife, 0, 1);
      ctx.strokeStyle = rgba(rr3.color, rl * 0.85);
      ctx.lineWidth = 2 + rl * 5;
      ctx.setLineDash([rr3.r * .19, rr3.r * .063]);
      ctx.lineDashOffset = rr3.r * .11;
      ctx.beginPath(); ctx.arc(rr3.x, rr3.y, rr3.r, 0, TAU); ctx.stroke();
    }
    ctx.restore();
  }

  for (var fi = 0; fi < G.floaters.length; fi++){
    var fl = G.floaters[fi];
    var a3 = clamp(fl.life / fl.max, 0, 1);
    ctx.save();
    ctx.font = (fl.big ? 'bold ' : '') + Math.round(fl.big ? 22 : 15) + 'px "PingFang SC",system-ui,sans-serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = rgba(fl.color, a3);
    ctx.shadowColor = fl.color; ctx.shadowBlur = 12;
    ctx.fillText(fl.text, fl.x, fl.y);
    ctx.restore();
  }

  ctx.restore();

  /* 海域视觉压力：幽暗 / 深渊是实打实看不清 */
  var seaNow = seaOf(G.stage);
  if (seaNow.mod === 'abyss' || seaNow.mod === 'dark'){
    var darkA = seaNow.mod === 'abyss' ? 0.84 : 0.52;
    var vgn = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.16, W / 2, H / 2, Math.max(W, H) * 0.60);
    vgn.addColorStop(0, 'rgba(0,0,0,0)');
    vgn.addColorStop(1, 'rgba(0,0,0,' + darkA + ')');
    ctx.fillStyle = vgn; ctx.fillRect(0, 0, W, H);
  }

  /* 追赶者逼近：屏幕边缘红色脉冲，离得越近跳得越快 */
  if (G.chase && G.p && !G.p.dead){
    var gapPx = G.p.y - G.chase.y;
    if (gapPx < 420){
      var wa = clamp(1 - gapPx / 420, 0, 1);
      var pulse = 0.6 + 0.4 * Math.sin(G.time * (5 + wa * 5));
      var rg2 = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.30, W / 2, H / 2, Math.max(W, H) * 0.62);
      rg2.addColorStop(0, 'rgba(0,0,0,0)');
      rg2.addColorStop(1, 'rgba(190,30,40,' + (0.30 * wa * pulse).toFixed(3) + ')');
      ctx.fillStyle = rg2; ctx.fillRect(0, 0, W, H);
    }
  }

  drawBanners();

  for (var bp = 0; bp < G.players.length; bp++){
    if (G.players[bp].chompAnim <= 0) continue;
    var vg = ctx.createRadialGradient(W/2, H/2, Math.min(W, H) * 0.34, W/2, H/2, Math.max(W, H) * 0.72);
    vg.addColorStop(0, 'rgba(255,209,102,0)');
    vg.addColorStop(1, 'rgba(255,140,60,' + (0.18 * G.players[bp].chompAnim / 0.22) + ')');
    ctx.fillStyle = vg; ctx.fillRect(0, 0, W, H);
    break;
  }

  /* 白闪（重击） */
  if (G.flashT > 0){
    ctx.fillStyle = 'rgba(255,255,255,' + (G.flashT / 0.10 * 0.16) + ')';
    ctx.fillRect(0, 0, W, H);
  }

  /* 宝箱抽奖动画 */
  if (G.chestAnim) drawChestAnim();

  drawHUD();
}

/* ============================================================
   宝箱抽奖动画
   ------------------------------------------------------------
   吃到宝箱鱼时游戏暂停，播一段开箱：箱体弹起 → 箱盖翻开 → 两张卡依次弹出。
   抽奖的仪式感值这几秒 —— 它是「我这局捡到了什么」的唯一高光时刻。
   ============================================================ */
function roundRect(x, y, w, h, r){
  r = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}
function overEase(t){
  var c = 1.70158, c3 = c + 1;
  return 1 + c3 * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2);
}

function drawItemCard(t, x, y, s){
  var R = ITEM_RARITY[t.rarity] || ITEM_RARITY.common;
  var w = s * 2.05, h = s * 1.1;
  ctx.save();
  ctx.translate(x, y);

  ctx.fillStyle = 'rgba(8,20,38,0.97)';
  ctx.strokeStyle = R.color;
  ctx.lineWidth = 2;
  roundRect(-w / 2, -h / 2, w, h, 11);
  ctx.fill(); ctx.stroke();

  /* 左上角图标 */
  ctx.save();
  ctx.shadowColor = R.color; ctx.shadowBlur = 16;
  ctx.beginPath(); ctx.arc(-w / 2 + 30, 0, 18, 0, TAU);
  ctx.fillStyle = rgba(R.color, 0.16); ctx.fill();
  ctx.lineWidth = 1.4; ctx.strokeStyle = rgba(R.color, 0.7); ctx.stroke();
  ctx.shadowBlur = 0;
  drawPaperPickup(ctx, -w / 2 + 30, 1, 13, t.color, t.rarity);
  ctx.restore();

  /* 文案 */
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  ctx.font = 'bold 14px "PingFang SC",system-ui,sans-serif';
  ctx.fillStyle = R.color;
  ctx.fillText(t.name, -w / 2 + 58, -8);
  ctx.font = '11px "PingFang SC",system-ui,sans-serif';
  ctx.fillStyle = 'rgba(198,224,245,0.85)';
  var desc = t.desc.length > 17 ? t.desc.slice(0, 17) + '…' : t.desc;
  ctx.fillText(desc, -w / 2 + 58, 10);

  /* 稀有度角标 */
  ctx.font = '9px "PingFang SC",sans-serif';
  ctx.fillStyle = rgba(R.color, 0.7);
  ctx.textAlign = 'right';
  ctx.fillText(R.name, w / 2 - 10, -h / 2 + 15);

  ctx.restore();
}

function drawChestAnim(){
  var ca = G.chestAnim;
  if (!ca) return;
  var t = ca.t;
  var cx = W / 2, cy = H * 0.38;

  /* 压暗背景 */
  var dim = clamp(t / 0.3, 0, 1) * 0.62;
  ctx.fillStyle = 'rgba(2,6,15,' + dim + ')';
  ctx.fillRect(0, 0, W, H);

  var openT = clamp((t - 0.5) / 0.42, 0, 1);

  /* 开箱光柱 */
  if (t > 0.5){
    var la = clamp((t - 0.5) / 0.3, 0, 1);
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    var lg = ctx.createRadialGradient(cx, cy, 0, cx, cy, 340);
    lg.addColorStop(0, 'rgba(255,209,102,' + (0.30 * la) + ')');
    lg.addColorStop(1, 'rgba(255,209,102,0)');
    ctx.fillStyle = lg;
    ctx.beginPath(); ctx.arc(cx, cy, 340, 0, TAU); ctx.fill();
    /* 放射线 */
    ctx.strokeStyle = 'rgba(255,226,150,' + (0.22 * la) + ')';
    ctx.lineWidth = 2;
    for (var i = 0; i < 12; i++){
      var ang = i / 12 * TAU + t * 0.5;
      ctx.beginPath();
      ctx.moveTo(cx + Math.cos(ang) * 60, cy + Math.sin(ang) * 60);
      ctx.lineTo(cx + Math.cos(ang) * 250, cy + Math.sin(ang) * 250);
      ctx.stroke();
    }
    ctx.restore();
  }

  /* 箱体 */
  var popScale = 1;
  if (t < 0.5) popScale = overEase(clamp(t / 0.38, 0, 1));
  var bw = 128 * popScale, bh = 86 * popScale;

  ctx.save();
  ctx.translate(cx, cy);

  /* 箱身 */
  var body = ctx.createLinearGradient(0, 0, 0, bh / 2);
  body.addColorStop(0, '#9c6620');
  body.addColorStop(1, '#4a2f0e');
  ctx.fillStyle = body;
  ctx.strokeStyle = '#ffd166';
  ctx.lineWidth = 3;
  roundRect(-bw / 2, 0, bw, bh / 2, 8);
  ctx.fill(); ctx.stroke();

  /* 箱盖：绕左侧铰链翻起 */
  ctx.save();
  ctx.translate(-bw / 2, 0);
  ctx.rotate(-openT * 1.15);
  var lid = ctx.createLinearGradient(0, -26 * popScale, 0, 4);
  lid.addColorStop(0, '#c98429');
  lid.addColorStop(1, '#8a5718');
  ctx.fillStyle = lid;
  ctx.strokeStyle = '#ffd166';
  roundRect(0, -26 * popScale, bw, 30 * popScale, 7);
  ctx.fill(); ctx.stroke();
  /* 盖上的锁扣 */
  ctx.fillStyle = '#ffd166';
  roundRect(bw / 2 - 12, 0, 24 * popScale, 10, 3);
  ctx.fill();
  ctx.restore();

  /* 锁（未开时） */
  if (openT < 0.25){
    ctx.fillStyle = '#ffd166';
    roundRect(-10, 2, 20, 20, 4);
    ctx.fill();
  }
  ctx.restore();

  /* 卡片依次弹出 */
  var n = ca.items.length;
  for (var k = 0; k < n; k++){
    var start = 0.92 + k * 0.36;
    var p2 = clamp((t - start) / 0.36, 0, 1);
    if (p2 <= 0) continue;
    var itx = cx + (k - (n - 1) / 2) * Math.min(230, W * 0.26);
    var ity = cy + bh / 2 + 118;
    ctx.save();
    ctx.globalAlpha = clamp(p2 * 2.2, 0, 1);
    ctx.translate(itx, ity);
    ctx.scale(overEase(p2), overEase(p2));
    drawItemCard(ca.items[k], 0, 0, 82);
    ctx.restore();
  }

  /* 标题 */
  if (t > 0.45){
    ctx.save();
    ctx.globalAlpha = clamp((t - 0.45) / 0.35, 0, 1);
    ctx.textAlign = 'center';
    ctx.font = 'bold 12px "PingFang SC",system-ui,sans-serif';
    ctx.fillStyle = 'rgba(255,209,102,0.85)';
    ctx.fillText('宝 箱 鱼 · 开 箱', cx, cy - 118);
    ctx.restore();
  }
}

/* ============================================================
   HUD
   ============================================================ */
/* ------------------------------------------------------------
   触屏控件绘制（屏幕坐标，盖在 HUD 之上）
   ------------------------------------------------------------ */
function drawStick(){
  var jr = TC.jr;
  var jx = mIn.joy ? mIn.bx : TC.joy.x;
  var jy = mIn.joy ? mIn.by : TC.joy.y;
  ctx.save();
  ctx.globalAlpha = mIn.joy ? 1 : 0.5;

  ctx.beginPath(); ctx.arc(jx, jy, jr, 0, TAU);
  ctx.fillStyle = 'rgba(6,20,38,0.42)';
  ctx.fill();
  ctx.lineWidth = 1.4;
  ctx.strokeStyle = 'rgba(125,232,255,0.42)';
  ctx.stroke();

  /* 四向刻度：纯圆盘没方向感，加四个小刻度好认 */
  ctx.strokeStyle = 'rgba(125,232,255,0.22)';
  ctx.lineWidth = 1;
  for (var i = 0; i < 4; i++){
    var ang = i * Math.PI / 2;
    var ca = Math.cos(ang), sa = Math.sin(ang);
    ctx.beginPath();
    ctx.moveTo(jx + ca * (jr - 9), jy + sa * (jr - 9));
    ctx.lineTo(jx + ca * (jr - 3), jy + sa * (jr - 3));
    ctx.stroke();
  }

  var hx = jx + mIn.mx * jr * 0.58, hy = jy + mIn.my * jr * 0.58;
  var hr = jr * 0.40;
  var hg = ctx.createRadialGradient(hx, hy - hr * 0.3, 0, hx, hy, hr);
  hg.addColorStop(0, 'rgba(200,250,255,0.88)');
  hg.addColorStop(1, 'rgba(60,150,205,0.5)');
  ctx.beginPath(); ctx.arc(hx, hy, hr, 0, TAU);
  ctx.fillStyle = hg; ctx.fill();
  ctx.strokeStyle = 'rgba(183,243,255,0.95)';
  ctx.lineWidth = 1.8; ctx.stroke();
  ctx.restore();
}

function drawTopButtons(){
  for (var i = 0; i < TC.top.length; i++){
    var b = TC.top[i];
    var on = b.id === 'codex' ? !!G.codexOpen : !!G.paused;
    ctx.save();
    ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, TAU);
    ctx.fillStyle = on ? 'rgba(125,232,255,0.2)' : 'rgba(6,20,38,0.44)';
    ctx.fill();
    ctx.strokeStyle = on ? 'rgba(183,243,255,0.9)' : 'rgba(125,232,255,0.38)';
    ctx.lineWidth = 1.3; ctx.stroke();
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.font = 'bold ' + Math.round(b.r * 0.86) + 'px "PingFang SC",system-ui,sans-serif';
    ctx.fillStyle = 'rgba(200,240,255,0.92)';
    ctx.fillText(b.glyph, b.x, b.y + 1);
    ctx.restore();
  }
}

function drawTouchButtons(){
  var P = G.players[0];
  if (!P) return;

  for (var i = 0; i < TC.btns.length; i++){
    var b = TC.btns[i];
    if (!btnVisible(b)) continue;

    var ready = true, cd = 0, main = '#22c1ff';
    if (b.id === 'chomp'){
      ready = P.chompCd <= 0 && P.chompRecover <= 0;
      cd = Math.max(P.chompCd, P.chompRecover, 0);
      main = '#ffd166';
    } else if (b.id === 'dash'){
      ready = P.dashCd <= 0;
      cd = Math.max(P.dashCd, 0);
      main = '#22c1ff';
    } else if (b.id === 'skill'){
      ready = P.skillCd <= 0 && P.inflateT <= 0;
      cd = P.inflateT > 0 ? P.inflateT : Math.max(P.skillCd, 0);
      main = '#fed7aa';
    } else {
      /* 封印：有货就一直亮，越亮越催你按 */
      ready = true;
      cd = 0;
      main = '#c4b5fd';
    }

    var rad = b.r * (mIn.down[b.id] ? 0.93 : 1);
    ctx.save();
    ctx.globalAlpha = ready ? 0.97 : 0.66;

    ctx.beginPath(); ctx.arc(b.x, b.y, rad, 0, TAU);
    if (ready){
      var gg = ctx.createRadialGradient(b.x, b.y - rad * 0.45, rad * 0.1, b.x, b.y, rad);
      gg.addColorStop(0, rgba(main, 0.36));
      gg.addColorStop(1, rgba(main, 0.14));
      ctx.fillStyle = gg;
    } else {
      ctx.fillStyle = 'rgba(8,22,40,0.6)';
    }
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = rgba(main, ready ? 0.88 : 0.3);
    ctx.stroke();

    /* 冷却扇形：从 12 点方向顺时针填满，扫完就绪 */
    if (cd > 0.03){
      var frac = clamp(cd / (b.id === 'chomp' ? 1.1 : b.id === 'dash' ? 1.4 : 8), 0, 1);
      ctx.beginPath();
      ctx.moveTo(b.x, b.y);
      ctx.arc(b.x, b.y, rad - 1, -Math.PI / 2, -Math.PI / 2 + TAU * frac);
      ctx.closePath();
      ctx.fillStyle = 'rgba(2,8,18,0.48)';
      ctx.fill();
    }

    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    if (cd > 0.05){
      ctx.font = 'bold ' + Math.round(b.r * 0.5) + 'px ui-monospace,monospace';
      ctx.fillStyle = 'rgba(214,238,252,0.92)';
      ctx.fillText(cd.toFixed(1), b.x, b.y + 1);
    } else {
      ctx.font = 'bold ' + Math.round(b.r * 0.62) + 'px "PingFang SC",system-ui,sans-serif';
      ctx.fillStyle = ready ? '#04121f' : 'rgba(170,200,220,0.72)';
      ctx.fillText(b.glyph, b.x, b.y + 1);
    }
    ctx.restore();
  }
}

function drawTouchUI(){
  if (!MOBILE || G.mode !== 'play' || !G.p || G.coop) return;
  drawTopButtons();
  if (G.paused) return;
  drawStick();
  drawTouchButtons();
}

function drawHUD(){
  if (!G.p || G.mode === 'menu') return;
  /* 手机安全区：用局部 W/H 覆盖全局值，靠右/靠底的对齐就自动避开刘海与手势条，
     不用把每一处坐标都改一遍。真实屏幕尺寸另存 SW/SH，给满屏遮罩用。 */
  const SW = cv.width / DPR, SH = cv.height / DPR;
  let W = SW - (MOBILE ? SAFE.l + SAFE.r : 0);
  let H = SH - (MOBILE ? SAFE.b + SAFE.t : 0);
  ctx.save();
  ctx.globalAlpha = 1;          /* 防上游泄漏：转场/特效残留会把整个 HUD 压暗 */
  if (MOBILE && (SAFE.l || SAFE.t)) ctx.translate(SAFE.l, SAFE.t);

  const hudWidth = MOBILE ? 136 : 214;
  const hudHeight = G.stage > 2 ? 98 : 76;
  const panel = ctx.createLinearGradient(0, 12, hudWidth, 110);
  panel.addColorStop(0, '#0a203bf2');
  panel.addColorStop(1, '#122e49bf');
  ctx.fillStyle = panel;
  ctx.strokeStyle = '#a1e4d352';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(12, 12);
  ctx.lineTo(hudWidth, 12);
  ctx.lineTo(hudWidth + 13, 24);
  ctx.lineTo(hudWidth + 13, hudHeight + 12);
  ctx.lineTo(12, hudHeight + 12);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#f7bf86';
  ctx.fillRect(12, 19, 2, 21);
  ctx.textAlign = 'left';
  ctx.font = (MOBILE ? 'bold 12px ' : 'bold 15px ') + '"PingFang SC",system-ui,sans-serif';
  ctx.fillStyle = '#fff0cf';
  ctx.fillText(seaOf(G.stage).name + ' · 第 ' + G.stage + ' 段/' + G.totalStages + (G.coop ? '  ·  双人' : ''), 22, 34, hudWidth - 17);

  ctx.font = '13px "PingFang SC",system-ui,sans-serif';
  ctx.fillStyle = 'rgba(143,180,208,0.95)';
  ctx.fillText('深度 ' + depthM(G.p.y) + ' m' + (G.boss ? '  ·  ⚠ 击败 Boss' : ''), 22, 56, hudWidth - 17);

  /* 追击距离：这是本作唯一的「倒计时」 */
  if (G.chase){
    var gapM = Math.max(0, Math.round((G.p.y - G.chase.y) * 0.25));
    ctx.font = '11.5px "PingFang SC",system-ui,sans-serif';
    if (gapM < 25){
      ctx.fillStyle = '#fb7185';
      ctx.fillText('⚠ 追赶者咬到了！快下潜！', 22, 76);
    } else {
      ctx.fillStyle = gapM < 105 ? '#fda4af' : 'rgba(143,180,208,0.85)';
      ctx.fillText('追击 ' + gapM + ' m' + (G.chase.form === 'whale' ? ' · 🐋 蓝鲸' : G.chase.form === 'poll' ? ' · ☣ 污染' : ' · 🌋 岩浆'), 22, 76);
    }
  }

  if (G.story && G.stage > 2) {
    const color = ['#8fefd4', '#f5da82', '#ff9c65', '#ff625e'][alertBand(G.story.alert)];
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(26, 94, 3.2, 0, TAU);
    ctx.fill();
    ctx.font = '11px system-ui,sans-serif';
    ctx.fillText('信号追踪', 35, 98);
  }
  if (G.story?.radio && G.time < G.story.radioUntil && !G.paused && G.mode === 'play'){
    const width = Math.min(W - 36, 370);
    const row = MOBILE ? H - 147 : H - 90;
    ctx.fillStyle = 'rgba(5,18,42,.88)';
    ctx.fillRect(18, row, width, 43);
    ctx.fillStyle = '#ff805f';
    ctx.fillRect(18, row, 3, 43);
    ctx.font = '10px ui-monospace,monospace';
    ctx.fillStyle = '#8df2dc';
    ctx.fillText('T-07  /  截获通讯', 30, row + 15);
    ctx.font = '12px system-ui,sans-serif';
    ctx.fillStyle = '#fbefd2';
    ctx.fillText(G.story.radio, 30, row + 33, width - 23);
  }

  /* 右上：体型 */
  ctx.textAlign = 'right';
  var yy = 36;
  for (var i = 0; i < G.players.length; i++){
    var p = G.players[i];
    ctx.font = 'bold 20px "PingFang SC",system-ui,sans-serif';
    ctx.fillStyle = p.dead ? 'rgba(150,170,190,0.5)' : '#eafcff';
    ctx.fillText(Math.round(p.size), W - 22, yy);
    ctx.font = '10.5px "PingFang SC",system-ui,sans-serif';
    ctx.fillStyle = rgba(p.c2, 0.9);
    ctx.fillText(p.label + (p.dead ? ' 灵魂' : '') + (p.shield > 0 ? '  🛡×' + p.shield : ''), W - 74, yy - 2);
    yy += 30;
  }
  ctx.font = 'bold 14px "PingFang SC",system-ui,sans-serif';
  ctx.fillStyle = 'rgba(255,209,102,0.95)';
  ctx.fillText(G.p.score.toLocaleString(), W - 22, yy + 4);

  /* 体型刻度：480 是个看不见的数字，玩家长到 300 也不知道自己走到哪了。
     这根条就是「称霸进度」——白线是本段生态上限，越过它这片海就归你。 */
  var hb = G.players[G.players.length - 1];
  if (hb && !hb.dead){
    var barW2 = 134, barH2 = 6;
    var bx4 = W - 22 - barW2, by4 = yy + 20;
    var frac = clamp(hb.size / WHALE, 0, 1);
    var capFrac = clamp(Math.min(hb.maxSize, ecoScale(G.stage) * ECO_CAP_MUL) / WHALE, 0, 1);

    ctx.fillStyle = 'rgba(255,255,255,0.10)';
    roundRect(bx4, by4, barW2, barH2, 3);
    ctx.fill();

    if (frac > 0.002){
      var fg = ctx.createLinearGradient(bx4, 0, bx4 + barW2, 0);
      fg.addColorStop(0, '#2f80c0');
      fg.addColorStop(0.72, '#7de8ff');
      fg.addColorStop(1, '#ffd166');
      ctx.fillStyle = fg;
      roundRect(bx4, by4, Math.max(4, barW2 * frac), barH2, 3);
      ctx.fill();
    }

    if (capFrac < 0.985){
      ctx.fillStyle = 'rgba(255,255,255,0.5)';
      ctx.fillRect(bx4 + barW2 * capFrac - 1, by4 - 3, 2, barH2 + 6);
    }

    ctx.font = '9.5px ui-monospace,monospace';
    ctx.textAlign = 'right';
    ctx.fillStyle = frac >= 0.985 ? '#ffd166' : 'rgba(160,195,220,0.82)';
    ctx.fillText(frac >= 0.985 ? '已到蓝鲸' : '蓝鲸 ' + Math.round(frac * 100) + '%', W - 22, by4 + 19);
  }

  /* 右上：深海柱小地图（体型条下面，竖条总览） */
  drawMinimap(yy + 64);

  /* 左下：器官槽位 */
  var bx = MOBILE ? 14 : 20;
  if (MOBILE && !G.coop){
    /* 手机：槽位挪到左上，把整个左下角让给摇杆 */
    var PM = G.players[0];
    var ym = 106;
    for (var sm = 0; sm < PM.maxSlots; sm++){
      var ymr = ym + sm * 25;
      var sidm = PM.slots[sm];
      if (!sidm){
        ctx.textAlign = 'left';
        ctx.font = '10.5px "PingFang SC",system-ui,sans-serif';
        ctx.fillStyle = 'rgba(110,135,160,0.45)';
        ctx.fillText('空槽位', bx, ymr + 10);
        continue;
      }
      var SM = SPECIES[sidm], lvm = PM.levels[sidm];
      ctx.textAlign = 'left';
      ctx.font = 'bold 11.5px "PingFang SC",system-ui,sans-serif';
      ctx.fillStyle = SM.glow;
      ctx.fillText(SM.name, bx, ymr + 10);
      for (var km = 0; km < 3; km++){
        ctx.beginPath();
        ctx.arc(bx + 50 + km * 9, ymr + 6, 2.9, 0, TAU);
        ctx.fillStyle = km < lvm ? SM.color : 'rgba(255,255,255,0.13)';
        ctx.fill();
      }
      if (lvm < 3){
        var pm0 = lvm > 0 ? GENE_GATE[lvm - 1] : 0;
        var pm1 = GENE_GATE[lvm];
        var rm = clamp((PM.genes[sidm] - pm0) / Math.max(1, pm1 - pm0), 0, 1);
        ctx.fillStyle = 'rgba(255,255,255,0.10)';
        ctx.fillRect(bx + 84, ymr + 2, 52, 6);
        ctx.fillStyle = SM.color;
        ctx.fillRect(bx + 84, ymr + 2, 52 * rm, 6);
      } else {
        ctx.font = 'bold 9.5px ui-monospace,monospace';
        ctx.fillStyle = rgba(SM.glow, 0.9);
        ctx.fillText('MAX', bx + 84, ymr + 9);
      }
    }
  } else if (G.coop){
    var rowH2 = 26;
    var by2 = H - 52 - G.players.length * rowH2;
    for (var pi = 0; pi < G.players.length; pi++){
      var pp = G.players[pi];
      var y2 = by2 + pi * rowH2;
      ctx.textAlign = 'left';
      ctx.font = 'bold 11px "PingFang SC",system-ui,sans-serif';
      ctx.fillStyle = rgba(pp.c2, pp.dead ? 0.4 : 0.95);
      ctx.fillText(pp.label, bx, y2 + 11);
      for (var s = 0; s < pp.maxSlots; s++){
        var sid = pp.slots[s];
        var sx = bx + 30 + s * 132;
        if (!sid){
          ctx.font = '10.5px "PingFang SC",system-ui,sans-serif';
          ctx.fillStyle = 'rgba(110,135,160,0.4)';
          ctx.fillText('空槽位', sx, y2 + 11);
          continue;
        }
        var S = SPECIES[sid];
        var lv = pp.levels[sid];
        ctx.font = 'bold 11px "PingFang SC",system-ui,sans-serif';
        ctx.fillStyle = S.glow;
        ctx.fillText(S.name, sx, y2 + 11);
        for (var k = 0; k < 3; k++){
          ctx.beginPath();
          ctx.arc(sx + 54 + k * 8, y2 + 7, 2.8, 0, TAU);
          ctx.fillStyle = k < lv ? S.color : 'rgba(255,255,255,0.13)';
          ctx.fill();
        }
        if (lv < 3){
          ctx.font = '9.5px ui-monospace,monospace';
          ctx.fillStyle = 'rgba(150,185,210,0.8)';
          ctx.fillText(pp.genes[sid] + '/' + GENE_GATE[lv], sx + 84, y2 + 11);
        }
      }
    }
  } else {
    var rowH = 30;
    var cands = [];
    for (var ci = 0; ci < SP_KEYS.length; ci++){
      var cid = SP_KEYS[ci];
      if (p2().slots.indexOf(cid) >= 0) continue;
      if (p2().genes[cid] > 0) cands.push(cid);
    }
    cands.sort(function(a, b){ return p2().genes[b] - p2().genes[a]; });
    cands = cands.slice(0, 2);

    var P = G.players[0];
    var totalRows = P.maxSlots + (cands.length ? 1 : 0);
    var by = H - 46 - totalRows * rowH;

    for (var s2 = 0; s2 < P.maxSlots; s2++){
      var y = by + s2 * rowH;
      var sid2 = P.slots[s2];
      if (!sid2){
        ctx.font = '11.5px "PingFang SC",system-ui,sans-serif';
        ctx.fillStyle = 'rgba(110,135,160,0.5)';
        ctx.fillText('空槽位 · 吃够 6 点基因即可激活', bx, y + 12);
        continue;
      }
      var S2 = SPECIES[sid2];
      var lv2 = P.levels[sid2];
      ctx.font = 'bold 12px "PingFang SC",system-ui,sans-serif';
      ctx.fillStyle = S2.glow;
      ctx.fillText(S2.name, bx, y + 11);
      ctx.font = '10px "PingFang SC",system-ui,sans-serif';
      ctx.fillStyle = rgba(S2.color, 0.85);
      ctx.fillText(S2.org, bx + 52, y + 11);

      for (var k2 = 0; k2 < 3; k2++){
        ctx.beginPath();
        ctx.arc(bx + 96 + k2 * 9, y + 7, 3, 0, TAU);
        ctx.fillStyle = k2 < lv2 ? S2.color : 'rgba(255,255,255,0.13)';
        ctx.fill();
      }

      var barX = bx + 128, barW = 74;
      ctx.fillStyle = 'rgba(255,255,255,0.08)';
      ctx.fillRect(barX, y + 3, barW, 7);
      if (lv2 < 3){
        var prev = lv2 > 0 ? GENE_GATE[lv2 - 1] : 0;
        var next = GENE_GATE[lv2];
        var ratio = clamp((P.genes[sid2] - prev) / Math.max(1, next - prev), 0, 1);
        ctx.fillStyle = S2.color;
        ctx.fillRect(barX, y + 3, barW * ratio, 7);
        ctx.font = '10px ui-monospace,monospace';
        ctx.fillStyle = 'rgba(160,195,220,0.85)';
        ctx.fillText(P.genes[sid2] + '/' + next, barX + barW + 6, y + 10);
      } else {
        ctx.fillStyle = S2.color;
        ctx.fillRect(barX, y + 3, barW, 7);
        ctx.font = '10px "PingFang SC",sans-serif';
        ctx.fillStyle = rgba(S2.glow, 0.9);
        ctx.fillText('MAX', barX + barW + 6, y + 10);
      }
      if (lv2 > 0){
        ctx.font = '10px "PingFang SC",system-ui,sans-serif';
        ctx.fillStyle = 'rgba(140,175,200,0.85)';
        ctx.fillText(S2.organs[lv2 - 1].name, bx + 230, y + 10);
      }
    }

    if (cands.length){
      var cy = by + P.maxSlots * rowH;
      ctx.font = '11px "PingFang SC",system-ui,sans-serif';
      ctx.fillStyle = 'rgba(130,165,190,0.8)';
      var txt = '下一步： ';
      for (var c = 0; c < cands.length; c++){
        var cid2 = cands[c], CS = SPECIES[cid2];
        txt += CS.name + ' ' + P.genes[cid2] + '/' + GENE_GATE[0] + '   ';
      }
      ctx.fillText(txt, bx, cy + 11);
    }
  }

  /* 底部 HUD 基准坐标：必须在 buff 条之前声明，
     否则 buff 会被画到 NaN 坐标上（这个坑之前一直在，buff 从来没露过面） */
  var cx2 = W / 2, dy = H - 30;

  /* 道具 buff 条 */
  var P0 = G.players[0];
  if (P0){
    var buffs = [];
    if (P0.inflateT > 0) buffs.push(['👑', P0.inflateT, '#ffd166']);
    if (P0.fangT > 0)    buffs.push(['🦷', P0.fangT, '#fb7185']);
    if (P0.frenzyT > 0)  buffs.push(['🌊', P0.frenzyT, '#38bdf8']);
    if (P0.hotT > 0)     buffs.push(['♨', P0.hotT, '#ff8e53']);
    if (P0.itemSpdT > 0) buffs.push(['⚡', P0.itemSpdT, '#22d3ee']);
    if (P0.itemMagT > 0) buffs.push(['🧲', P0.itemMagT, '#f472b6']);
    if (P0.stealthT > 0) buffs.push(['🖤', P0.stealthT, '#94a3b8']);
    if (P0.nettleT > 0)  buffs.push(['✳', P0.nettleT, '#c4b5fd']);
    if (P0.phosphorT > 0) buffs.push(['✧', P0.phosphorT, '#67e8f9']);
    if (P0.fearT > 0)    buffs.push(['☣', P0.fearT, '#fda4af']);
    if (P0.chainT > 0)   buffs.push(['✹', P0.chainT, '#fb923c']);
    if (P0.bloodT > 0)   buffs.push(['🩸', P0.bloodT, '#ef4444']);
    if (G.stasisT > 0)   buffs.push(['⏳', G.stasisT, '#38bdf8']);
    if (G.curseStage === G.stage) buffs.push(['☠', -1, '#a78bfa']);
    if (P0.eyeT > 0)     buffs.push(['👁', -1, '#7dd3fc']);
    if (P0.shield > 0)   buffs.push(['🛡', -1, '#a78bfa', P0.shield]);
    if (buffs.length){
      var bw3 = 0;
      for (var bi2 = 0; bi2 < buffs.length; bi2++) bw3 += (buffs[bi2][1] > 0 ? 54 : 34);
      var bxp = W / 2 - bw3 / 2;

      /* 底条：这行图标不加深色背景，在深海里会糊成一片 */
      ctx.save();
      ctx.fillStyle = 'rgba(5,13,26,0.66)';
      roundRect(bxp - 12, dy - 92, bw3 + 22, 26, 8);
      ctx.fill();
      ctx.restore();

      for (var bj = 0; bj < buffs.length; bj++){
        var bf = buffs[bj];
        var cellW = bf[1] > 0 ? 54 : 34;
        ctx.font = '14px "PingFang SC","Apple Color Emoji",system-ui,sans-serif';
        ctx.textAlign = 'left';
        ctx.fillStyle = bf[2];
        ctx.shadowColor = bf[2];
        ctx.shadowBlur = 6;
        ctx.fillText(bf[0] + (bf[3] ? '×' + bf[3] : ''), bxp, dy - 74);
        ctx.shadowBlur = 0;
        if (bf[1] > 0){
          ctx.font = 'bold 10.5px ui-monospace,monospace';
          ctx.fillStyle = 'rgba(210,232,250,0.92)';
          ctx.fillText(bf[1].toFixed(0) + 's', bxp + 19, dy - 74);
        }
        bxp += cellW;
      }
    }

    /* 封印槽：史诗道具不立刻生效，等你按 Q（手机上由「封」键承担） */
    if (P0.sealed && !MOBILE){
      var sT = P0.sealed;
      var sw = 186, sh = 30;
      var sxS = W / 2 - sw / 2, syS = H - 172;
      var puls = 0.5 + Math.sin(G.time * 4) * 0.5;
      ctx.save();
      ctx.fillStyle = 'rgba(6,16,32,0.84)';
      roundRect(sxS, syS, sw, sh, 8);
      ctx.fill();
      ctx.strokeStyle = rgba(sT.color, 0.5 + puls * 0.45);
      ctx.lineWidth = 1.6;
      ctx.stroke();
      ctx.shadowColor = sT.color;
      ctx.shadowBlur = 8 + puls * 12;
      ctx.font = '13px "PingFang SC",system-ui,sans-serif';
      ctx.textAlign = 'left';
      ctx.fillStyle = sT.color;
      drawPaperPickup(ctx, sxS + 15, syS + 15, 6, sT.color, sT.rarity);
      ctx.fillText(sT.name, sxS + 26, syS + 20);
      ctx.shadowBlur = 0;
      ctx.font = 'bold 11px "PingFang SC",system-ui,sans-serif';
      ctx.textAlign = 'right';
      ctx.fillStyle = 'rgba(255,235,180,' + (0.6 + puls * 0.4) + ')';
      ctx.fillText('Q 释放', sxS + sw - 12, syS + 20);
      ctx.restore();
    }
  }

  /* 底部中间：冲刺 / 撕咬 */
  ctx.textAlign = 'center';
  if (MOBILE){
    /* 手机：就绪与冷却直接画在按键上，这里不再重复一遍文字 */
  } else if (!G.coop){
    var P1 = G.players[0];
    ctx.font = '11px "PingFang SC",system-ui,sans-serif';
    ctx.fillStyle = P1.dashCd <= 0 ? 'rgba(125,232,255,0.95)' : 'rgba(120,150,175,0.55)';
    ctx.fillText(P1.dashCd <= 0 ? '冲刺 就绪' : '冲刺 ' + P1.dashCd.toFixed(1) + 's', cx2, dy + 4);

    var chompReady = P1.chompCd <= 0 && P1.chompRecover <= 0;
    ctx.font = 'bold 12px "PingFang SC",system-ui,sans-serif';
    ctx.fillStyle = chompReady ? '#ffd166' : 'rgba(160,130,70,0.6)';
    const action = G.boss?.idx === 5 && G.story?.whale === 'resonate' ? '鲸鸣' : '啃咬';
    ctx.fillText(chompReady ? action + ' 就绪 · 按 J' : action + ' ' + Math.max(0, P1.chompCd).toFixed(1) + 's', cx2, dy - 18);

    if (P1.skillKind === 'inflate'){
      var sReady = P1.skillCd <= 0 && P1.inflateT <= 0;
      ctx.font = 'bold 12px "PingFang SC",system-ui,sans-serif';
      ctx.fillStyle = sReady ? '#fed7aa' : 'rgba(160,130,95,0.65)';
      ctx.fillText(sReady ? '膨胀 就绪 · 按 K'
        : (P1.inflateT > 0 ? '膨胀中 ' + P1.inflateT.toFixed(1) + 's'
                           : '膨胀 ' + P1.skillCd.toFixed(1) + 's'), cx2, dy - 36);
    }
    if (P1.stealthOn){
      ctx.font = 'bold 12px "PingFang SC",system-ui,sans-serif';
      ctx.fillStyle = 'rgba(167,243,208,0.9)';
      ctx.fillText('拟态隐身', cx2, dy - 54);
    }
  } else {
    ctx.font = '11px "PingFang SC",system-ui,sans-serif';
    var st = '';
    for (var qi = 0; qi < G.players.length; qi++){
      var q2 = G.players[qi];
      var ready2 = q2.chompCd <= 0 && q2.chompRecover <= 0;
      st += q2.label + ' ' + (q2.dead ? '倒下' : (ready2 ? '咬 ✓' : q2.chompCd.toFixed(1) + 's')) + '    ';
    }
    ctx.fillStyle = 'rgba(150,190,215,0.85)';
    ctx.fillText(st, cx2, dy + 4);
  }

  /* 进化横幅 */
  if (G.mutFlash){
    var mf = G.mutFlash;
    var a1 = clamp(mf.t / 0.6, 0, 1) * clamp((2.8 - mf.t) / 0.25, 0, 1);
    var MS = SPECIES[mf.sid];
    ctx.save();
    ctx.textAlign = 'center';
    ctx.globalAlpha = a1;
    ctx.font = 'bold 13px "PingFang SC",system-ui,sans-serif';
    ctx.fillStyle = rgba(MS.glow, 0.9);
    ctx.fillText((G.coop ? mf.who + ' · ' : '') + MS.name + ' 的器官 · Lv.' + mf.lv, W/2, H * 0.17);
    ctx.font = 'bold 26px "PingFang SC",system-ui,sans-serif';
    ctx.fillStyle = MS.color;
    ctx.shadowColor = MS.color; ctx.shadowBlur = 26;
    ctx.fillText(mf.name, W/2, H * 0.17 + 34);
    ctx.shadowBlur = 0;
    ctx.font = '12.5px "PingFang SC",system-ui,sans-serif';
    ctx.fillStyle = 'rgba(200,225,245,0.85)';
    ctx.fillText(mf.desc, W/2, H * 0.17 + 58);
    ctx.restore();
  }

  /* 倒下提示 */
  if (G.coop){
    for (var ri = 0; ri < G.players.length; ri++){
      if (!G.players[ri].dead) continue;
      ctx.textAlign = 'center';
      ctx.font = 'bold 12px "PingFang SC",system-ui,sans-serif';
      ctx.fillStyle = rgba('#ff8fa3', 0.9);
      ctx.fillText(G.players[ri].label + ' 已倒下 · 队友靠近即可救起', W/2, 110);
      break;
    }
  }

  /* Boss 血条 */
  if (G.boss){
    var b = G.boss;
    var bw2 = Math.min(560, W * 0.5), bxx = (W - bw2) / 2;
    var byB = H - (MOBILE ? 92 : 78);
    ctx.fillStyle = 'rgba(255,255,255,0.1)';
    ctx.fillRect(bxx, byB, bw2, 8);
    ctx.fillStyle = b.weakT > 0 ? '#ffd166' : '#fb7185';
    ctx.fillRect(bxx, byB, bw2 * clamp(b.hp / b.maxHp, 0, 1), 8);
    ctx.textAlign = 'center';
    ctx.font = 'bold 12.5px "PingFang SC",system-ui,sans-serif';
    ctx.fillStyle = 'rgba(253,164,175,0.95)';
    ctx.fillText(b.name + (b.weakT > 0 ? ' · 弱点暴露！' : ''), W/2, byB - 8);
  }

  if (G.paused){
    ctx.fillStyle = 'rgba(2,8,18,0.62)';
    ctx.fillRect(-SAFE.l, -SAFE.t, SW, SH);
    ctx.textAlign = 'center';
    ctx.font = 'bold ' + (MOBILE ? 22 : 26) + 'px "PingFang SC",system-ui,sans-serif';
    ctx.fillStyle = '#7de8ff';
    ctx.fillText('已暂停', W/2, H/2 - 6);
    ctx.font = '13px "PingFang SC",system-ui,sans-serif';
    ctx.fillStyle = 'rgba(143,180,208,0.9)';
    ctx.fillText(MOBILE ? '点击屏幕继续' : '按 Esc 继续', W/2, H/2 + 24);
  }

  /* 竖屏提示：这游戏是横向视野，竖着玩会被挤成一条缝 */
  if (MOBILE && H > W && G.stage === 1 && G.stageT < 7 && !G.paused){
    var oa = clamp((7 - G.stageT) / 2, 0, 1);
    ctx.textAlign = 'center';
    ctx.font = '12px "PingFang SC",system-ui,sans-serif';
    ctx.fillStyle = 'rgba(183,243,255,' + (0.75 * oa) + ')';
    ctx.fillText('横过来玩视野更宽', W/2, H * 0.72);
  }

  ctx.restore();
  if (MOBILE) drawTouchUI();
}

function p2(){ return G.players[0]; }

/* ============================================================
   界面
   ============================================================ */
var ovStart = document.getElementById('ovStart');
var ovCards = document.getElementById('ovCards');
var ovEnd = document.getElementById('ovEnd');

function hideAll(){
  ovStart.classList.add('hide');
  ovCards.classList.add('hide');
  ovEnd.classList.add('hide');
  document.getElementById('ovStory').classList.add('hide');
}

function tellRadio(message) {
  if (!message) return;
  G.story.radio = message;
  G.story.radioUntil = G.time + 8;
}

function openStory(id) {
  const story = G.story;
  story.seen.add(id);
  const encounter = id === 'ending'
    ? { title: story.whale === 'resonate' ? '机甲停火' : '深潜机甲 · 信号中断',
        text: '跟随你的只剩水流。现在，由你决定往哪里游。',
        choices: endingChoices(story) }
    : encounters[id];
  G.mode = 'story';
  hideAll();
  const dialog = document.getElementById('ovStory');
  dialog.dataset.scene = id;
  document.getElementById('storyTitle').textContent = encounter.title;
  document.getElementById('storyText').textContent = encounter.text;
  const actions = document.getElementById('storyActions');
  actions.replaceChildren();
  const choices = encounter.choices.filter(([key]) => {
    if (key === 'devour') return G.p.size >= WHALE * .9;
    if (key === 'resonate') return story.alert < 40 && story.bypassed >= 3 && !story.huntedLarge;
    return true;
  });
  for (const [key, label, radio] of choices) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'story-choice';
    button.dataset.choice = key;
    button.textContent = label;
    button.onclick = () => {
      if (key !== 'resonate') { chooseStory(id, key, radio); return; }
      actions.querySelectorAll('button').forEach(option => { option.disabled = true; });
      document.getElementById('storyText').textContent = '你没有动。鲸鸣在五秒的静默中慢慢靠近……';
      dialog.classList.add('listening');
      setTimeout(() => {
        dialog.classList.remove('listening');
        chooseStory(id, key, radio);
      }, 5000);
    };
    actions.appendChild(button);
  }
  dialog.classList.remove('hide');
  actions.querySelector('button')?.focus();
}

function chooseStory(id, key, radio) {
  const story = G.story;
  tellRadio(radio);
  if (id === 'boat' && key === 'near') {
    raiseAlert(story, 10);
    G.chase.y += 300;
  }
  if (id === 'net' && key === 'ram') {
    raiseAlert(story, 5);
    for (const player of alivePlayers()) player.size = Math.max(8, player.size * .8);
    story.rageUntil = G.time + 10;
  }
  if (id === 'ice' && key === 'bypass') {
    story.bypassed++;
    story.skipBossStage = 6;
    raiseAlert(story, 15);
  }
  if (id === 'venom' && key === 'eat') {
    story.venom = true;
    story.toxicityUntil = G.time + 12;
  }
  if (id === 'whale') {
    story.whale = key;
    if (key === 'devour') {
      raiseAlert(story, 30);
      for (const player of alivePlayers()) player.size = Math.max(player.size, WHALE);
    }
  }
  if (id === 'ending') {
    story.ending = key;
    hideAll();
    if (key === 'endless') {
      story.endless = true;
      WORLD.h += STAGE_DEPTH;
      G.mode = 'play';
      showBanner('无尽深潜', '下方还有更深的海');
    } else {
      const labels = { rest: '安息', symbiosis: '共生', revenge: '复仇' };
      doEndRun(labels[key] + ' · ' + radio);
    }
    return;
  }
  hideAll();
  G.mode = 'play';
  if (id === 'ruins') {
    if (key === 'fight') startBoss(false, true);
    else {
      story.bypassed++;
      story.ruinsBypass = true;
      raiseAlert(story, 15);
      completeStage();
    }
  }
}

var selFish = 'blue';
function fishById(id){
  for (var i = 0; i < START_FISH.length; i++) if (START_FISH[i].id === id) return START_FISH[i];
  return START_FISH[0];
}

/* 每种初始鱼在缩略图里用的体型画法 */
var FISH_SHAPE = {
  blue:'p_blue', puffer:'p_puffer', sword:'p_sword', lantern:'p_lantern',
  sardine:'p_sardine', eel:'p_eel', seahorse:'p_seahorse', ray:'p_ray'
};

/* 把鱼画到小 canvas 上：临时把全局 ctx 指过去，画完换回来 */
function drawFishThumb(cvEl, fish, t){
  var dpr = Math.min(window.devicePixelRatio || 1, 2);
  var w = cvEl.clientWidth || 132;
  var h = cvEl.clientHeight || 58;
  cvEl.width = Math.max(1, Math.round(w * dpr));
  cvEl.height = Math.max(1, Math.round(h * dpr));
  var g = cvEl.getContext('2d');
  if (!g) return;
  g.setTransform(dpr, 0, 0, dpr, 0, 0);
  g.clearRect(0, 0, w, h);

  var saved = ctx;
  try {
    ctx = g;
    var shape = FISH_SHAPE[fish.id] || 'p_blue';
    var sz = Math.min(h * 0.34, w * 0.17);
    var sway = Math.sin((t || 0) * 1.6) * 0.05;
    drawFishShape(w * 0.46, h * 0.52, sway, sz, shape, fish.color, fish.glow, t || 0, 0, 1, false);
  } finally {
    ctx = saved;
  }
}

var thumbList = [];
var menuT = 0;

function buildFishPicker(){
  var el = document.getElementById('fishPick');
  if (!el) return;
  el.innerHTML = '';
  thumbList = [];
  for (var i = 0; i < START_FISH.length; i++){
    (function(f){
      var d = document.createElement('div');
      d.className = 'fishcard' + (f.id === selFish ? ' sel' : '');

      var thumb = document.createElement('canvas');
      d.appendChild(thumb);

      var b = document.createElement('b');
      b.textContent = f.name;
      b.style.color = f.glow;
      d.appendChild(b);

      var i2 = document.createElement('i');
      i2.textContent = f.passive;
      d.appendChild(i2);

      d.onclick = function(){ selFish = f.id; buildFishPicker(); };
      el.appendChild(d);

      thumbList.push({ cv:thumb, fish:f });
    })(START_FISH[i]);
  }
  drawThumbs(menuT);
}

/* 菜单里的鱼会原地摆尾 —— 比静态图更能看出体型差异 */
function drawThumbs(t){
  for (var i = 0; i < thumbList.length; i++){
    drawFishThumb(thumbList[i].cv, thumbList[i].fish, t + i * 0.7);
  }
}

function buildDex(){
  var el = document.getElementById('seaList');
  if (!el) return;
  var html = '';
  for (var i = 0; i < SEAS.length; i++){
    var s = SEAS[i];
    var from = i * SEA_SPAN + 1;
    var to = i * SEA_SPAN + SEA_SPAN;
    html += '<div class="searow">' +
      '<em>' + from + '-' + to + '</em>' +
      '<b style="color:' + s.accent + '">' + s.name + '</b>' +
      '<i>' + s.mech + '</i></div>';
  }
  el.innerHTML = html;
}
buildDex();
buildFishPicker();
window.addEventListener('resize', function(){
  if (G.mode === 'menu') buildFishPicker();
});

function showStagePanel(report, opts){
  ovCards.classList.remove('hide');

  document.getElementById('cardTitle').textContent = report.stage === 2 && G.reefCleared
    ? '珊瑚浅海 · 守卫击败'
    : '第 ' + (report.stage || G.stage) + ' 段 通过';
  var badge = document.getElementById('rankBadge');
  badge.textContent = report.rank;
  badge.className = 'rank ' + report.rank;

  document.getElementById('cardSub').textContent =
    report.sea.name + ' · ' + report.sea.tag + (G.coop ? ' · 双人' : '');

  /* 战报：让「我变强了」变成几个能读的数字 */
  var rg = document.getElementById('reportGrid');
  var upCls = report.grow >= 0 ? 'up' : '';
  rg.innerHTML =
    '<div><b class="' + upCls + '">' + Math.round(report.from) + ' → ' + Math.round(report.to) +
      '</b><span>体型 ' + (report.grow >= 0 ? '+' : '') + report.grow.toFixed(0) + '%</span></div>' +
    '<div><b>' + report.eaten + '</b><span>吞食</span></div>' +
    '<div><b>' + report.bites + '</b><span>啃咬</span></div>' +
    '<div><b>' + report.combo + '</b><span>最高连击</span></div>' +
    '<div><b class="' + (report.dmg === 0 ? 'up' : '') + '">' + report.dmg + '</b><span>受伤</span></div>';

  var ev = document.getElementById('evoLine');
  ev.innerHTML = report.evo.length
    ? '本段长出的器官：<br>' + report.evo.join('<br>')
    : '本段没有器官进化 —— 盯着同一类鱼吃，而且要吃够分量的。';

  var list = document.getElementById('cardList');
  list.innerHTML = '';
  opts.forEach(function(c){
    var el = document.createElement('div');
    el.className = 'card';
    el.innerHTML = '<div class="t">' + c.name + '</div><div class="d">' + c.desc + '</div>';
    el.onclick = function(){ ovCards.classList.add('hide'); pickCard(c); };
    list.appendChild(el);
  });
}

function showEndPanel(reason){
  ovEnd.classList.remove('hide');
  document.getElementById('endTitle').textContent = reason;
  document.getElementById('endSub').textContent =
    '抵达第 ' + G.stage + ' 段 · 存活 ' + Math.round(G.stageT) + ' 秒' +
    (G.coop ? ' · 救起队友 ' + G.stats.revives + ' 次' : '');

  var total = 0;
  for (var i = 0; i < G.players.length; i++) total += G.players[i].score;

  document.getElementById('endStats').innerHTML =
    '<div><b>' + total.toLocaleString() + '</b><span>总分</span></div>' +
    '<div><b>' + G.stats.eaten + '</b><span>吞食总数</span></div>' +
    '<div><b>' + Math.round(G.stats.peak) + '</b><span>峰值体型</span></div>' +
    '<div><b>' + G.stats.bestCombo + '</b><span>最高连击</span></div>' +
    '<div><b>' + G.stats.bites + '</b><span>啃咬吞食</span></div>' +
    '<div><b>' + G.stats.chests + '</b><span>宝箱鱼</span></div>' +
    '<div><b>' + G.stats.items + '</b><span>道具拾取</span></div>';

  var ml = document.getElementById('endMuts');
  ml.innerHTML = '';
  var any = false;
  for (var pi = 0; pi < G.players.length; pi++){
    var p = G.players[pi];
    for (var s = 0; s < p.slots.length; s++){
      var sid = p.slots[s], S = SPECIES[sid];
      for (var lv = 0; lv < p.levels[sid]; lv++){
        any = true;
        var row = document.createElement('div');
        row.className = 'mrow';
        row.innerHTML = '<span class="dot" style="background:' + S.color +
          ';box-shadow:0 0 8px ' + S.color + '"></span>' +
          (G.coop ? '<span style="color:' + rgba(p.c2, 1) + '">' + p.label + '</span>' : '') +
          '<span style="color:' + S.glow + '">' + S.name + ' Lv.' + (lv + 1) + '</span>' +
          '<span>' + S.organs[lv].name + '</span>' +
          '<span style="color:#6f93b3">' + S.organs[lv].desc + '</span>';
        ml.appendChild(row);
      }
    }
  }
  if (!any) ml.innerHTML = '<div style="font-size:12.5px;color:#6f93b3">这局没能长出任何器官 —— 试着盯着同一类鱼吃，而且要吃够分量的。</div>';
}

function nextFish(id){
  for (var i = 0; i < START_FISH.length; i++){
    if (START_FISH[i].id === id) return START_FISH[(i + 1) % START_FISH.length].id;
  }
  return START_FISH[1].id;
}

document.getElementById('btnSingle').onclick = function(){
  G.paused = false;
  startRun(false, selFish);
};
document.getElementById('btnCoop').onclick = function(){
  if (MOBILE) return;            /* 手机上没有第二套触控，双人得接键盘 */
  G.paused = false;
  startRun(true, selFish, nextFish(selFish));
};
document.getElementById('btnAgain').onclick = function(){
  ovEnd.classList.add('hide');
  startRun(false, selFish);
};
document.getElementById('btnAgainCoop').onclick = function(){
  if (MOBILE) return;
  ovEnd.classList.add('hide');
  startRun(true, selFish, nextFish(selFish));
};

/* 手机模式：把键盘说明换成触屏说明，双人按钮置灰 */
if (MOBILE){
  var kvsEl = document.querySelector('#ovStart .kvs');
  if (kvsEl) kvsEl.innerHTML =
    '<span><b>左下摇杆</b> 游动</span>' +
    '<span><b>咬</b> 啃咬</span>' +
    '<span><b>冲</b> 冲刺</span>' +
    '<span><b>技</b> 技能</span>' +
    '<span><b>封</b> 释放封印</span>';
  var snEl = document.querySelector('#ovStart .sbox-note');
  if (snEl) snEl.textContent = '顶部 ‖ 暂停 · ≡ 图鉴 · 横屏握持视野更宽';
  var bcEl = document.getElementById('btnCoop');
  if (bcEl){ bcEl.disabled = true; bcEl.textContent = '双 人 合 作（需键盘）'; }
  var bacEl = document.getElementById('btnAgainCoop');
  if (bacEl){ bacEl.disabled = true; bacEl.textContent = '双 人 再 来（需键盘）'; }
  var cfootEl = document.getElementById('codexFoot');
  if (cfootEl) cfootEl.textContent = '点 ≡ 打开';
}

/* ============================================================
   主循环
   ============================================================ */
var lastT = performance.now();
let manualClock = false;
function loop(now, manual = false){
  if (manualClock && !manual) return;
  var raw = Math.min(0.05, (now - lastT) / 1000);
  lastT = now;
  tickTouch(raw);

  /* 宝箱抽奖：暂停游戏，只播动画 */
  if (G.chestAnim){
    G.chestAnim.t += raw;
    if (G.chestAnim.t >= G.chestAnim.dur) G.chestAnim = null;
    render();
    if (!manual) requestAnimationFrame(loop);
    return;
  }

  /* 顿帧：命中瞬间把时间停住，这一下才是「硬的」 */
  if (G.hitStop > 0){
    G.hitStop -= raw;
    render();
    if (!manual) requestAnimationFrame(loop);
    return;
  }

  var dt = raw;
  menuT += raw;
  if (G.slowT > 0){ G.slowT -= dt; dt *= 0.35; }

  /* 帧率采样（0.7s 一次）：连续掉帧才降级，连续流畅才恢复，避免来回抖 */
  PERF.acc += raw; PERF.frames++;
  if (PERF.acc >= 0.7){
    PERF.fps = PERF.frames / PERF.acc;
    if (PERF.fps < 45){ PERF.bad++; PERF.good = 0; }
    else if (PERF.fps > 56){ PERF.good++; PERF.bad = 0; }
    else { PERF.bad = 0; PERF.good = 0; }
    if (!LOWQ && PERF.bad >= 3) setLowQ(true);
    else if (LOWQ && PERF.good >= 6) setLowQ(false);
    PERF.acc = 0; PERF.frames = 0;
  }

  if (G.trans){
    var tr0 = G.trans;
    tr0.t += raw;
    if (!tr0.fired && tr0.t >= tr0.dur / 2){
      tr0.fired = true;
      if (tr0.cb){ tr0.cb(); tr0.cb = null; }
      tr0.label = G.mode === 'play' ? ('第 ' + G.stage + ' 段 · ' + seaOf(G.stage).name)
        : G.mode === 'end' ? '深 海 霸 主' : '';
    }
    if (tr0.t >= tr0.dur) G.trans = null;
  }
  if (G.mode === 'play' && !G.paused) update(dt);
  else updateAmbient(dt);
  if (G.mode === 'menu' && thumbList.length) drawThumbs(menuT);
  render();
  if (G.trans){
    /* save/restore 必须成对：这里以前泄漏 globalAlpha（淡出尾帧残留 ~0.04），
       下一帧起整个 HUD 都被压到几乎透明 —— 手机上「空槽位」就是这么隐形的 */
    ctx.save();
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    var tr = G.trans, half = tr.dur / 2;
    var aRaw = tr.t < half ? tr.t / half : 1 - (tr.t - half) / half;
    var a = aRaw * aRaw * (3 - 2 * aRaw);
    ctx.fillStyle = 'rgba(2,6,14,' + (0.97 * a).toFixed(3) + ')';
    ctx.fillRect(0, 0, W, H);
    if (a > 0.4 && tr.label){
      ctx.globalAlpha = Math.min(1, (a - 0.4) / 0.45);
      ctx.textAlign = 'center';
      ctx.fillStyle = '#7de8ff';
      ctx.font = '600 26px system-ui, sans-serif';
      ctx.fillText(tr.label, W / 2, H / 2 - 6);
      ctx.strokeStyle = 'rgba(125,232,255,0.5)';
      ctx.lineWidth = 2;
      var mx = W / 2, mw = 220, my = H / 2 + 26;
      ctx.beginPath(); ctx.moveTo(mx - mw, my); ctx.lineTo(mx + mw, my); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(mx - mw, my - 5); ctx.lineTo(mx - mw, my + 5); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(mx + mw, my - 5); ctx.lineTo(mx + mw, my + 5); ctx.stroke();
      ctx.font = '400 13px system-ui, sans-serif';
      ctx.fillStyle = 'rgba(125,232,255,0.75)';
      ctx.fillText('▼ ' + G.stage * 400 + ' m', W / 2, my + 26);
    }
    ctx.restore();
  }
  if (!manual) requestAnimationFrame(loop);
}

G.bubbles = [];
for (var bi = 0; bi < 90; bi++){
  G.bubbles.push({ x: rand(0, WORLD.w), y: rand(0, WORLD.h), r: rand(1.4, 6),
    spd: rand(12, 46), wob: rand(0, TAU), wobS: rand(0.6, 1.8), a: rand(0.1, 0.3) });
}
G.motes = [];

/* 调试钩子：?debug=1 时才挂，方便自动化测触屏（普通访问拿不到内部状态） */
if (/[?&]debug=1/.test(location.search)){
  window.advanceTime = function(ms) {
    manualClock = true;
    const steps = Math.max(1, Math.round(ms / (1000 / 60)));
    for (let i = 0; i < steps; i++) loop(lastT + 1000 / 60, true);
  };
  window.render_game_to_text = function() {
    return JSON.stringify({
      coordinates: 'x right, y down',
      mode: G.mode,
      paused: !!G.paused,
      stage: G.stage,
      reefCleared: !!G.reefCleared,
      narrative: G.story && { scene: document.getElementById('ovStory').dataset.scene, alert: G.story.alert, ending: G.story.ending, whale: G.story.whale },
      player: G.p && { id: G.p.fishId, x: Math.round(G.p.x), y: Math.round(G.p.y), size: +G.p.size.toFixed(2) },
      eaten: G.stats?.eaten ?? 0,
      food: G.stats?.food ?? 0,
      boss: G.boss && { name: G.boss.name, hp: Math.ceil(G.boss.hp), phase: G.boss.state }
    });
  };
  window.__DT = { G:G, TC:TC, mIn:mIn, cam:cam, WORLD:WORLD,
    relayout:function(){ layoutTouch(); }, update: update };
}

requestAnimationFrame(loop);
})();
