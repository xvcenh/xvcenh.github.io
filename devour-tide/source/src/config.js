import { TAU, rand, pick, clamp, lerp, rgba, angLerp, dist } from './utils.js';
/* 静态数据与派生规则：世界尺寸、海域、物种、初始鱼、道具、里程碑、Boss 定义 */
/* 世界不再是一块封闭竞技场，而是一根竖直的深海柱：
   12 段 × 2600px，从海面一路压到深渊底。
   难度 = 深度，进度 = 你游下去多少米。 */
var STAGE_DEPTH = 2600;
var TOTAL_STAGES = 12;
var WORLD = { w: 3600, h: TOTAL_STAGES * STAGE_DEPTH };
var BOSS_STAGES = [2, 4, 6, 8, 10, 12];
/* 追赶者形态随海域轮换：蓝鲸 / 污染云 / 岩浆锋面 */
var CHASE_FORMS = ['whale', 'whale', 'poll', 'lava', 'poll', 'whale'];
function stageForY(y){ return clamp(Math.floor(y / STAGE_DEPTH) + 1, 1, TOTAL_STAGES); }
function seaIdxForStage(st){ return clamp(Math.floor((st - 1) / SEA_SPAN), 0, SEAS.length - 1); }
/* 1px = 0.25m：单段 650m，全程约 7800m */
function depthM(y){ return Math.round(Math.max(0, y) * 0.25); }

/* ============================================================
   绝对体型刻度
   ------------------------------------------------------------
   蓝鲸是这把尺子的末端：海里没有任何东西比它更大。
   没有这个天花板时，敌人会按玩家体型无限往上跟，
   结果就是「你多大都还有更大的鱼」——称霸永远不成立。
   ============================================================ */
var WHALE = 480;
/* 每吃掉 1 点猎物体型，自己长多少。
   这个数决定了「12 段能不能从 18 爬到接近蓝鲸」，必须和海域刻度一起调。 */
var SIZE_GAIN = 0.046;

/* 每段的生态刻度（绝对体型中心）。
   为什么不是「每片海域一个刻度」：一片海占 2 段，而玩家在这 2 段里体型会涨一半，
   一个刻度没法同时匹配两头 —— 实测第一版就因此让第 3 段直接崩掉（96% 的鱼比他大）。
   按段给刻度，才能让每段的可食比例都落在 45~60%。
   曲线本身是 ×1.32/段：它同时是「玩家成长的目标曲线」和「海的深度」。 */
var STAGE_SCALE = [18, 24, 32, 42, 56, 74, 98, 130, 175, 230, 290, 320];

/* 软上限系数：你最多长到「本段刻度 × 1.5」。
   深海最后两段刻度不再上涨 —— 深渊就是终点，所以那里是唯一能真正登顶的地方：
   刻度 320 × 1.5 = 480 = 蓝鲸。到这里，海里的巨兽也刚好和你一样大。 */
var ECO_CAP_MUL = 1.50;

function ecoScale(stage){
  var i = clamp(Math.round(stage) - 1, 0, STAGE_SCALE.length - 1);
  return STAGE_SCALE[i];
}

/* 器官系统的全局参数 */
var GENE_GATE = [6, 15, 28];   /* 单物种累进阈值：L1 / L2 / L3 */
var GENE_MIN_RATIO = 0.72;     /* 猎物要先够分量才长器官 */
var CHOMP_GENE_MUL = 1.6;      /* 用啃咬拿下的猎物，基因倍率 */
var RARE_W = 9;                /* 权重 ≤ 此值的物种算「稀有」，基因收益 ×2 */
var MAX_SLOTS = 3;

/* 啃咬参数 */
var CHOMP_CD = 0.58;           /* 两次啃咬之间的冷却 */
var CHOMP_RECOVER = 0.24;      /* 后摇：期间移速腰斩、不能冲刺 */


/* ============================================================
   物种 = 一条鱼 = 一棵 3 级器官树
   ============================================================ */
