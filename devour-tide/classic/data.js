/* 吞噬之潮 · data.js — 场景（6 大生物群落）+ Rogue 卡牌数据 */
(function () {
  const DT = (window.DT = window.DT || {});
  const U = DT.util;

  /* ================= 场景 ================= */
  const S = (DT.scenes = [
    {
      id: 'reef', name: '浅滩珊瑚礁', tag: '水彩明快 · 阳光光柱',
      pal: { top: '#7fdcf0', mid: '#2f9fd4', deep: '#155e96', glow: '#ffe9a8', accent: '#ff8c5a', silhouette: '#1b6ea8', silhouette2: '#0f4f7d' },
      light: 1, fog: 0, dark: 0, density: { prey: 26, predator: 4, ambient: 6 }, danger: 0.6,
    },
    {
      id: 'jelly', name: '荧光水母森林', tag: '霓虹荧光 · 电网水母',
      pal: { top: '#2a1b5e', mid: '#4b2d8f', deep: '#170f3c', glow: '#7df9ff', accent: '#c084fc', silhouette: '#3b2470', silhouette2: '#26164d' },
      light: 1.15, fog: 0, dark: 0.18, density: { prey: 24, predator: 5, ambient: 10 }, danger: 0.9,
    },
    {
      id: 'wreck', name: '沉船墓场', tag: '暗金水墨 · 暗流涌动',
      pal: { top: '#40566e', mid: '#26415c', deep: '#101f33', glow: '#b8f0c8', accent: '#d4a259', silhouette: '#16293e', silhouette2: '#0b1727' },
      light: 0.75, fog: 0.12, dark: 0.22, density: { prey: 22, predator: 6, ambient: 8 }, danger: 1.1,
    },
    {
      id: 'ice', name: '冰海裂谷', tag: '冷冽玻璃 · 白雾浮冰',
      pal: { top: '#dff2fb', mid: '#8fc6e8', deep: '#2c5f8f', glow: '#ffffff', accent: '#9be8ff', silhouette: '#7fb4d8', silhouette2: '#5287b3' },
      light: 1.25, fog: 0.3, dark: 0, density: { prey: 22, predator: 6, ambient: 7 }, danger: 1.15,
    },
    {
      id: 'magma', name: '火山热泉', tag: '暗红岩浆 · 喷发预警',
      pal: { top: '#5b2130', mid: '#7c2e26', deep: '#2a0f14', glow: '#ffb347', accent: '#ff5f3f', silhouette: '#43181c', silhouette2: '#2a0d10' },
      light: 0.8, fog: 0.1, dark: 0.26, density: { prey: 20, predator: 7, ambient: 8 }, danger: 1.35,
    },
    {
      id: 'abyss', name: '深渊', tag: '纯黑 · 生物荧光',
      pal: { top: '#060a18', mid: '#081020', deep: '#020409', glow: '#4de3ff', accent: '#7c5cff', silhouette: '#0c1830', silhouette2: '#060d1c' },
      light: 0.55, fog: 0, dark: 0.75, density: { prey: 18, predator: 8, ambient: 12 }, danger: 1.6,
    },
  ]);

  // 构建视差背景层（世界尺寸 + 边距）
  S.buildBackground = function (sceneIdx, W, H) {
    const sc = S[sceneIdx];
    const MX = 620, MY = 320;
    const w = W + MX * 2, h = H + MY * 2;
    const layers = [];
    const rnd = U.seeded(1000 + sceneIdx * 77);

    // 远景：渐变水体
    const far = document.createElement('canvas');
    far.width = w; far.height = h;
    const g = far.getContext('2d');
    const gr = g.createLinearGradient(0, 0, 0, h);
    gr.addColorStop(0, sc.pal.top);
    gr.addColorStop(0.45, sc.pal.mid);
    gr.addColorStop(1, sc.pal.deep);
    g.fillStyle = gr;
    g.fillRect(0, 0, w, h);
    // 层次雾带（增加水体纵深）
    for (let i = 0; i < 5; i++) {
      const y = h * (0.14 + i * 0.17) + rnd() * 60;
      const bh = 90 + rnd() * 170;
      const hg = g.createLinearGradient(0, y - bh, 0, y + bh);
      const tone = i % 2 === 0 ? U.hex(sc.pal.top) : U.hex(sc.pal.deep);
      hg.addColorStop(0, U.rgb(tone, 0));
      hg.addColorStop(0.5, U.rgb(tone, 0.22));
      hg.addColorStop(1, U.rgb(tone, 0));
      g.fillStyle = hg;
      g.fillRect(0, y - bh, w, bh * 2);
    }
    // 柔光斑
    for (let i = 0; i < 22; i++) {
      const x = rnd() * w, y = rnd() * h * 0.85, r = 70 + rnd() * 300;
      const rg = g.createRadialGradient(x, y, 0, x, y, r);
      rg.addColorStop(0, U.rgb(U.hex(sc.pal.glow), 0.1));
      rg.addColorStop(1, U.rgb(U.hex(sc.pal.glow), 0));
      g.fillStyle = rg;
      g.fillRect(x - r, y - r, r * 2, r * 2);
    }
    layers.push({ cv: far, f: 0.25 });

    // 中景：剪影
    const mid = document.createElement('canvas');
    mid.width = w; mid.height = h;
    const m = mid.getContext('2d');
    m.fillStyle = U.rgb(U.hex(sc.pal.silhouette), 0.85);
    const c1 = U.hex(sc.pal.silhouette), c2 = U.hex(sc.pal.silhouette2);
    const decoCount = 44;
    for (let i = 0; i < decoCount; i++) {
      const x = rnd() * w, y = h * (0.38 + rnd() * 0.62), s = 60 + rnd() * 210;
      m.fillStyle = U.rgb(U.mix(c1, c2, rnd()), 0.62 + rnd() * 0.33);
      drawDeco(m, sc.id, x, y, s, rnd);
    }
    layers.push({ cv: mid, f: 0.55 });

    // 近景：底部轮廓 + 前景植物
    const near = document.createElement('canvas');
    near.width = w; near.height = h;
    const n = near.getContext('2d');
    n.fillStyle = U.rgb(c2, 1);
    n.beginPath();
    n.moveTo(0, h);
    for (let x = 0; x <= w; x += 90) {
      const y = h - 40 - Math.sin(x * 0.004 + sceneIdx) * 60 - rnd() * 60;
      n.lineTo(x, y);
    }
    n.lineTo(w, h);
    n.closePath();
    n.fill();
    for (let i = 0; i < 32; i++) {
      const x = rnd() * w, y = h - 10 - rnd() * 110, s = 50 + rnd() * 130;
      n.fillStyle = U.rgb(U.shade(c2, 0.72), 0.9);
      drawPlant(n, sc.id, x, y, s, rnd);
    }
    layers.push({ cv: near, f: 0.85 });

    // 柔和光柱层（预渲染带模糊，运行时零成本）
    if (sc.light > 0.2) {
      const shafts = document.createElement('canvas');
      shafts.width = w; shafts.height = h;
      const sctx = shafts.getContext('2d');
      try { sctx.filter = 'blur(34px)'; } catch (e) {}
      sctx.globalCompositeOperation = 'lighter';
      for (let i = 0; i < 5; i++) {
        const x = w * (0.12 + i * 0.19) + rnd() * 120;
        const sway = (rnd() - 0.5) * 0.22;
        sctx.save();
        sctx.translate(x, 0);
        sctx.rotate(sway);
        const sg = sctx.createLinearGradient(0, -100, 0, h * 0.92);
        sg.addColorStop(0, U.rgb(U.hex(sc.pal.glow), 0.2 * sc.light));
        sg.addColorStop(0.55, U.rgb(U.hex(sc.pal.glow), 0.1 * sc.light));
        sg.addColorStop(1, U.rgb(U.hex(sc.pal.glow), 0));
        sctx.fillStyle = sg;
        const sw = 110 + rnd() * 170;
        sctx.fillRect(-sw * 0.5, -100, sw, h * 1.1);
        sctx.restore();
      }
      layers.push({ cv: shafts, f: 0.45, light: true });
    }

    return { layers: layers, mx: MX, my: MY };
  };

  function drawDeco(m, id, x, y, s, rnd) {
    if (id === 'reef' || id === 'jelly') {
      // 珊瑚丛 / 荧光水草
      for (let b = 0; b < 4; b++) {
        const bx = x + (rnd() - 0.5) * s, bh = s * (0.5 + rnd() * 0.9);
        m.beginPath();
        m.moveTo(bx - s * 0.06, y);
        m.quadraticCurveTo(bx - s * 0.1, y - bh * 0.55, bx + (rnd() - 0.5) * s * 0.3, y - bh);
        m.quadraticCurveTo(bx + s * 0.12, y - bh * 0.5, bx + s * 0.06, y);
        m.closePath();
        m.fill();
      }
      m.beginPath();
      m.ellipse(x, y, s * 0.55, s * 0.16, 0, 0, U.TAU);
      m.fill();
    } else if (id === 'wreck') {
      // 沉船残骸
      m.save();
      m.translate(x, y);
      m.rotate((rnd() - 0.5) * 0.5);
      m.fillRect(-s * 0.6, -s * 0.16, s * 1.2, s * 0.32);
      m.fillRect(-s * 0.06, -s * 0.85, s * 0.09, s * 0.75);
      m.beginPath();
      m.moveTo(0, -s * 0.8);
      m.lineTo(s * 0.34, -s * 0.3);
      m.lineTo(0, -s * 0.3);
      m.closePath();
      m.fill();
      m.restore();
    } else if (id === 'ice') {
      // 冰山
      m.beginPath();
      m.moveTo(x - s * 0.55, y);
      m.lineTo(x - s * 0.3, y - s * 0.9);
      m.lineTo(x + s * 0.05, y - s * 0.5);
      m.lineTo(x + s * 0.3, y - s * 1.05);
      m.lineTo(x + s * 0.55, y);
      m.closePath();
      m.fill();
    } else if (id === 'magma') {
      // 岩石与喷口
      m.beginPath();
      m.moveTo(x - s * 0.5, y);
      m.lineTo(x - s * 0.32, y - s * 0.55);
      m.lineTo(x + s * 0.1, y - s * 0.75);
      m.lineTo(x + s * 0.45, y - s * 0.2);
      m.lineTo(x + s * 0.5, y);
      m.closePath();
      m.fill();
    } else {
      // 深渊骸骨
      m.save();
      m.translate(x, y);
      m.rotate((rnd() - 0.5) * 0.4);
      for (let r = 0; r < 6; r++) {
        m.beginPath();
        m.ellipse(0, -r * s * 0.12, s * (0.5 - r * 0.06), s * 0.05, 0, Math.PI, U.TAU);
        m.lineWidth = s * 0.035;
        m.strokeStyle = m.fillStyle;
        m.stroke();
      }
      m.fillRect(-s * 0.04, -s * 0.75, s * 0.08, s * 0.8);
      m.restore();
    }
  }

  function drawPlant(n, id, x, y, s, rnd) {
    if (id === 'jelly' || id === 'abyss') {
      n.beginPath();
      n.moveTo(x - s * 0.12, y);
      n.quadraticCurveTo(x - s * 0.3, y - s * 0.7, x + (rnd() - 0.5) * s * 0.4, y - s);
      n.quadraticCurveTo(x + s * 0.28, y - s * 0.6, x + s * 0.12, y);
      n.closePath();
      n.fill();
    } else if (id === 'ice') {
      n.beginPath();
      n.moveTo(x - s * 0.4, y);
      n.lineTo(x, y - s * 0.9);
      n.lineTo(x + s * 0.4, y);
      n.closePath();
      n.fill();
    } else {
      for (let b = 0; b < 3; b++) {
        const bx = x + (rnd() - 0.5) * s * 0.6, bh = s * (0.4 + rnd() * 0.8);
        n.beginPath();
        n.moveTo(bx - s * 0.05, y);
        n.quadraticCurveTo(bx - s * 0.14, y - bh * 0.6, bx + (rnd() - 0.5) * s * 0.25, y - bh);
        n.quadraticCurveTo(bx + s * 0.14, y - bh * 0.55, bx + s * 0.05, y);
        n.closePath();
        n.fill();
      }
    }
  }

  /* ================= 卡牌 ================= */
  const K = (DT.cards = {});
  K.schools = {
    speed: { name: '速度流', icon: '🗡️', color: '#4facfe', bonus3: '+12% 速度 · 冲刺冲击波', bonus5: '+22% 速度 · 冲刺冲击波增强' },
    poison: { name: '剧毒流', icon: '☠️', color: '#7cf57c', bonus3: '毒雾半径 +40%', bonus5: '毒雾半径 +80% · 毒伤翻倍' },
    behemoth: { name: '巨兽流', icon: '🛡️', color: '#ffb347', bonus3: '体型 +12%', bonus5: '体型 +22% · 漩涡半径 +50%' },
    agile: { name: '灵巧流', icon: '🌀', color: '#c084fc', bonus3: '受伤 -15%', bonus5: '受伤 -28% · 冷却缩短' },
    curse: { name: '诅咒流', icon: '🔥', color: '#ff5f5f', bonus3: '进化点 +15%', bonus5: '进化点 +35%' },
  };

  // rarity: 0 普通 1 稀有 2 史诗 3 传说 4 诅咒
  const R = ['普通', '稀有', '史诗', '传说', '诅咒'];
  const RC = ['#e2e8f0', '#60a5fa', '#c084fc', '#fbbf24', '#ff5f5f'];
  K.rarityNames = R;
  K.rarityColors = RC;

  K.all = [
    // ---- 速度流 ----
    c('speed', 0, '疾风之鳍', '💨', '移动速度 +14%', (p) => (p.mods.speed *= 1.14)),
    c('speed', 0, '流线进化', '🐟', '移动速度 +10%，转向 +15%', (p) => { p.mods.speed *= 1.1; p.mods.turn *= 1.15; }),
    c('speed', 1, '闪电冲刺', '⚡', '冲刺冷却 -30%', (p) => (p.mods.dashCd *= 0.7)),
    c('speed', 1, '连杀加速', '🔥', '吞食后 3 秒内速度 +30%', (p) => (p.mods.comboSpeed = true)),
    c('speed', 2, '瞬步', '✨', '冲刺距离 +45%', (p) => (p.mods.dashDist *= 1.45)),
    c('speed', 2, '急转回旋', '🌀', '转向速度 +55%', (p) => (p.mods.turn *= 1.55)),
    c('speed', 3, '音速吞噬', '🚀', '速度 +30%，冲刺后首次吞食进化点 ×3', (p) => { p.mods.speed *= 1.3; p.mods.dashEat = true; }),

    // ---- 剧毒流 ----
    c('poison', 0, '毒刺', '🌵', '被捕食者咬中时其损失体型', (p) => (p.mods.thorns = Math.max(p.mods.thorns, 0.5))),
    c('poison', 1, '毒雾', '☠️', '身体周围散发毒雾，小鱼受损减速', (p) => (p.mods.poisonAura = Math.max(p.mods.poisonAura, 90))),
    c('poison', 1, '腐蚀之咬', '🧪', '进化点 +25%', (p) => (p.mods.epMul *= 1.25)),
    c('poison', 2, '深渊抗体', '💉', '免疫环境伤害（电网/岩浆/寒流）', (p) => (p.mods.hazardImmune = true)),
    c('poison', 2, '剧毒血肉', '🩸', '捕食者咬你后自身中毒损失体型', (p) => (p.mods.thorns = Math.max(p.mods.thorns, 1))),
    c('poison', 2, '毒爆', '💥', '被咬时毒爆击退周围捕食者', (p) => (p.mods.poisonBurst = true)),
    c('poison', 3, '瘟疫之源', '🐲', '毒雾半径翻倍，进化点 +15%', (p) => { p.mods.poisonAura = Math.max(p.mods.poisonAura, 90) * 2; p.mods.epMul *= 1.15; }),

    // ---- 巨兽流 ----
    c('behemoth', 0, '巨兽之躯', '🐋', '体型 +18%，速度 -6%', (p) => { p.mods.sizeMul *= 1.18; p.mods.speed *= 0.94; }),
    c('behemoth', 0, '厚重鳞片', '🛡️', '受到伤害 -25%', (p) => (p.mods.dmgTaken *= 0.75)),
    c('behemoth', 1, '吞噬漩涡', '🌀', '周围小鱼被自动吸入', (p) => (p.mods.suction = Math.max(p.mods.suction, 130))),
    c('behemoth', 1, '恐惧光环', '👑', '捕食者不敢轻易靠近', (p) => (p.mods.fear = true)),
    c('behemoth', 2, '贪婪成长', '📈', '成长速度 +35%', (p) => (p.mods.grow *= 1.35)),
    c('behemoth', 2, '不屈', '🫀', '致命伤害时保留体型并免疫 3 秒（每关 1 次）', (p) => (p.mods.unbreakable = true)),
    c('behemoth', 3, '深海霸主', '🔱', '体型 +32%，漩涡半径 +50%', (p) => { p.mods.sizeMul *= 1.32; p.mods.suction = Math.max(p.mods.suction, 130) * 1.5; }),

    // ---- 灵巧流 ----
    c('agile', 0, '滑行', '🌊', '耐力消耗 -40%', (p) => (p.mods.staminaUse *= 0.6)),
    c('agile', 0, '灵视', '👁️', '视野 +25%，显示捕食者预警', (p) => { p.mods.vision *= 1.25; p.mods.radar = true; }),
    c('agile', 1, '闪避', '🪽', '受到伤害 -28%', (p) => (p.mods.dmgTaken *= 0.72)),
    c('agile', 1, '诱饵分身', '🎭', '冲刺时留下分身迷惑捕食者', (p) => (p.mods.decoy = true)),
    c('agile', 2, '惊吓跳跃', '⚡', '被咬时短距离瞬移脱身', (p) => (p.mods.blink = true)),
    c('agile', 2, '回旋镖鳍', '🪃', '转向 +40%，速度 +8%', (p) => { p.mods.turn *= 1.4; p.mods.speed *= 1.08; }),
    c('agile', 3, '幻影之躯', '👻', '每 18 秒自动免疫一次伤害', (p) => (p.mods.ghost = true)),

    // ---- 诅咒流（高风险高收益）----
    cc('curse', 4, '贪婪之舌', '👅', '进化点 ×2，但捕食者锁定距离 +50%', (p) => { p.mods.epMul *= 2; p.mods.spotted = true; }),
    cc('curse', 4, '巨物诅咒', '🗿', '体型 +38%，速度 -16%', (p) => { p.mods.sizeMul *= 1.38; p.mods.speed *= 0.84; }),
    cc('curse', 4, '血肉代价', '🩸', '进化点 +80%，立即损失 12% 体型', (p) => { p.mods.epMul *= 1.8; p.size *= 0.88; }),
    cc('curse', 4, '饥饿深渊', '🕳️', '吞食回复体型，但体型持续缓慢缩小', (p) => { p.mods.eatHeal = true; p.mods.shrink = true; }),
    cc('curse', 4, '双刃之鳞', '⚔️', '成长 +60%，受到伤害 +50%', (p) => { p.mods.grow *= 1.6; p.mods.dmgTaken *= 1.5; }),
    cc('curse', 4, '命运轮盘', '🎲', '不再三选一（随机获得），进化点 +40%', (p) => { p.mods.randomCard = true; p.mods.epMul *= 1.4; }),
    cc('curse', 4, '深渊契约', '📜', '速度/成长/进化点 +20%，但最大体型 -10%', (p) => { p.mods.speed *= 1.2; p.mods.grow *= 1.2; p.mods.epMul *= 1.2; p.mods.sizeCap = 0.9; }),
  ];

  function c(school, rarity, name, icon, desc, apply) {
    return { school, rarity, name, icon, desc, apply, curse: false };
  }
  function cc(school, rarity, name, icon, desc, apply) {
    return { school, rarity, name, icon, desc, apply, curse: true };
  }

  // 抽卡：稀有度加权，诅咒卡独立概率
  K.roll = function (n, luck) {
    const out = [];
    const pool = K.all.slice();
    const L = luck || 0;
    while (out.length < n && pool.length) {
      const r = Math.random();
      let maxR;
      if (r < 0.05 + L * 0.02) maxR = 3;
      else if (r < 0.2 + L * 0.04) maxR = 2;
      else if (r < 0.55) maxR = 1;
      else maxR = 0;
      const cand = pool.filter((k) => k.rarity <= maxR && (!k.curse || Math.random() < 0.18 + L * 0.06));
      const pickFrom = cand.length ? cand : pool;
      const card = pickFrom[Math.floor(Math.random() * pickFrom.length)];
      out.push(card);
      pool.splice(pool.indexOf(card), 1);
    }
    return out;
  };

  K.applyTo = function (p, card) {
    card.apply(p);
    p.cards.push(card);
    p.schoolCounts[card.school] = (p.schoolCounts[card.school] || 0) + 1;
    DT.game.recalc(p);
  };
})();
