/* 吞噬之潮 · game.js — 游戏循环 / 模式 / 难度 / 双人 / Boss */
(function () {
  const DT = (window.DT = window.DT || {});
  const U = DT.util, F = DT.fish, S = DT.scenes, K = DT.cards, A = DT.audio;

  const G = (DT.game = {});
  const WORLD_W = 2600, WORLD_H = 1500;

  G.state = 'menu';   // menu | playing | cardpick | paused | results
  G.mode = 'solo';    // solo | coop | versus | endless
  G.paused = false;
  G.quality = 2;      // 2 高 1 中 0 低
  G.shakeOn = true;
  G.players = [];
  G.records = loadRecords();

  const world = (G.world = {
    sceneIdx: 0, bg: null, time: 0, fish: [], particles: [], hazards: [], texts: [],
    boss: null, duel: null, cam: { x: WORLD_W / 2, y: WORLD_H / 2, zoom: 1, shake: 0 },
    eaten: 0, wave: 0, levelTime: 0, spawnT: 0, transition: 0, hitStop: 0,
  });

  let canvas, ctx, W = 1280, H = 720, DPR = 1;
  let darkCv = null, darkCtx = null;
  let lastT = 0, fpsAcc = 0, fpsN = 0, fps = 60;
  let levelIdx = 0, vsScore = [0, 0], lives = 3, endTimer = 0;

  const LEVELS = [
    { scene: 0, type: 'eat', target: 26, time: 110, name: '第一关 · 初入浅滩', tip: '吞食 26 条小鱼完成进化' },
    { scene: 1, type: 'eat', target: 32, time: 120, name: '第二关 · 荧光迷林', tip: '小心电网水母，吞食 32 条鱼' },
    { scene: 2, type: 'clear', waves: 3, time: 150, name: '第三关 · 沉船猎场', tip: '清空 3 波鱼群' },
    { scene: 3, type: 'survive', time: 95, name: '第四关 · 冰海求生', tip: '在白雾与浮冰间存活 95 秒' },
    { scene: 4, type: 'eat', target: 40, time: 130, name: '第五关 · 熔岩奔逃', tip: '躲开喷发口，吞食 40 条鱼' },
    { scene: 5, type: 'boss', name: '终关 · 深渊巨口', tip: '咬住发光弱点，击败巨口鲸' },
  ];
  G.LEVELS = LEVELS;

  /* ================= 初始化 ================= */
  G.init = function (cv) {
    canvas = cv;
    ctx = canvas.getContext('2d');
    resize();
    window.addEventListener('resize', resize);
    bindInput();
    loadScene(0);
    requestAnimationFrame(loop);
  };

  function resize() {
    DPR = Math.min(window.devicePixelRatio || 1, G.quality === 2 ? 1.6 : G.quality === 1 ? 1.25 : 1);
    W = window.innerWidth; H = window.innerHeight;
    canvas.width = Math.floor(W * DPR);
    canvas.height = Math.floor(H * DPR);
    canvas.style.width = W + 'px';
    canvas.style.height = H + 'px';
    world.bg = S.buildBackground(world.sceneIdx, WORLD_W, WORLD_H);
    world.cam.zoom = Math.min(1.05, Math.max(0.5, W / 1500));
  }

  /* ================= 玩家 ================= */
  function makePlayer(id, style) {
    const sp = F.species[style.sp];
    return {
      id: id,
      name: style.name || 'P' + (id + 1),
      style: style,
      x: WORLD_W * (id === 0 ? 0.35 : 0.65), y: WORLD_H * 0.5,
      vx: 0, vy: 0, angle: id === 0 ? 0 : Math.PI,
      size: sp.size, baseSize: sp.size,
      stamina: 100, dashT: 0, dashCd: 0, invuln: 2, biteCd: 0,
      ep: 0, totalEp: 0, level: 1, xp: 0, xpNeed: 42,
      cards: [], schoolCounts: {}, mods: null,
      combo: 0, comboT: 0, comboSpeedT: 0, eatFlash: 0,
      alive: true, ghost: false, reviveT: 0, stun: 0,
      eaten: 0, maxLen: sp.size, dashEat: false, ghostT: 0, unbreakT: 0,
      input: { x: 0, y: 0, dash: false, act: false },
    };
  }

  G.applyStyle = function (id, style) {
    if (G.players[id]) {
      G.players[id].style = style;
      G.players[id].name = style.name || 'P' + (id + 1);
    }
  };

  G.recalc = function (p) {
    const m = p.mods;
    const sizeEff = Math.max(16, p.size);
    p.maxSpeed = 258 * m.speed * Math.pow(30 / sizeEff, 0.3) * (p.comboSpeedT > 0 ? 1.3 : 1);
    p.accel = 1550 * m.speed * (30 / sizeEff) * 0.55;
    p.turnRate = 6.4 * m.turn;
    p.dashCdMax = 1.45 * m.dashCd;
    p.dashPower = 470 * m.dashDist;
    p.sizeCap = 150 * (m.sizeCap || 1);
  };

  function resetMods(p) {
    p.mods = {
      speed: 1, turn: 1, dashCd: 1, dashDist: 1, grow: 1, epMul: 1,
      dmgTaken: 1, staminaUse: 1, vision: 1, comboSpeed: false, dashEat: false,
      thorns: 0, poisonAura: 0, poisonBurst: false, hazardImmune: false,
      suction: 0, fear: false, unbreakable: false, radar: false,
      decoy: false, blink: false, ghost: false, eatHeal: false, shrink: false,
      randomCard: false, sizeCap: 1, spotted: false,
    };
    p.cards = [];
    p.schoolCounts = {};
    G.recalc(p);
  }

  /* ================= 模式开始 ================= */
  G.startMode = function (mode) {
    G.mode = mode;
    G.state = 'playing';
    G.paused = false;
    A.init();
    levelIdx = 0;
    vsScore = [0, 0];
    lives = 3;
    world.time = 0;

    const styles = DT.ui.getStyles();
    G.players = [makePlayer(0, styles[0])];
    if (mode === 'coop' || mode === 'versus') G.players.push(makePlayer(1, styles[1]));
    G.players.forEach((p) => resetMods(p));

    if (mode === 'endless') {
      loadScene(0);
      G.diff = 1;
    } else {
      loadScene(LEVELS[0].scene);
    }
    world.transition = 1;
    DT.ui.screen('none');
    DT.ui.banner(
      mode === 'endless' ? '🌊 无尽生存' : mode === 'coop' ? '🤝 双人合作' : mode === 'versus' ? '⚔️ 双人竞争' : '🐟 单人远征',
      mode === 'endless' ? '场景每 2.5 分钟轮换，难度无限递增' : LEVELS[0].tip
    );
  };

  G.retry = function () {
    G.startMode(G.mode);
  };

  G.toMenu = function () {
    G.state = 'menu';
    G.paused = false;
    world.boss = null;
    world.duel = null;
    loadScene(0);
    DT.ui.screen('menu');
    DT.ui.updateHUD();
  };

  function loadScene(idx) {
    world.sceneIdx = idx;
    world.bg = S.buildBackground(idx, WORLD_W, WORLD_H);
    world.fish.length = 0;
    world.particles.length = 0;
    world.hazards.length = 0;
    world.texts.length = 0;
    world.boss = null;
    world.duel = null;
    world.eaten = 0;
    world.wave = 0;
    world.spawnT = 0;
    world.spawnCount = 0;
    world.spawnBudget = G.mode === 'versus' ? 58 : Infinity;
    world.spawnedAll = false;
    buildHazards(idx);
    buildPlankton();
    buildKelp();
    const target = fishTarget();
    for (let i = 0; i < target; i++) spawnFish(null, true);
    if (G.state === 'playing') {
      A.setScene(idx);
      DT.ui.banner(S[idx].name, S[idx].tag);
    }
    world.transition = 1;
  }

  /* ================= 鱼群 ================= */
  function fishTarget() {
    const q = [64, 96, 128][G.quality];
    const diff = G.diff || 1;
    return Math.round(q * (1 + (diff - 1) * 0.12));
  }

  function spawnFish(forcePredator, anywhere) {
    const alive = G.players.filter((p) => p.alive && !p.ghost);
    const base = alive.length ? Math.max.apply(null, alive.map((p) => p.size)) : 30;
    const diff = G.diff || 1;
    const wantPredator = forcePredator !== null ? forcePredator : Math.random() < Math.min(0.42, 0.1 + diff * 0.07);

    let len;
    if (wantPredator) len = base * U.rand(1.22, 1.62 + diff * 0.16);
    else len = base * U.rand(0.22, 0.68);
    len = U.clamp(len, 12, 340);

    let x, y;
    if (anywhere) {
      x = U.rand(WORLD_W * 0.9, WORLD_W * 0.1);
      y = U.rand(WORLD_H * 0.9, WORLD_H * 0.1);
    } else {
      const side = U.randInt(0, 3);
      x = side === 0 ? 40 : side === 1 ? WORLD_W - 40 : U.rand(WORLD_W * 0.9, WORLD_W * 0.1);
      y = side === 2 ? 40 : side === 3 ? WORLD_H - 40 : U.rand(WORLD_H * 0.9, WORLD_H * 0.1);
    }

    const spIdx = wantPredator ? U.pick([5, 2, 3, 0]) : U.randInt(0, 5);
    const st = F.makeStyle(spIdx, {
      glow: Math.random() < 0.22 ? (Math.random() < 0.5 ? 1 : 2) : 0,
      accessory: '无',
      pattern: Math.random() < 0.6 ? F.species[spIdx].pattern : U.pick(F.patterns),
    });
    const sp = F.species[spIdx];
    world.fish.push({
      x: x, y: y, vx: U.rand(60, -60), vy: U.rand(60, -60), angle: U.rand(Math.PI, -Math.PI),
      len: len, style: st, animT: U.rand(4), predator: !!wantPredator,
      speed: (wantPredator ? 168 : 196) * sp.speed * Math.pow(30 / len, 0.28) * (1 + diff * 0.03),
      turn: 2.4 * sp.turn,
      wanderT: U.rand(3), wanderAngle: U.rand(Math.PI, -Math.PI), fearT: 0, target: null, alive: true,
      xp: Math.max(2, Math.round(len / 5)), ep: Math.max(2, Math.round(len * 0.7)),
      glow: st.glow,
    });
    world.spawnCount++;
    return world.fish[world.fish.length - 1];
  }

  function updateFish(dt) {
    const fish = world.fish;
    const players = G.players.filter((p) => p.alive && !p.ghost);
    for (let i = 0; i < fish.length; i++) {
      const f = fish[i];
      if (!f.alive) continue;

      // 目标选择（低频）
      f.wanderT -= dt;
      if (f.wanderT <= 0 || !isFinite(f.wanderAngle)) {
        f.wanderT = U.rand(3.2, 1.2);
        f.wanderAngle = U.rand(Math.PI, -Math.PI);
      }

      let steerX = Math.cos(f.wanderAngle), steerY = Math.sin(f.wanderAngle);
      const margin = 180;
      if (f.x < margin) steerX += 1.4;
      if (f.x > WORLD_W - margin) steerX -= 1.4;
      if (f.y < margin) steerY += 1.4;
      if (f.y > WORLD_H - margin) steerY -= 1.4;

      // 与玩家互动
      for (let j = 0; j < players.length; j++) {
        const p = players[j];
        const dx = p.x - f.x, dy = p.y - f.y;
        const d2 = dx * dx + dy * dy;
        if (d2 > 620 * 620) continue;
        const d = Math.sqrt(d2) || 1;
        const pBig = p.size > f.len * 1.15;
        const fBig = f.len > p.size * 1.15;
        const spot = p.mods && p.mods.spotted ? 1.5 : 1;
        if (pBig) {
          // 猎物逃跑
          const fearR = 320 * spot * (f.predator ? 0.75 : 1);
          if (d < fearR) {
            steerX -= (dx / d) * (2.6 * (1 - d / fearR) + 0.4);
            steerY -= (dy / d) * (2.6 * (1 - d / fearR) + 0.4);
          }
        } else if (fBig) {
          // 捕食者追猎
          const chaseR = (p.mods && p.mods.fear ? 260 : 430) * spot;
          if (d < chaseR) {
            steerX += (dx / d) * 2.2;
            steerY += (dy / d) * 2.2;
          }
        }
      }

      // 平滑转向
      const targetAngle = Math.atan2(steerY, steerX);
      f.angle = U.angleLerp(f.angle, targetAngle, Math.min(1, f.turn * dt));
      const sp = f.speed * (f.predator ? 1 : 1);
      f.vx = U.approach(f.vx, Math.cos(f.angle) * sp, 2.6, dt);
      f.vy = U.approach(f.vy, Math.sin(f.angle) * sp, 2.6, dt);

      // 洋流
      for (let h = 0; h < world.hazards.length; h++) {
        const hz = world.hazards[h];
        if (hz.type === 'current' && Math.abs(f.x - hz.x) < hz.w / 2 && Math.abs(f.y - hz.y) < hz.h / 2) {
          f.vx += hz.dx * dt * 60;
          f.vy += hz.dy * dt * 60;
        }
      }

      f.x += f.vx * dt;
      f.y += f.vy * dt;
      f.x = U.clamp(f.x, 30, WORLD_W - 30);
      f.y = U.clamp(f.y, 30, WORLD_H - 30);
      f.animT += dt * (2.4 + Math.abs(f.vx) * 0.012);

      // 捕食者吃小鱼（低频采样，保持性能）
      if (f.predator && Math.random() < dt * 2.2) {
        for (let j = 0; j < fish.length; j += 1) {
          const g = fish[j];
          if (g === f || !g.alive || g.predator || g.len > f.len * 0.72) continue;
          const dx = g.x - f.x, dy = g.y - f.y;
          if (dx * dx + dy * dy < (f.len * 0.5 + g.len * 0.5) * (f.len * 0.5 + g.len * 0.5)) {
            g.alive = false;
            f.len = Math.min(360, Math.sqrt(f.len * f.len + g.len * g.len * 0.06));
            burst(g.x, g.y, 5, U.hex(g.style.c1), 1.2);
            break;
          }
        }
      }
    }

    // 回收 & 生成
    for (let i = world.fish.length - 1; i >= 0; i--) {
      if (!world.fish[i].alive) world.fish.splice(i, 1);
    }
    world.spawnT -= dt;
    const target = fishTarget();
    if (world.spawnT <= 0 && world.fish.length < target && world.spawnCount < world.spawnBudget) {
      world.spawnT = 0.22;
      spawnFish(null, false);
    }
    if (world.spawnCount >= world.spawnBudget) world.spawnedAll = true;
  }

  /* ================= 玩家更新 ================= */
  function updatePlayer(p, dt) {
    if (p.ghost) {
      p.reviveT += dt;
      return;
    }
    if (!p.alive) return;
    if (p.stun > 0) {
      p.stun -= dt;
      p.vx *= 0.94; p.vy *= 0.94;
      return;
    }

    // 输入
    const inp = readInput(p.id);
    p.input = inp;
    const mag = Math.hypot(inp.x, inp.y);
    if (mag > 0.08) {
      const targetAngle = Math.atan2(inp.y, inp.x);
      p.angle = U.angleLerp(p.angle, targetAngle, Math.min(1, p.turnRate * dt));
    }

    // 冲刺
    p.dashCd -= dt;
    if (inp.dash && p.dashCd <= 0 && p.stamina >= 22) {
      p.dashCd = p.dashCdMax;
      p.stamina -= 22 * p.mods.staminaUse;
      p.vx += Math.cos(p.angle) * p.dashPower;
      p.vy += Math.sin(p.angle) * p.dashPower;
      p.dashT = 0.32;
      if (p.mods.dashEat) p.dashEat = true;
      A.sfx('dash');
      for (let i = 0; i < 8; i++) {
        addParticle({
          x: p.x - Math.cos(p.angle) * p.size * 0.5, y: p.y - Math.sin(p.angle) * p.size * 0.5,
          vx: -Math.cos(p.angle) * U.rand(180, 60) + U.rand(50, -50),
          vy: -Math.sin(p.angle) * U.rand(180, 60) + U.rand(50, -50),
          life: 0.5, size: U.rand(7, 3), color: { r: 210, g: 240, b: 255 }, type: 'bubble',
        });
      }
    }
    p.dashT = Math.max(0, p.dashT - dt);
    p.stamina = Math.min(100, p.stamina + dt * (p.dashT > 0 ? 4 : 19));

    // 移动
    const accel = p.accel * (mag > 1 ? 1 : mag) * (p.dashT > 0 ? 0.35 : 1);
    p.vx += Math.cos(p.angle) * accel * dt;
    p.vy += Math.sin(p.angle) * accel * dt;
    const drag = Math.pow(0.0016, dt);
    p.vx *= drag; p.vy *= drag;
    const sp = Math.hypot(p.vx, p.vy);
    const cap = p.maxSpeed * (p.dashT > 0 ? 2.6 : 1);
    if (sp > cap) { p.vx = (p.vx / sp) * cap; p.vy = (p.vy / sp) * cap; }

    p.x += p.vx * dt;
    p.y += p.vy * dt;
    const m = 60;
    if (p.x < m) { p.x = m; p.vx = Math.abs(p.vx) * 0.4; }
    if (p.x > WORLD_W - m) { p.x = WORLD_W - m; p.vx = -Math.abs(p.vx) * 0.4; }
    if (p.y < m) { p.y = m; p.vy = Math.abs(p.vy) * 0.4; }
    if (p.y > WORLD_H - m) { p.y = WORLD_H - m; p.vy = -Math.abs(p.vy) * 0.4; }

    // 状态计时
    p.invuln = Math.max(0, p.invuln - dt);
    p.biteCd = Math.max(0, p.biteCd - dt);
    p.comboT = Math.max(0, p.comboT - dt);
    if (p.comboT <= 0) p.combo = 0;
    p.comboSpeedT = Math.max(0, p.comboSpeedT - dt);
    p.eatFlash = Math.max(0, p.eatFlash - dt * 2.2);
    p.unbreakT = Math.max(0, p.unbreakT - dt);
    if (p.mods.ghost) {
      p.ghostT -= dt;
      if (p.ghostT <= 0) { p.invuln = Math.max(p.invuln, 2.2); p.ghostT = 18; }
    }

    // 巨兽/诅咒持续效果
    if (p.mods.shrink) {
      p.size = Math.max(14, p.size - dt * 0.55);
    }
    // 毒雾
    if (p.mods.poisonAura > 0) {
      if (Math.random() < dt * 22) {
        addParticle({
          x: p.x + U.rand(p.mods.poisonAura, -p.mods.poisonAura) * 0.6,
          y: p.y + U.rand(p.mods.poisonAura, -p.mods.poisonAura) * 0.6,
          vx: U.rand(18, -18), vy: U.rand(18, -18) - 12,
          life: 1.6, size: U.rand(15, 8), color: { r: 120, g: 240, b: 130 }, type: 'poison',
        });
      }
    }
    // 吞噬漩涡
    if (p.mods.suction > 0) {
      for (let i = 0; i < world.fish.length; i++) {
        const f = world.fish[i];
        if (!f.alive || f.len > p.size * 0.8) continue;
        const dx = p.x - f.x, dy = p.y - f.y;
        const d = Math.hypot(dx, dy);
        if (d < p.mods.suction * 2.2 && d > 1) {
          const pull = (1 - d / (p.mods.suction * 2.2)) * 420;
          f.vx += (dx / d) * pull * dt * 2;
          f.vy += (dy / d) * pull * dt * 2;
        }
      }
    }

    // 拖尾粒子
    if (Math.hypot(p.vx, p.vy) > 120 && Math.random() < dt * 26) {
      addParticle({
        x: p.x - Math.cos(p.angle) * p.size * 0.55, y: p.y - Math.sin(p.angle) * p.size * 0.55,
        vx: U.rand(14, -14), vy: U.rand(14, -14), life: 0.65,
        size: U.rand(5, 2), color: { r: 255, g: 255, b: 255 }, type: 'bubble',
      });
    }

    G.recalc(p);
  }

  /* ================= 碰撞：吞食与撕咬 ================= */
  function collisions(dt) {
    const players = G.players.filter((p) => p.alive && !p.ghost);
    for (let j = 0; j < players.length; j++) {
      const p = players[j];
      for (let i = 0; i < world.fish.length; i++) {
        const f = world.fish[i];
        if (!f.alive) continue;
        const dx = f.x - p.x, dy = f.y - p.y;
        const rr = p.size * 0.42 + f.len * 0.36;
        if (dx * dx + dy * dy > rr * rr) continue;

        if (f.len < p.size * 0.86) {
          // 吞食
          f.alive = false;
          p.combo++;
          p.comboT = 2.6;
          if (p.mods.comboSpeed) p.comboSpeedT = 3;
          const comboMul = 1 + Math.min(1.5, p.combo * 0.05);
          let epGain = f.ep * comboMul * p.mods.epMul;
          if (p.dashEat) { epGain *= 3; p.dashEat = false; }
          p.ep += epGain;
          p.totalEp += epGain;
          p.xp += f.xp;
          p.eaten++;
          p.eatFlash = 1;
          world.eaten++;
          const grow = Math.sqrt(p.size * p.size + f.len * f.len * 0.16 * p.mods.grow);
          p.size = Math.min(p.sizeCap, grow);
          if (p.mods.eatHeal) p.size = Math.min(p.sizeCap, p.size + f.len * 0.02);
          p.maxLen = Math.max(p.maxLen, p.size);
          burst(f.x, f.y, 8, U.hex(f.style.c1), 1.6);
          addText(f.x, f.y, '+' + Math.round(epGain) + (p.combo > 2 ? ' ×' + p.combo : ''), p.combo > 5 ? '#ffd23f' : '#c9f3ff');
          A.sfx('eat', { combo: p.combo });

          // 队友共享（合作）
          if (G.mode === 'coop') {
            const mate = G.players[1 - p.id];
            if (mate && (mate.alive || mate.ghost)) {
              mate.ep += epGain * 0.25;
              mate.totalEp += epGain * 0.25;
            }
          }
          // 升级
          if (p.xp >= p.xpNeed) {
            p.xp -= p.xpNeed;
            p.level++;
            p.xpNeed = Math.round(p.xpNeed * 1.32 + 12);
            openCardPick(p);
          }
        } else if (f.len > p.size * 1.15 && p.invuln <= 0 && p.biteCd <= 0) {
          // 被咬
          p.biteCd = 0.85;
          hurtPlayer(p, f.len * 0.022, Math.atan2(p.y - f.y, p.x - f.x));
        }
      }
    }

    // PvP（仅对决阶段）
    if (world.duel) {
      const ps = G.players;
      if (ps.length === 2 && ps[0].alive && ps[1].alive && !ps[0].ghost && !ps[1].ghost) {
        const a = ps[0], b = ps[1];
        const dx = b.x - a.x, dy = b.y - a.y;
        const rr = (a.size + b.size) * 0.42;
        if (dx * dx + dy * dy < rr * rr) {
          const big = a.size >= b.size ? a : b;
          const small = big === a ? b : a;
          if (small.biteCd <= 0 && small.invuln <= 0) {
            small.biteCd = 0.55;
            hurtPlayer(small, small.size * 0.13, Math.atan2(small.y - big.y, small.x - big.x));
            big.size = Math.min(big.sizeCap, big.size + small.size * 0.05);
            burst(small.x, small.y, 12, { r: 255, g: 120, b: 120 }, 2.2);
            A.sfx('bigEat');
            addText(small.x, small.y - 30, '撕咬!', '#ff7b7b');
          }
        }
      }
    }
  }

  function hurtPlayer(p, dmg, knockAngle) {
    if (p.invuln > 0) return;
    let real = dmg * p.mods.dmgTaken;
    if (p.mods.unbreakable && p.size - real < 15 && p.unbreakT <= 0) {
      p.unbreakT = 1;
      real = 0;
      p.invuln = 3;
      addText(p.x, p.y - 40, '不屈!', '#ffd23f');
      A.sfx('level');
      return;
    }
    p.size -= real;
    p.invuln = 0.75;
    p.vx += Math.cos(knockAngle) * 240;
    p.vy += Math.sin(knockAngle) * 240;
    p.combo = 0;
    world.cam.shake = Math.min(22, world.cam.shake + 10);
    burst(p.x, p.y, 10, { r: 255, g: 110, b: 110 }, 1.8);
    A.sfx('hurt');

    // 反伤
    if (p.mods.thorns > 0) {
      for (let i = 0; i < world.fish.length; i++) {
        const f = world.fish[i];
        const dx = f.x - p.x, dy = f.y - p.y;
        if (f.len > p.size * 1.15 && dx * dx + dy * dy < 260 * 260) {
          f.len = Math.max(10, f.len * (1 - 0.08 * p.mods.thorns));
          burst(f.x, f.y, 6, { r: 130, g: 255, b: 130 }, 1.4);
        }
      }
    }
    if (p.mods.poisonBurst) {
      for (let i = 0; i < world.fish.length; i++) {
        const f = world.fish[i];
        const dx = f.x - p.x, dy = f.y - p.y;
        const d = Math.hypot(dx, dy);
        if (f.len > p.size && d < 320 && d > 1) {
          f.vx += (dx / d) * 520;
          f.vy += (dy / d) * 520;
          f.len = Math.max(10, f.len * 0.94);
        }
      }
      burst(p.x, p.y, 18, { r: 130, g: 255, b: 130 }, 2.6);
    }
    if (p.mods.blink) {
      p.x += Math.cos(p.angle + Math.PI) * 180;
      p.y += Math.sin(p.angle + Math.PI) * 180;
      burst(p.x, p.y, 12, { r: 200, g: 180, b: 255 }, 1.8);
    }

    // 死亡判定
    if (p.size < 14) {
      p.size = 14;
      playerDown(p);
    }
  }

  function playerDown(p) {
    if (G.mode === 'solo') {
      lives--;
      if (lives > 0) {
        p.size = 26; p.invuln = 2.4; p.x = WORLD_W / 2; p.y = WORLD_H / 2;
        addText(p.x, p.y - 50, '剩余 ' + lives + ' 条命', '#ffd23f');
      } else {
        p.alive = false;
        endGame(false);
      }
    } else if (G.mode === 'coop') {
      p.ghost = true;
      p.reviveT = 0;
      addText(p.x, p.y - 50, '队友倒下！靠近按 F / Shift 复活', '#ff9d9d');
      A.sfx('die');
      const mate = G.players[1 - p.id];
      if (mate && !mate.alive) endGame(false);
    } else if (G.mode === 'versus') {
      if (world.duel) {
        endRound(1 - p.id);
      } else {
        const mate = G.players[1 - p.id];
        const steal = p.ep * 0.25;
        p.ep -= steal;
        if (mate) mate.ep += steal;
        p.size = 26;
        p.invuln = 2.6;
        p.stun = 1.2;
        addText(p.x, p.y - 50, '被吞食！进化点 -25%', '#ff9d9d');
      }
    } else {
      // endless
      if (p.size < 14) {
        endGame(true);
      }
    }
    A.sfx('die');
  }

  /* ================= 卡牌 ================= */
  let cardPickQueue = [];
  function openCardPick(p) {
    cardPickQueue.push(p);
    if (G.state === 'cardpick') return;
    processCardPick();
  }

  function processCardPick() {
    if (!cardPickQueue.length) return;
    const p = cardPickQueue.shift();
    const cards = K.roll(3);
    G.state = 'cardpick';
    A.sfx('level');
    DT.ui.showCards(cards, '⬆️ ' + p.name + ' 升到 Lv.' + p.level + ' · 选择进化', function (card) {
      K.applyTo(p, card);
      A.sfx('card');
      if (card.curse) addText(p.x, p.y - 60, '诅咒：' + card.name, '#ff5f5f');
      G.state = 'playing';
      if (cardPickQueue.length) processCardPick();
    }, p);
  }

  /* ================= 危险物 ================= */
  function buildHazards(idx) {
    const hz = world.hazards;
    const rnd = U.seeded(555 + idx * 31);
    if (idx === 1) {
      for (let i = 0; i < 14; i++) {
        hz.push({ type: 'jelly', x: 160 + rnd() * (WORLD_W - 320), y: 160 + rnd() * (WORLD_H - 320), r: 66, t: rnd() * 6, hitCd: 0 });
      }
    } else if (idx === 2) {
      for (let i = 0; i < 4; i++) {
        hz.push({ type: 'current', x: 200 + rnd() * (WORLD_W - 400), y: 200 + rnd() * (WORLD_H - 400), w: 520, h: 300, dx: (rnd() - 0.5) * 8, dy: (rnd() - 0.5) * 8 });
      }
    } else if (idx === 3) {
      for (let i = 0; i < 12; i++) {
        hz.push({ type: 'iceberg', x: 180 + rnd() * (WORLD_W - 360), y: 180 + rnd() * (WORLD_H - 360), r: 74 + rnd() * 70, vx: (rnd() - 0.5) * 22, vy: (rnd() - 0.5) * 22 });
      }
    } else if (idx === 4) {
      for (let i = 0; i < 8; i++) {
        hz.push({ type: 'vent', x: 220 + rnd() * (WORLD_W - 440), y: 220 + rnd() * (WORLD_H - 440), r: 120, t: rnd() * 8, phase: 0 });
      }
    }
  }

  function updateHazards(dt) {
    const players = G.players.filter((p) => p.alive && !p.ghost);
    for (let i = 0; i < world.hazards.length; i++) {
      const hz = world.hazards[i];
      if (hz.type === 'jelly') {
        hz.t += dt;
        hz.x += Math.sin(hz.t * 0.5) * 16 * dt;
        hz.y += Math.cos(hz.t * 0.38) * 14 * dt - 6 * dt;
        for (let j = 0; j < players.length; j++) {
          const p = players[j];
          const d = Math.hypot(p.x - hz.x, p.y - hz.y);
          if (d < hz.r + p.size * 0.3 && p.invuln <= 0 && !p.mods.hazardImmune) {
            hurtPlayer(p, p.size * 0.07, Math.atan2(p.y - hz.y, p.x - hz.x));
          }
        }
      } else if (hz.type === 'current') {
        for (let j = 0; j < players.length; j++) {
          const p = players[j];
          if (Math.abs(p.x - hz.x) < hz.w / 2 && Math.abs(p.y - hz.y) < hz.h / 2) {
            p.vx += hz.dx * dt * 52;
            p.vy += hz.dy * dt * 52;
          }
        }
      } else if (hz.type === 'iceberg') {
        hz.x += hz.vx * dt; hz.y += hz.vy * dt;
        if (hz.x < hz.r || hz.x > WORLD_W - hz.r) hz.vx *= -1;
        if (hz.y < hz.r || hz.y > WORLD_H - hz.r) hz.vy *= -1;
        for (let j = 0; j < players.length; j++) {
          const p = players[j];
          const dx = p.x - hz.x, dy = p.y - hz.y;
          const d = Math.hypot(dx, dy);
          const min = hz.r + p.size * 0.35;
          if (d < min && d > 0.1) {
            p.x = hz.x + (dx / d) * min;
            p.y = hz.y + (dy / d) * min;
            p.vx += (dx / d) * 160;
            p.vy += (dy / d) * 160;
          }
        }
      } else if (hz.type === 'vent') {
        hz.t += dt;
        const cycle = hz.t % 6.5;
        hz.phase = cycle < 3.6 ? 0 : cycle < 4.8 ? 1 : 2; // 0 平静 1 预警 2 喷发
        if (hz.phase === 2) {
          for (let j = 0; j < players.length; j++) {
            const p = players[j];
            const d = Math.hypot(p.x - hz.x, p.y - hz.y);
            if (d < hz.r && p.invuln <= 0 && !p.mods.hazardImmune) {
              hurtPlayer(p, p.size * 0.1, Math.atan2(p.y - hz.y, p.x - hz.x));
            }
          }
          if (Math.random() < dt * 30) {
            addParticle({
              x: hz.x + U.rand(hz.r, -hz.r) * 0.7, y: hz.y + U.rand(hz.r, -hz.r) * 0.7,
              vx: U.rand(50, -50), vy: U.rand(-260, -140), life: 1.1,
              size: U.rand(13, 5), color: { r: 255, g: 150, b: 60 }, type: 'ember',
            });
          }
        }
      }
    }
  }

  /* ================= 浮游生物（常驻环境粒子） ================= */
  function buildPlankton() {
    world.plankton = [];
    const n = [110, 210, 320][G.quality];
    for (let i = 0; i < n; i++) {
      world.plankton.push({
        x: U.rand(WORLD_W), y: U.rand(WORLD_H),
        z: U.rand(3.6, 1.2), ph: U.rand(U.TAU),
        vx: U.rand(11, -11), vy: U.rand(7, -15),
      });
    }
  }

  function updatePlankton(dt) {
    const ps = world.plankton;
    if (!ps) return;
    for (let i = 0; i < ps.length; i++) {
      const pl = ps[i];
      pl.x += (pl.vx + Math.sin(world.time * 0.55 + pl.ph) * 7) * dt;
      pl.y += pl.vy * dt;
      if (pl.y < -24) { pl.y = WORLD_H + 24; pl.x = U.rand(WORLD_W); }
      if (pl.x < -24) pl.x = WORLD_W + 24;
      else if (pl.x > WORLD_W + 24) pl.x = -24;
    }
    // 偶发上浮气泡
    if (Math.random() < dt * 5) {
      addParticle({
        x: U.rand(WORLD_W), y: WORLD_H * U.rand(1.05, 0.75),
        vx: U.rand(9, -9), vy: U.rand(-34, -72),
        life: U.rand(4.5, 2.5), size: U.rand(6, 2),
        color: { r: 210, g: 240, b: 255 }, type: 'bubble',
      });
    }
  }

  function drawPlankton() {
    const ps = world.plankton;
    if (!ps) return;
    for (let i = 0; i < ps.length; i++) {
      const pl = ps[i];
      const a = 0.16 + 0.26 * (0.5 + 0.5 * Math.sin(world.time * 1.7 + pl.ph));
      ctx.fillStyle = 'rgba(205,238,255,' + a + ')';
      ctx.fillRect(pl.x, pl.y, pl.z, pl.z);
    }
  }

  /* ================= 前景摇曳水草 ================= */
  function buildKelp() {
    world.kelp = [];
    const sc = S[world.sceneIdx];
    const n = G.quality === 0 ? 6 : 10;
    for (let i = 0; i < n; i++) {
      world.kelp.push({
        x: U.rand(WORLD_W * 0.96, WORLD_W * 0.04),
        y: WORLD_H - U.rand(30, 90),
        h: U.rand(320, 150),
        w: U.rand(26, 12),
        phase: U.rand(U.TAU),
        color: U.mix(U.hex(sc.pal.silhouette2), U.hex(sc.pal.accent), 0.18 + Math.random() * 0.25),
      });
    }
  }

  function drawKelp() {
    const ks = world.kelp;
    if (!ks) return;
    for (let i = 0; i < ks.length; i++) {
      const k = ks[i];
      const sway = Math.sin(world.time * 0.8 + k.phase) * k.h * 0.22;
      const sway2 = Math.sin(world.time * 0.62 + k.phase * 1.7) * k.h * 0.12;
      const topX = k.x + sway, topY = k.y - k.h;
      ctx.fillStyle = U.rgb(U.shade(k.color, 0.62), 0.88);
      ctx.beginPath();
      ctx.moveTo(k.x - k.w * 0.5, k.y);
      ctx.quadraticCurveTo(k.x - k.w * 0.6 + sway2 * 0.4, k.y - k.h * 0.55, topX, topY);
      ctx.quadraticCurveTo(k.x + k.w * 0.6 + sway2 * 0.4, k.y - k.h * 0.55, k.x + k.w * 0.5, k.y);
      ctx.closePath();
      ctx.fill();
      // 叶尖光
      ctx.fillStyle = U.rgb(U.hex(S[world.sceneIdx].pal.glow), 0.12);
      ctx.beginPath();
      ctx.arc(topX, topY, k.w * 0.8, 0, U.TAU);
      ctx.fill();
    }
  }

  /* ================= 粒子 ================= */
  const MAX_PARTICLES = () => [110, 220, 380][G.quality];
  function addParticle(pt) {
    if (world.particles.length >= MAX_PARTICLES()) return;
    pt.maxLife = pt.life;
    world.particles.push(pt);
  }
  function burst(x, y, n, color, power) {
    for (let i = 0; i < n; i++) {
      const a = U.rand(Math.PI, -Math.PI);
      const s = U.rand(160, 30) * (power || 1);
      addParticle({
        x: x, y: y, vx: Math.cos(a) * s, vy: Math.sin(a) * s,
        life: U.rand(0.7, 0.3), size: U.rand(9, 3), color: color, type: 'spark',
      });
    }
  }
  function addText(x, y, str, color) {
    world.texts.push({ x: x, y: y, str: str, color: color, life: 1.25, maxLife: 1.25 });
    if (world.texts.length > 24) world.texts.shift();
  }

  function updateParticles(dt) {
    const ps = world.particles;
    for (let i = ps.length - 1; i >= 0; i--) {
      const p = ps[i];
      p.life -= dt;
      if (p.life <= 0) { ps.splice(i, 1); continue; }
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      if (p.type === 'bubble') { p.vy -= 42 * dt; p.vx *= 0.985; }
      else if (p.type === 'ember') { p.vy -= 60 * dt; }
      else if (p.type === 'poison') { p.vy -= 8 * dt; p.vx *= 0.97; p.vy *= 0.97; }
      else { p.vx *= 0.94; p.vy *= 0.94; }
    }
    for (let i = world.texts.length - 1; i >= 0; i--) {
      const t = world.texts[i];
      t.life -= dt;
      t.y -= dt * 46;
      if (t.life <= 0) world.texts.splice(i, 1);
    }
  }

  /* ================= Boss ================= */
  function spawnBoss() {
    world.boss = {
      x: WORLD_W * 0.5, y: -260, vx: 0, vy: 60, angle: Math.PI / 2,
      size: 300, hp: 2600, maxHp: 2600, mouth: 0, mouthT: 0, hitFlash: 0,
    };
    A.sfx('boss');
    DT.ui.banner('🐋 深渊巨口鲸 · BOSS', '咬住发光弱点！双人同时咬住伤害翻倍');
  }

  function updateBoss(dt) {
    const b = world.boss;
    if (!b) return;
    const players = G.players.filter((p) => p.alive && !p.ghost);
    if (!players.length) return;

    // 追逐最近玩家
    let near = players[0], nd = Infinity;
    players.forEach((p) => {
      const d = U.dist(b.x, b.y, p.x, p.y);
      if (d < nd) { nd = d; near = p; }
    });
    const ta = Math.atan2(near.y - b.y, near.x - b.x);
    b.angle = U.angleLerp(b.angle, ta, Math.min(1, 0.7 * dt));
    b.vx = U.approach(b.vx, Math.cos(b.angle) * 118, 1.1, dt);
    b.vy = U.approach(b.vy, Math.sin(b.angle) * 118, 1.1, dt);
    b.x += b.vx * dt;
    b.y += b.vy * dt;
    b.x = U.clamp(b.x, 300, WORLD_W - 300);
    b.y = U.clamp(b.y, 300, WORLD_H - 300);
    b.hitFlash = Math.max(0, b.hitFlash - dt * 3);

    // 嘴部开合
    b.mouthT += dt;
    b.mouth = Math.max(0, Math.sin(b.mouthT * 0.9) * 0.5 + 0.5);

    // 弱点判定
    const weak = bossWeakPoints(b);
    let hitting = 0;
    players.forEach((p, i) => {
      const w = weak[i % 2];
      const d = U.dist(p.x, p.y, w.x, w.y);
      if (d < 95 + p.size * 0.3) {
        hitting++;
        b.hp -= 118 * dt * (players.length === 2 ? 1.5 : 1);
        b.hitFlash = 1;
        if (Math.random() < dt * 12) burst(w.x, w.y, 2, { r: 120, g: 240, b: 255 }, 1.2);
      }
      // Boss 咬人
      const dBody = U.dist(p.x, p.y, b.x, b.y);
      if (dBody < b.size * 0.5 + p.size * 0.3 && b.mouth > 0.55 && p.invuln <= 0 && p.biteCd <= 0) {
        p.biteCd = 1.1;
        hurtPlayer(p, p.size * 0.16, Math.atan2(p.y - b.y, p.x - b.x));
        A.sfx('bigEat');
      }
    });
    if (players.length === 2 && hitting === 2) {
      b.hp -= 150 * dt;
      if (Math.random() < dt * 3) addText(b.x, b.y - 120, '双人合咬 ×2', '#7df9ff');
    }

    if (b.hp <= 0) {
      world.boss = null;
      burst(b.x, b.y, 40, { r: 120, g: 230, b: 255 }, 4);
      world.cam.shake = 26;
      addText(b.x, b.y, '巨口鲸被击败！', '#ffd23f');
      A.sfx('win');
      setTimeout(() => completeLevel(), 1400);
    }
  }

  function bossWeakPoints(b) {
    return [
      { x: b.x + Math.cos(b.angle - 0.85) * b.size * 0.42, y: b.y + Math.sin(b.angle - 0.85) * b.size * 0.42 },
      { x: b.x + Math.cos(b.angle + 0.85) * b.size * 0.42, y: b.y + Math.sin(b.angle + 0.85) * b.size * 0.42 },
    ];
  }

  /* ================= 关卡 / 目标 ================= */
  function updateObjective(dt) {
    if (G.mode === 'endless') {
      G.diff = 1 + world.time / 95;
      // 场景轮换
      const wantScene = Math.floor(world.time / 150) % 6;
      if (wantScene !== world.sceneIdx && world.transition <= 0) {
        loadScene(wantScene);
        DT.ui.banner('🌊 场景切换 · ' + S[wantScene].name, '难度持续上升中');
      }
      return;
    }

    const L = LEVELS[levelIdx];
    if (!L) return;
    world.levelTime += dt;

    if (G.mode === 'versus') {
      // 鱼吃光 → 终局撕咬（含超时保护）
      const remaining = world.fish.filter((f) => f.alive).length;
      const forced = world.levelTime > 165;
      if (!world.duel && (remaining <= 4 || forced) && world.transition <= 0 && (world.spawnedAll || forced)) {
        startDuel();
      }
      return;
    }

    if (L.type === 'eat' && world.eaten >= L.target) completeLevel();
    else if (L.type === 'survive' && world.levelTime >= L.time) completeLevel();
    else if (L.type === 'clear') {
      const remaining = world.fish.filter((f) => f.alive).length;
      if (remaining <= 3) {
        world.wave++;
        if (world.wave >= L.waves) completeLevel();
        else {
          for (let i = 0; i < 16 + world.wave * 5; i++) spawnFish(Math.random() < 0.3, true);
          DT.ui.banner('🌊 第 ' + (world.wave + 1) + ' 波来袭', '鱼群正在聚集');
          A.sfx('boss');
        }
      }
    }
  }

  function completeLevel() {
    if (G.state !== 'playing') return;
    if (levelIdx >= LEVELS.length - 1) {
      endGame(true);
      return;
    }
    A.sfx('win');
    levelIdx++;
    const L = LEVELS[levelIdx];
    G.state = 'cardpick';
    // 关卡间奖励卡
    const cards = K.roll(3);
    DT.ui.showCards(cards, '🎉 关卡完成 · 选择补给进化', function (card) {
      G.players.forEach((p) => { if (p.alive) K.applyTo(p, card); });
      G.state = 'playing';
      loadScene(L.scene);
      world.levelTime = 0;
      if (L.type === 'boss') spawnBoss();
      DT.ui.banner(L.name, L.tip);
    }, G.players[0]);
  }

  /* ================= 竞争 / 对决 ================= */
  function startDuel() {
    world.duel = {
      x: WORLD_W / 2, y: WORLD_H / 2,
      radius: 900, minRadius: 320, t: 0,
    };
    world.spawnedAll = true;
    A.sfx('duel');
    DT.ui.banner('⚔️ 终局撕咬', '场上无鱼 —— 两人决斗开始！撕咬对方，胜者通吃');
  }

  function updateDuel(dt) {
    const d = world.duel;
    if (!d) return;
    d.t += dt;
    d.radius = Math.max(d.minRadius, 900 - d.t * 11);
    // 圈外扣血
    G.players.forEach((p) => {
      if (!p.alive || p.ghost) return;
      const dist = Math.hypot(p.x - d.x, p.y - d.y);
      if (dist > d.radius) {
        const push = (dist - d.radius) * 1.6;
        p.x -= ((p.x - d.x) / dist) * push * dt * 2;
        p.y -= ((p.y - d.y) / dist) * push * dt * 2;
        if (p.invuln <= 0 && p.biteCd <= 0) {
          p.biteCd = 0.7;
          hurtPlayer(p, p.size * 0.06, Math.atan2(d.y - p.y, d.x - p.x));
        }
      }
    });
  }

  function endRound(winnerId) {
    vsScore[winnerId]++;
    const w = G.players[winnerId], l = G.players[1 - winnerId];
    const steal = l.ep * 0.5;
    l.ep -= steal;
    w.ep += steal;
    A.sfx('win');
    DT.ui.banner('🏆 ' + w.name + ' 赢下本回合撕咬', '比分 ' + vsScore[0] + ' : ' + vsScore[1]);
    world.duel = null;
    if (levelIdx >= 4) {
      endGame(true);
    } else {
      levelIdx++;
      setTimeout(() => {
        if (G.state !== 'playing') return;
        G.players.forEach((p) => { p.size = 26; p.alive = true; p.ghost = false; p.invuln = 2.5; });
        loadScene(LEVELS[levelIdx].scene);
        if (LEVELS[levelIdx].type === 'boss') spawnBoss();
        DT.ui.banner(LEVELS[levelIdx].name, LEVELS[levelIdx].tip);
      }, 1800);
    }
  }

  /* ================= 结束 ================= */
  function endGame(win) {
    if (G.state === 'results') return;
    G.state = 'results';
    A.sfx(win ? 'win' : 'die');
    const data = {
      win: win,
      mode: G.mode,
      players: G.players.map((p) => ({
        name: p.name, ep: Math.round(p.totalEp), level: p.level, eaten: p.eaten,
        maxLen: Math.round(p.maxLen), cards: p.cards,
      })),
      vsScore: vsScore.slice(),
      time: Math.round(world.time),
      level: levelIdx + 1,
    };
    // 无尽纪录
    if (G.mode === 'endless') {
      const rec = Math.round(world.time);
      if (rec > (G.records.endless || 0)) {
        G.records.endless = rec;
        saveRecords();
        data.newRecord = true;
      }
    }
    DT.ui.results(data);
    DT.ui.screen('results');
  }

  function loadRecords() {
    try { return JSON.parse(localStorage.getItem('dt_records') || '{}'); } catch (e) { return {}; }
  }
  function saveRecords() {
    try { localStorage.setItem('dt_records', JSON.stringify(G.records)); } catch (e) {}
  }

  /* ================= 输入 ================= */
  const keys = {};
  const KEYMAP = {
    0: { up: 'KeyW', down: 'KeyS', left: 'KeyA', right: 'KeyD', dash: 'Space', act: 'KeyF' },
    1: { up: 'ArrowUp', down: 'ArrowDown', left: 'ArrowLeft', right: 'ArrowRight', dash: 'Enter', act: 'ShiftRight' },
  };
  const dashPressed = [false, false];

  function readInput(id) {
    const km = KEYMAP[id];
    let x = (keys[km.right] ? 1 : 0) - (keys[km.left] ? 1 : 0);
    let y = (keys[km.down] ? 1 : 0) - (keys[km.up] ? 1 : 0);
    // 手柄
    const gps = navigator.getGamepads ? navigator.getGamepads() : [];
    const gp = gps[id];
    if (gp) {
      const ax = Math.abs(gp.axes[0]) > 0.22 ? gp.axes[0] : 0;
      const ay = Math.abs(gp.axes[1]) > 0.22 ? gp.axes[1] : 0;
      if (ax || ay) { x = ax; y = ay; }
    }
    const dashDown = keys[km.dash] || (gp && gp.buttons[0] && gp.buttons[0].pressed);
    const dash = dashDown && !dashPressed[id];
    dashPressed[id] = !!dashDown;
    return { x: x, y: y, dash: dash, act: keys[km.act] || (gp && gp.buttons[1] && gp.buttons[1].pressed) };
  }

  function bindInput() {
    window.addEventListener('keydown', (e) => {
      if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Enter'].includes(e.code)) e.preventDefault();
      keys[e.code] = true;
      if (e.code === 'Escape') {
        if (G.state === 'playing') G.togglePause();
        else if (G.paused) G.togglePause();
      }
      if (e.code === 'KeyM') A.toggleMute();
      // 合作复活
      if (G.mode === 'coop' && G.state === 'playing') {
        G.players.forEach((p) => {
          if (!p.ghost) return;
          const mate = G.players[1 - p.id];
          const km = KEYMAP[p.id === 0 ? 1 : 0];
          if (keys[km.act] && mate && mate.alive && U.dist(mate.x, mate.y, p.x, p.y) < 170 && mate.size > 30) {
            p.ghost = false;
            p.size = 22;
            p.invuln = 2.5;
            mate.size *= 0.75;
            A.sfx('revive');
            addText(p.x, p.y - 50, '复活!', '#7dffb0');
          }
        });
      }
    });
    window.addEventListener('keyup', (e) => { keys[e.code] = false; });
    window.addEventListener('blur', () => {
      for (const k in keys) keys[k] = false;
    });
  }

  G.togglePause = function () {
    if (G.state === 'results' || G.state === 'cardpick') return;
    G.paused = !G.paused;
    DT.ui.screen(G.paused ? 'pause' : 'none');
    if (!G.paused) lastT = performance.now();
  };

  /* ================= 主循环 ================= */
  function loop(ts) {
    const dt = Math.min(0.042, Math.max(0.0005, (ts - lastT) / 1000));
    lastT = ts;
    fpsAcc += dt; fpsN++;
    if (fpsAcc > 0.5) { fps = fpsN / fpsAcc; fpsAcc = 0; fpsN = 0; }

    if (G.state === 'playing' && !G.paused) {
      if (world.hitStop > 0) world.hitStop -= dt;
      else {
        world.time += dt;
        world.transition = Math.max(0, world.transition - dt * 1.6);
        G.players.forEach((p) => updatePlayer(p, dt));
        updateFish(dt);
        collisions(dt);
        updateHazards(dt);
        updateBoss(dt);
        updateDuel(dt);
        updateObjective(dt);
      }
      updateParticles(dt);
      updatePlankton(dt);
    } else if (G.state === 'menu' || G.state === 'results' || G.state === 'cardpick' || G.paused) {
      // 菜单/卡牌时鱼群继续游动，保持画面生命力
      world.time += dt * 0.6;
      if (G.state === 'menu') updateFish(dt * 0.6);
      updateParticles(dt);
      updatePlankton(dt);
    }

    updateCamera(dt);
    render();
    DT.ui.tick(fps);
    requestAnimationFrame(loop);
  }

  function updateCamera(dt) {
    const cam = world.cam;
    const ps = G.players.filter((p) => p.alive || p.ghost);
    let cx, cy, zoom;
    if (!ps.length || G.state === 'menu') {
      cx = WORLD_W / 2 + Math.sin(world.time * 0.12) * 420;
      cy = WORLD_H / 2 + Math.cos(world.time * 0.09) * 240;
      zoom = Math.min(1.0, Math.max(0.55, W / 1600));
    } else {
      let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
      ps.forEach((p) => {
        minX = Math.min(minX, p.x); maxX = Math.max(maxX, p.x);
        minY = Math.min(minY, p.y); maxY = Math.max(maxY, p.y);
      });
      cx = (minX + maxX) / 2;
      cy = (minY + maxY) / 2;
      const spanX = (maxX - minX) + 560, spanY = (maxY - minY) + 420;
      zoom = U.clamp(Math.min(W / spanX, H / spanY), 0.42, 1.12);
    }
    cam.x = U.approach(cam.x, cx, 3.4, dt);
    cam.y = U.approach(cam.y, cy, 3.4, dt);
    cam.zoom = U.approach(cam.zoom, zoom, 2.6, dt);
    cam.shake = Math.max(0, cam.shake - dt * 34);
    // 不越界
    const hw = W / (2 * cam.zoom), hh = H / (2 * cam.zoom);
    cam.x = U.clamp(cam.x, Math.min(hw, WORLD_W / 2), Math.max(WORLD_W - hw, WORLD_W / 2));
    cam.y = U.clamp(cam.y, Math.min(hh, WORLD_H / 2), Math.max(WORLD_H - hh, WORLD_H / 2));
  }

  /* ================= 渲染 ================= */
  function render() {
    const cam = world.cam;
    const shake = G.shakeOn ? cam.shake : 0;
    const sx = U.rand(shake, -shake), sy = U.rand(shake, -shake);

    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    ctx.fillStyle = '#04101d';
    ctx.fillRect(0, 0, W, H);

    ctx.save();
    ctx.translate(W / 2 + sx, H / 2 + sy);
    ctx.scale(cam.zoom, cam.zoom);
    ctx.translate(-cam.x, -cam.y);

    drawBackground();
    drawPlankton();
    drawHazards();
    drawFishLayer();
    drawPlayers();
    drawBoss();
    drawKelp();
    drawParticles();
    ctx.restore();

    drawScreenEffects();
  }

  function drawBackground() {
    const bg = world.bg;
    if (!bg) return;
    const cam = world.cam;
    for (let i = 0; i < bg.layers.length; i++) {
      const L = bg.layers[i];
      const offX = cam.x * (1 - L.f);
      const offY = cam.y * (1 - L.f) * 0.55;
      if (L.light) {
        // 预渲染柔光柱：缓慢摆动 + 叠加发光
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = 0.75 + Math.sin(world.time * 0.35) * 0.18;
        ctx.drawImage(L.cv, -bg.mx - offX + Math.sin(world.time * 0.16) * 46, -bg.my - offY);
        ctx.restore();
      } else {
        ctx.drawImage(L.cv, -bg.mx - offX, -bg.my - offY);
      }
    }
  }

  function drawFishLayer() {
    for (let i = 0; i < world.fish.length; i++) {
      const f = world.fish[i];
      if (!f.alive) continue;
      F.blit(ctx, f.style, f.x, f.y, f.angle, f.len, f.animT);
      if (f.predator && f.len > 120) {
        // 巨物威胁红光
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        const g = ctx.createRadialGradient(f.x, f.y, f.len * 0.2, f.x, f.y, f.len * 0.9);
        g.addColorStop(0, 'rgba(255,80,80,0.12)');
        g.addColorStop(1, 'rgba(255,80,80,0)');
        ctx.fillStyle = g;
        ctx.fillRect(f.x - f.len, f.y - f.len, f.len * 2, f.len * 2);
        ctx.restore();
      }
    }
  }

  function drawPlayers() {
    G.players.forEach((p) => {
      if (!p.alive && !p.ghost) return;
      // 分身
      if (p.mods && p.mods.decoy && p.dashT > 0) {
        F.blit(ctx, p.style, p.x - p.vx * 0.16, p.y - p.vy * 0.16, p.angle, p.size * 0.92, world.time * 6, 0.35);
      }
      const flicker = p.invuln > 0 && Math.floor(world.time * 14) % 2 === 0;
      F.blit(ctx, p.style, p.x, p.y, p.angle, p.size, world.time * (2.2 + Math.hypot(p.vx, p.vy) * 0.012), p.ghost ? 0.28 : flicker ? 0.55 : 1);

      if (p.ghost) {
        ctx.save();
        ctx.fillStyle = 'rgba(255,255,255,0.85)';
        ctx.font = 'bold 22px system-ui';
        ctx.textAlign = 'center';
        ctx.fillText('💀 等待复活', p.x, p.y - p.size * 0.8);
        ctx.restore();
      }

      // 体型环 + 名牌
      if (p.alive) {
        ctx.save();
        ctx.translate(p.x, p.y);
        const r = p.size * 0.62;
        ctx.beginPath();
        ctx.arc(0, 0, r, -Math.PI / 2, -Math.PI / 2 + U.TAU * (p.stamina / 100));
        ctx.strokeStyle = p.id === 0 ? 'rgba(120,210,255,0.5)' : 'rgba(255,160,220,0.5)';
        ctx.lineWidth = 3.2;
        ctx.stroke();
        ctx.restore();

        ctx.save();
        ctx.font = 'bold 15px system-ui';
        ctx.textAlign = 'center';
        const label = p.name + ' · Lv.' + p.level;
        ctx.fillStyle = 'rgba(8,18,34,0.55)';
        const tw = ctx.measureText(label).width;
        ctx.beginPath();
        ctx.roundRect ? ctx.roundRect(p.x - tw / 2 - 8, p.y - p.size * 0.78 - 18, tw + 16, 24, 12) : ctx.rect(p.x - tw / 2 - 8, p.y - p.size * 0.78 - 18, tw + 16, 24);
        ctx.fill();
        ctx.fillStyle = p.id === 0 ? '#bfeaff' : '#ffd2f0';
        ctx.fillText(label, p.x, p.y - p.size * 0.78);
        ctx.restore();
      }

      // 捕食者预警
      if (p.mods && p.mods.radar && p.alive) {
        for (let i = 0; i < world.fish.length; i++) {
          const f = world.fish[i];
          if (!f.alive || f.len < p.size * 1.15) continue;
          const d = U.dist(p.x, p.y, f.x, f.y);
          if (d > 620) continue;
          const a = Math.atan2(f.y - p.y, f.x - p.x);
          const ax = p.x + Math.cos(a) * (p.size * 1.1 + 26);
          const ay = p.y + Math.sin(a) * (p.size * 1.1 + 26);
          ctx.save();
          ctx.translate(ax, ay);
          ctx.rotate(a);
          ctx.fillStyle = 'rgba(255,90,90,0.75)';
          ctx.beginPath();
          ctx.moveTo(12, 0); ctx.lineTo(-8, -8); ctx.lineTo(-8, 8);
          ctx.closePath();
          ctx.fill();
          ctx.restore();
        }
      }
    });
  }

  function drawBoss() {
    const b = world.boss;
    if (!b) return;
    ctx.save();
    ctx.translate(b.x, b.y);
    ctx.rotate(b.angle);
    const s = b.size;
    // 身体
    const g = ctx.createLinearGradient(0, -s * 0.5, 0, s * 0.5);
    g.addColorStop(0, b.hitFlash > 0.2 ? '#9be8ff' : '#2b4a72');
    g.addColorStop(1, b.hitFlash > 0.2 ? '#4de3ff' : '#101d34');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(s * 0.62, 0);
    ctx.bezierCurveTo(s * 0.42, -s * 0.52, -s * 0.3, -s * 0.58, -s * 0.58, -s * 0.2);
    ctx.lineTo(-s * 0.58, s * 0.2);
    ctx.bezierCurveTo(-s * 0.3, s * 0.58, s * 0.42, s * 0.52, s * 0.62, 0);
    ctx.closePath();
    ctx.fill();
    // 巨口
    ctx.fillStyle = '#060b16';
    ctx.beginPath();
    ctx.moveTo(s * 0.62, 0);
    ctx.quadraticCurveTo(s * 0.2, -s * (0.1 + 0.36 * b.mouth), -s * 0.18, -s * 0.06);
    ctx.lineTo(-s * 0.18, s * 0.06);
    ctx.quadraticCurveTo(s * 0.2, s * (0.1 + 0.36 * b.mouth), s * 0.62, 0);
    ctx.closePath();
    ctx.fill();
    // 牙
    ctx.fillStyle = 'rgba(230,240,255,0.9)';
    for (let i = 0; i < 6; i++) {
      const t = i / 5;
      const tx = s * (0.5 - t * 0.55);
      const ty = s * (0.06 + 0.22 * b.mouth) * (1 - t * 0.5);
      ctx.beginPath();
      ctx.moveTo(tx - s * 0.035, -ty); ctx.lineTo(tx + s * 0.035, -ty); ctx.lineTo(tx, -ty + s * 0.07);
      ctx.closePath(); ctx.fill();
      ctx.beginPath();
      ctx.moveTo(tx - s * 0.035, ty); ctx.lineTo(tx + s * 0.035, ty); ctx.lineTo(tx, ty - s * 0.07);
      ctx.closePath(); ctx.fill();
    }
    // 尾鳍
    ctx.fillStyle = 'rgba(40,70,110,0.9)';
    ctx.beginPath();
    ctx.moveTo(-s * 0.55, 0);
    ctx.quadraticCurveTo(-s * 0.85, -s * 0.5, -s * 1.05, -s * 0.42);
    ctx.quadraticCurveTo(-s * 0.88, -s * 0.05, -s * 1.05, s * 0.42);
    ctx.quadraticCurveTo(-s * 0.85, s * 0.5, -s * 0.55, 0);
    ctx.closePath();
    ctx.fill();
    // 眼
    ctx.fillStyle = '#ff6b6b';
    ctx.beginPath();
    ctx.arc(s * 0.3, -s * 0.22, s * 0.055, 0, U.TAU);
    ctx.fill();
    ctx.restore();

    // 弱点
    const weak = bossWeakPoints(b);
    weak.forEach((w, i) => {
      const pulse = 1 + Math.sin(world.time * 5 + i) * 0.16;
      const rg = ctx.createRadialGradient(w.x, w.y, 0, w.x, w.y, 110 * pulse);
      rg.addColorStop(0, 'rgba(120,240,255,0.85)');
      rg.addColorStop(0.35, 'rgba(80,200,255,0.32)');
      rg.addColorStop(1, 'rgba(80,200,255,0)');
      ctx.fillStyle = rg;
      ctx.fillRect(w.x - 120, w.y - 120, 240, 240);
      ctx.beginPath();
      ctx.arc(w.x, w.y, 34 * pulse, 0, U.TAU);
      ctx.strokeStyle = 'rgba(180,245,255,0.9)';
      ctx.lineWidth = 4;
      ctx.stroke();
    });
  }

  function drawHazards() {
    for (let i = 0; i < world.hazards.length; i++) {
      const hz = world.hazards[i];
      if (hz.type === 'jelly') {
        const pulse = 1 + Math.sin(hz.t * 2.2) * 0.12;
        const rg = ctx.createRadialGradient(hz.x, hz.y, 0, hz.x, hz.y, hz.r * 1.7 * pulse);
        rg.addColorStop(0, 'rgba(120,240,255,0.5)');
        rg.addColorStop(1, 'rgba(120,240,255,0)');
        ctx.fillStyle = rg;
        ctx.fillRect(hz.x - hz.r * 2, hz.y - hz.r * 2, hz.r * 4, hz.r * 4);
        ctx.fillStyle = 'rgba(150,235,255,0.62)';
        ctx.beginPath();
        ctx.arc(hz.x, hz.y, hz.r * 0.62 * pulse, Math.PI, U.TAU);
        ctx.fill();
        ctx.strokeStyle = 'rgba(160,240,255,0.4)';
        ctx.lineWidth = 3;
        for (let t = 0; t < 5; t++) {
          const tx = hz.x + (t - 2) * hz.r * 0.24;
          ctx.beginPath();
          ctx.moveTo(tx, hz.y);
          ctx.quadraticCurveTo(tx + Math.sin(hz.t * 3 + t) * 22, hz.y + hz.r * 0.7, tx + Math.sin(hz.t * 2 + t) * 12, hz.y + hz.r * 1.25);
          ctx.stroke();
        }
      } else if (hz.type === 'current') {
        ctx.save();
        ctx.globalAlpha = 0.16;
        ctx.strokeStyle = '#bfeaff';
        ctx.lineWidth = 4;
        const a = Math.atan2(hz.dy, hz.dx);
        for (let r = 0; r < 4; r++) {
          const off = ((world.time * 90 + r * 130) % 520) - 260;
          ctx.beginPath();
          ctx.moveTo(hz.x + Math.cos(a) * off - Math.sin(a) * 80, hz.y + Math.sin(a) * off + Math.cos(a) * 80);
          ctx.lineTo(hz.x + Math.cos(a) * (off + 110) - Math.sin(a) * 80, hz.y + Math.sin(a) * (off + 110) + Math.cos(a) * 80);
          ctx.stroke();
        }
        ctx.restore();
      } else if (hz.type === 'iceberg') {
        const g = ctx.createLinearGradient(hz.x, hz.y - hz.r, hz.x, hz.y + hz.r);
        g.addColorStop(0, 'rgba(240,250,255,0.92)');
        g.addColorStop(1, 'rgba(160,205,235,0.75)');
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.moveTo(hz.x - hz.r, hz.y + hz.r * 0.4);
        ctx.lineTo(hz.x - hz.r * 0.5, hz.y - hz.r * 0.8);
        ctx.lineTo(hz.x + hz.r * 0.15, hz.y - hz.r * 0.3);
        ctx.lineTo(hz.x + hz.r * 0.6, hz.y - hz.r * 0.9);
        ctx.lineTo(hz.x + hz.r, hz.y + hz.r * 0.4);
        ctx.closePath();
        ctx.fill();
      } else if (hz.type === 'vent') {
        const warn = hz.phase >= 1;
        const g = ctx.createRadialGradient(hz.x, hz.y, 0, hz.x, hz.y, hz.r);
        g.addColorStop(0, hz.phase === 2 ? 'rgba(255,120,50,0.55)' : warn ? 'rgba(255,140,60,0.3)' : 'rgba(255,120,50,0.12)');
        g.addColorStop(1, 'rgba(255,120,50,0)');
        ctx.fillStyle = g;
        ctx.fillRect(hz.x - hz.r, hz.y - hz.r, hz.r * 2, hz.r * 2);
        ctx.strokeStyle = warn ? 'rgba(255,170,90,0.85)' : 'rgba(255,120,60,0.3)';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(hz.x, hz.y, hz.r * (warn ? 0.92 + Math.sin(world.time * 12) * 0.06 : 0.8), 0, U.TAU);
        ctx.stroke();
      }
    }
    // 对决圈
    const d = world.duel;
    if (d) {
      ctx.save();
      ctx.strokeStyle = 'rgba(255,90,110,0.9)';
      ctx.lineWidth = 6;
      ctx.setLineDash([26, 18]);
      ctx.lineDashOffset = -world.time * 60;
      ctx.beginPath();
      ctx.arc(d.x, d.y, d.radius, 0, U.TAU);
      ctx.stroke();
      ctx.setLineDash([]);
      const g = ctx.createRadialGradient(d.x, d.y, d.radius * 0.8, d.x, d.y, d.radius * 1.25);
      g.addColorStop(0, 'rgba(255,60,80,0)');
      g.addColorStop(1, 'rgba(255,60,80,0.24)');
      ctx.fillStyle = g;
      ctx.fillRect(d.x - d.radius * 1.3, d.y - d.radius * 1.3, d.radius * 2.6, d.radius * 2.6);
      ctx.restore();
    }
  }

  function drawParticles() {
    const ps = world.particles;
    for (let i = 0; i < ps.length; i++) {
      const p = ps[i];
      const a = Math.max(0, p.life / p.maxLife);
      if (p.type === 'bubble') {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, U.TAU);
        ctx.strokeStyle = U.rgb(p.color, 0.4 * a);
        ctx.lineWidth = 1.6;
        ctx.stroke();
      } else {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * (p.type === 'poison' ? (2 - a) : a), 0, U.TAU);
        ctx.fillStyle = U.rgb(p.color, (p.type === 'poison' ? 0.16 : 0.75) * a);
        ctx.fill();
      }
    }
    // 浮动文字
    for (let i = 0; i < world.texts.length; i++) {
      const t = world.texts[i];
      const a = Math.min(1, t.life / (t.maxLife * 0.5));
      ctx.save();
      ctx.globalAlpha = a;
      ctx.font = 'bold 22px system-ui';
      ctx.textAlign = 'center';
      ctx.fillStyle = 'rgba(6,14,28,0.5)';
      ctx.fillText(t.str, t.x + 2, t.y + 2);
      ctx.fillStyle = t.color;
      ctx.fillText(t.str, t.x, t.y);
      ctx.restore();
    }
  }

  function drawScreenEffects() {
    const sc = S[world.sceneIdx];
    // 雾
    if (sc.fog > 0) {
      const g = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.18, W / 2, H / 2, Math.max(W, H) * 0.72);
      g.addColorStop(0, 'rgba(235,245,255,' + sc.fog * 0.28 + ')');
      g.addColorStop(1, 'rgba(225,238,250,' + sc.fog * 0.85 + ')');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, W, H);
    }
    // 黑暗视野（半分辨率遮罩，常驻复用）
    if (sc.dark > 0 && G.players.length) {
      const dw = Math.ceil(W / 2), dh = Math.ceil(H / 2);
      if (!darkCv || darkCv.width !== dw || darkCv.height !== dh) {
        darkCv = document.createElement('canvas');
        darkCv.width = dw; darkCv.height = dh;
        darkCtx = darkCv.getContext('2d');
      }
      darkCtx.globalCompositeOperation = 'source-over';
      darkCtx.fillStyle = 'rgba(2,5,14,' + sc.dark + ')';
      darkCtx.fillRect(0, 0, dw, dh);
      darkCtx.globalCompositeOperation = 'destination-out';
      G.players.forEach((p) => {
        if (!p.alive && !p.ghost) return;
        const sx2 = ((p.x - world.cam.x) * world.cam.zoom + W / 2) / 2;
        const sy2 = ((p.y - world.cam.y) * world.cam.zoom + H / 2) / 2;
        const r = ((260 + p.size * 2.6) * (p.mods && p.mods.vision ? p.mods.vision : 1) * world.cam.zoom) / 2;
        const g2 = darkCtx.createRadialGradient(sx2, sy2, r * 0.15, sx2, sy2, r);
        g2.addColorStop(0, 'rgba(0,0,0,1)');
        g2.addColorStop(1, 'rgba(0,0,0,0)');
        darkCtx.fillStyle = g2;
        darkCtx.fillRect(sx2 - r, sy2 - r, r * 2, r * 2);
      });
      ctx.drawImage(darkCv, 0, 0, W, H);
    }
    // 暗角
    const v = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.42, W / 2, H / 2, Math.max(W, H) * 0.78);
    v.addColorStop(0, 'rgba(0,0,0,0)');
    v.addColorStop(1, 'rgba(2,8,18,0.42)');
    ctx.fillStyle = v;
    ctx.fillRect(0, 0, W, H);

    // 场景转场
    if (world.transition > 0) {
      ctx.fillStyle = 'rgba(220,240,255,' + world.transition * 0.5 + ')';
      ctx.fillRect(0, 0, W, H);
    }
  }

  G.getFps = () => fps;
  G.getWorld = () => world;
  G.getLevelInfo = function () {
    if (G.mode === 'endless') {
      return { name: '🌊 无尽生存 · ' + S[world.sceneIdx].name, tip: '难度 ' + (G.diff || 1).toFixed(1) + 'x · 存活 ' + Math.floor(world.time) + 's', progress: 0 };
    }
    const L = LEVELS[levelIdx] || LEVELS[0];
    let progress = 0, label = '';
    if (G.mode === 'versus') {
      const remaining = world.fish.filter((f) => f.alive).length;
      return {
        name: '⚔️ ' + S[world.sceneIdx].name + ' · 终局撕咬在即',
        tip: '剩余鱼群 ' + remaining + ' 条　·　比分 ' + vsScore[0] + ' : ' + vsScore[1],
        progress: world.duel ? 1 : 1 - Math.min(1, remaining / 30),
        vsScore: vsScore,
      };
    }
    if (L.type === 'eat') {
      progress = Math.min(1, world.eaten / L.target);
      label = '吞食 ' + world.eaten + ' / ' + L.target;
    } else if (L.type === 'survive') {
      progress = Math.min(1, world.levelTime / L.time);
      label = '存活 ' + Math.floor(world.levelTime) + ' / ' + L.time + 's';
    } else if (L.type === 'clear') {
      progress = Math.min(1, world.wave / L.waves);
      label = '波次 ' + Math.min(world.wave + 1, L.waves) + ' / ' + L.waves;
    } else {
      const b = world.boss;
      progress = b ? 1 - b.hp / b.maxHp : 0;
      label = 'BOSS ' + Math.round(progress * 100) + '%';
    }
    return { name: L.name, tip: label, progress: progress, lives: lives, vsScore: vsScore };
  };
})();