var SPECIES = {
  round: {
    name:'圆润鲀', org:'硬鳞', color:'#f59e0b', glow:'#fde68a',
    shape:'round', sizeMul:1.00, speedMul:1.00, beh:'wander', w:22,
    organs:[
      { name:'硬鳞',   desc:'受伤减免 15%',                         apply:function(p){ p.dr += 0.15; } },
      { name:'骨板',   desc:'被咬损失 -30%，体型上限 +20%',           apply:function(p){ p.biteLoss *= 0.70; p.maxSize = Math.min(WHALE, p.maxSize * 1.20); } },
      { name:'尖刺甲', desc:'受伤时弹开并麻痹周围敌鱼 1.2 秒',        apply:function(p){ p.thorns = true; } }
    ]
  },
  puffer: {
    name:'刺豚', org:'充气', color:'#fb923c', glow:'#fed7aa',
    shape:'puffer', sizeMul:1.06, speedMul:0.80, beh:'wander', w:9,
    organs:[
      { name:'充气',   desc:'受击时膨胀弹开接触的敌鱼',               apply:function(p){ p.inflateHit = true; } },
      { name:'毒刺',   desc:'碰到你的敌鱼会被麻痹',                   apply:function(p){ p.poisonTouch = 1; } },
      { name:'膨胀爆发', desc:'每 10 秒自动膨胀 2 秒，期间免疫伤害',    apply:function(p){ p.burstArmor = true; } }
    ]
  },
  sunfish: {
    name:'翻车鱼', org:'厚皮', color:'#a3e635', glow:'#ecfccb',
    shape:'round', sizeMul:1.35, speedMul:0.58, beh:'wander', w:6,
    organs:[
      { name:'厚皮',   desc:'体型 +12%',                            apply:function(p){ p.size *= 1.12; } },
      { name:'巨大化', desc:'吞食判定 +15%',                         apply:function(p){ p.eatReach += 0.15; } },
      { name:'温血巨兽', desc:'体型上限 +40%',                        apply:function(p){ p.maxSize = Math.min(WHALE, p.maxSize * 1.40); } }
    ]
  },
  shark: {
    name:'猎影鲨', org:'裂齿', color:'#fb7185', glow:'#fecdd3',
    shape:'pred', sizeMul:1.30, speedMul:1.32, beh:'chase', w:11,
    organs:[
      { name:'裂齿',   desc:'啃咬伤害 +25%',                          apply:function(p){ p.chompMul += 0.25; } },
      { name:'血腥嗅觉', desc:'用啃咬拿下的猎物，体型收益翻倍',           apply:function(p){ p.bloodScent = true; } },
      { name:'血怒',   desc:'每连吞 4 条，3 秒内速度 +45%',           apply:function(p){ p.bloodrage = true; } }
    ]
  },
  sword: {
    name:'剑鱼', org:'长吻', color:'#38bdf8', glow:'#bae6fd',
    shape:'dart', sizeMul:1.12, speedMul:1.50, beh:'chase', w:8,
    organs:[
      { name:'长吻',   desc:'移动速度 +12%',                        apply:function(p){ p.spdMul *= 1.12; } },
      { name:'破浪',   desc:'冲刺冷却 -35%，冲刺可撞退敌鱼',           apply:function(p){ p.dashCdMul *= 0.65; p.dashStun = true; } },
      { name:'疾影',   desc:'冲刺结束 1.2 秒内无敌',                  apply:function(p){ p.dashGhost = true; } }
    ]
  },
  eel: {
    name:'电鳗', org:'发电器', color:'#a78bfa', glow:'#ddd6fe',
    shape:'eel', sizeMul:1.00, speedMul:1.05, beh:'wander', w:8,
    organs:[
      { name:'发电器', desc:'每 2.6 秒电击最近的敌鱼并麻痹它',         apply:function(p){ p.zap = 1; } },
      { name:'链电',   desc:'电击弹跳 2 个额外目标，麻痹 +0.4 秒',     apply:function(p){ p.zap = 2; } },
      { name:'高压雷暴', desc:'每 9 秒全屏放电，所有敌鱼麻痹 1.5 秒',   apply:function(p){ p.stormField = true; } }
    ]
  },
  jelly: {
    name:'幽光水母', org:'触须', color:'#c084fc', glow:'#e9d5ff',
    shape:'jelly', sizeMul:0.92, speedMul:0.46, beh:'wander', w:9,
    organs:[
      { name:'触须',   desc:'碰到你的敌鱼有 40% 概率被麻痹 1 秒',       apply:function(p){ p.touchStun = 0.40; } },
      { name:'荧光伞', desc:'麻痹概率提升到 80%，半径扩大',            apply:function(p){ p.touchStun = 0.80; p.touchR = 1.7; } },
      { name:'再生',   desc:'吃掉麻痹的敌鱼时回复 6% 体型',            apply:function(p){ p.stunFeast = true; } }
    ]
  },
  squid: {
    name:'箭鱿', org:'喷射', color:'#22d3ee', glow:'#a5f3fc',
    shape:'dart', sizeMul:1.00, speedMul:1.22, beh:'flee', w:8,
    organs:[
      { name:'喷射',   desc:'冲刺速度 +22%',                        apply:function(p){ p.dashPow *= 1.22; } },
      { name:'墨汁',   desc:'冲刺留下墨云，敌鱼减速',                  apply:function(p){ p.ink = true; } },
      { name:'瞬移',   desc:'冲刺时穿过敌鱼并将其眩晕 1.2 秒',          apply:function(p){ p.blink = true; } }
    ]
  },
  seahorse: {
    name:'海马', org:'拟态', color:'#34d399', glow:'#a7f3d0',
    shape:'dart', sizeMul:0.62, speedMul:0.52, beh:'wander', w:6,
    organs:[
      { name:'拟态',   desc:'静止 1 秒后隐身，敌鱼不再追你',            apply:function(p){ p.stealth = true; } },
      { name:'卷尾',   desc:'静止时每秒回复 3% 体型',                 apply:function(p){ p.idleRegen = 3; } },
      { name:'潜行猎手', desc:'隐身状态下可以直接吞下 2.6 倍以内的鱼',       apply:function(p){ p.shadowBite = true; } }
    ]
  },
  lantern: {
    name:'灯笼鮟鱇', org:'引光', color:'#fbbf24', glow:'#fef3c7',
    shape:'round', sizeMul:0.85, speedMul:0.90, beh:'wander', w:6,
    organs:[
      { name:'引光',   desc:'比你小的鱼会主动游向你',                  apply:function(p){ p.attract = 1; } },
      { name:'诱饵',   desc:'吸引范围翻倍，精英鱼也会被吸引',           apply:function(p){ p.attract = 2; } },
      { name:'深渊之口', desc:'被吸引的小鱼进入范围内直接被你吞下',       apply:function(p){ p.devourMaw = true; } }
    ]
  },
  ray: {
    name:'蝠鲼', org:'巨翼', color:'#10b981', glow:'#a7f3d0',
    shape:'wing', sizeMul:1.35, speedMul:0.75, beh:'wander', w:7,
    organs:[
      { name:'巨翼',   desc:'体型带来的减速效果减半',                  apply:function(p){ p.heavyHalf = true; } },
      { name:'滑翔',   desc:'冲刺无敌时间延长到 0.8 秒',               apply:function(p){ p.glide = true; } },
      { name:'吞噬深渊', desc:'啃咬范围 +40%，啃咬伤害 +20%',          apply:function(p){ p.chompReach += 0.40; p.chompMul += 0.20; } }
    ]
  }
};
var SP_KEYS = Object.keys(SPECIES);

/* ============================================================
   海域（6 个，每 2 段一换）
   ------------------------------------------------------------
   对齐豪华版的做法：换场景不是换壁纸，而是换一条环境规则。
   每条规则都轻微改变你的移动或站位，让「进入新海域」有实际重量。
   ============================================================ */
var SEAS = [
  { name:'珊瑚浅海', tag:'温和 · 安心成长',
    top:'#0a3a63', mid:'#10639c', bot:'#051f38', accent:'#7ee7ff',
    mod:'none', zoom:1.00, mech:'没有额外威胁，专心长大' },
  { name:'幽暗海沟', tag:'视野收缩',
    top:'#050b1c', mid:'#0a2b4a', bot:'#01050d', accent:'#2de2ff',
    mod:'dark', zoom:0.84, mech:'能见度下降，你看到的东西变少了' },
  { name:'冰封海域', tag:'浮冰漂流',
    top:'#123a55', mid:'#3d7fa8', bot:'#0b2537', accent:'#b7f3ff',
    mod:'ice', zoom:1.00, mech:'漂来的浮冰会把你推开并减速' },
  { name:'火山热泉', tag:'热泉灼伤',
    top:'#2c0e14', mid:'#6b2418', bot:'#16060a', accent:'#ff9a5c',
    mod:'lava', zoom:1.00, mech:'上升的热泉气泡碰到就掉体型' },
  { name:'远古遗迹', tag:'遗迹电流',
    top:'#062a24', mid:'#0e5247', bot:'#031d19', accent:'#63ffd4',
    mod:'shock', zoom:1.02, mech:'地面会亮起电圈，1 秒后放电' },
  { name:'深渊', tag:'纯黑 · 只余荧光',
    top:'#04060f', mid:'#070f1e', bot:'#010206', accent:'#4de3ff',
    mod:'abyss', zoom:0.90, mech:'几乎全黑，只能靠生物荧光辨认方向' }
];
var SEA_SPAN = 2;
function seaOf(stage){
  return SEAS[Math.min(SEAS.length - 1, Math.floor((stage - 1) / SEA_SPAN))];
}

/* ============================================================
   初始鱼：8 种开局身份
   ------------------------------------------------------------
   每一种都对应一条器官路线 —— 选鱼的同时，也选定了这局先练什么。
   ============================================================ */
var START_FISH = [
  { id:'blue', name:'蓝潮鲀', org:'硬鳞', color:'#2fa8ff', glow:'#a5f3fc',
    passive:'受击后 2 秒内移速 +30%', skill:null,
    hint:'均衡 · 挨打反而更快，先稳一手',
    apply:function(p){ p.hitSpeed = true; } },

  { id:'puffer', name:'刺豚', org:'充气', color:'#fb923c', glow:'#fed7aa',
    passive:'按 K 短暂膨胀：体型 ×1.6、免疫伤害、弹开敌鱼（CD 14s）', skill:'inflate',
    hint:'爆发 · 一阵变大，然后吃掉刚才吃不下的东西',
    apply:function(p){ p.skillKind = 'inflate'; } },

  { id:'sword', name:'剑鱼', org:'长吻', color:'#38bdf8', glow:'#bae6fd',
    passive:'移速 +15%；冲刺撞击直接结算为啃咬（伤害 ×1.6）', skill:null,
    hint:'机动 · 冲刺即攻击，靠位移打输出',
    apply:function(p){ p.spdMul *= 1.15; p.dashChomp = true; } },

  { id:'lantern', name:'灯笼鮟鱇', org:'引光', color:'#fbbf24', glow:'#fef3c7',
    passive:'比你小的鱼会主动游向你', skill:null,
    hint:'控场 · 不用追，小鱼自己送上门',
    apply:function(p){ p.attract = 1; } },

  { id:'sardine', name:'沙丁鱼', org:'群游', color:'#94a3b8', glow:'#e2e8f0',
    passive:'每 11 秒召唤 6 条小鱼（免费口粮）', skill:null,
    hint:'发育 · 滚雪球最快，正面战斗力偏弱',
    apply:function(p){ p.summonSchool = true; } },

  { id:'eel', name:'电鳗', org:'发电器', color:'#a78bfa', glow:'#ddd6fe',
    passive:'开局自带放电：每 2.6 秒电击最近敌鱼并麻痹', skill:null,
    hint:'压制 · 一开局就有一手控制',
    apply:function(p){ p.zap = 1; } },

  { id:'seahorse', name:'海马', org:'拟态', color:'#34d399', glow:'#a7f3d0',
    passive:'静止 1 秒后隐身，敌鱼不再追你；静止时缓慢回复体型', skill:null,
    hint:'潜行 · 不擅长正面，擅长挑软柿子',
    apply:function(p){ p.stealth = true; p.idleRegen = 2; } },

  { id:'ray', name:'蝠鲼', org:'巨翼', color:'#10b981', glow:'#a7f3d0',
    passive:'体型带来的减速减半（越大越不吃亏）', skill:null,
    hint:'后期 · 前期偏弱，养起来就是深海霸主',
    apply:function(p){ p.heavyHalf = true; } }
];

/* 体型里程碑：每跨过一个，世界对你的反应就变一次 */


/* 卡牌通道：来自通关奖励，和「吃什么」这条管道并行 */


/* ============================================================
   道具（16 种，三档稀有度）
   ------------------------------------------------------------
   设计原则：普通给即时补给，稀有给「一小段时间的新玩法」，史诗改写一小段规则。
   尽量不做纯数值乘子 —— 那是卡牌通道该干的事，道具应该改「这几秒你怎么打」。
   来源：普通鱼 6%、精英鱼 40%、宝箱鱼 100%（掉 2 个）。
   ============================================================ */
var ITEM_RARITY = {
  common: { name:'普通', color:'#7dd3fc', w:58 },
  rare:   { name:'稀有', color:'#c084fc', w:33 },
  epic:   { name:'史诗', color:'#fbbf24', w:9 }
};

/* 稀有度加权抽取 */
function rollItem(ITEM_TYPES){
  var total = 0, k;
  for (k in ITEM_RARITY) total += ITEM_RARITY[k].w;
  var r = Math.random() * total;
  var picked = 'common';
  for (k in ITEM_RARITY){
    r -= ITEM_RARITY[k].w;
    if (r <= 0){ picked = k; break; }
  }
  var pool = [];
  for (var i = 0; i < ITEM_TYPES.length; i++){
    if (ITEM_TYPES[i].rarity === picked) pool.push(ITEM_TYPES[i]);
  }
  return pool.length ? pick(pool) : ITEM_TYPES[0];
}



var MILESTONES = [
  { at: 48,  title:'小鱼开始躲你',   sub:'中型鱼已经进入你的食谱' },
  { at: 110, title:'中型鱼也怕了',   sub:'海里能威胁你的东西少了一半' },
  { at: 200, title:'掠食者开始避让', sub:'鲨鱼不再主动冲你 —— 你成了猎手' },
  { at: 320, title:'深海霸主',       sub:'除了 Boss，没什么能拦你了' }
];
var BOSS_DEFS = [
  { name:'深渊巨鲨',   c1:'#7c2d3f', c2:'#fda4af', sizeMul:1.00, speedMul:1.12, shape:'pred',  g:'charge' },
  { name:'冰霜古鲸',   c1:'#27356e', c2:'#a5b4fc', sizeMul:1.32, speedMul:0.74, shape:'round', g:'frost'  },
  { name:'幽灵魟',     c1:'#3b2f63', c2:'#c4b5fd', sizeMul:1.05, speedMul:0.95, shape:'wing',  g:'ghost'  },
  { name:'雷暴海鳝',   c1:'#134e4a', c2:'#6ee7b7', sizeMul:1.10, speedMul:1.05, shape:'eel',   g:'shock'  },
  { name:'剧毒水母后', c1:'#4a1d5e', c2:'#f0abfc', sizeMul:1.18, speedMul:0.82, shape:'jelly', g:'venom'  },
  { name:'熔岩巨兽',   c1:'#7c2d0e', c2:'#fdba74', sizeMul:1.16, speedMul:0.86, shape:'wing',  g:'lava'   }
];

export { STAGE_DEPTH, TOTAL_STAGES, WORLD, BOSS_STAGES, CHASE_FORMS, stageForY, seaIdxForStage, depthM, WHALE, SIZE_GAIN, STAGE_SCALE, ECO_CAP_MUL, ecoScale, GENE_GATE, GENE_MIN_RATIO, CHOMP_GENE_MUL, RARE_W, MAX_SLOTS, CHOMP_CD, CHOMP_RECOVER, SPECIES, SP_KEYS, SEAS, SEA_SPAN, seaOf, START_FISH, ITEM_RARITY, rollItem, MILESTONES, BOSS_DEFS };
