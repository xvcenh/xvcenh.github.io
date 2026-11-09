/* 吞噬之潮 · fish.js — 程序化鱼类渲染（贝塞尔+渐变+辉光），带精灵缓存 */
(function () {
  const DT = (window.DT = window.DT || {});
  const U = DT.util;
  const F = (DT.fish = {});

  // 六大基础鱼种
  F.species = [
    { name: '小丑鱼', hgt: 0.34, speed: 1.12, turn: 1.35, grow: 1.0, size: 24, colors: ['#ff9a4d', '#ffd23f'], fin: 1, tail: 1, eye: 1, pattern: 'bars', glow: 0 },
    { name: '河豚', hgt: 0.5, speed: 0.86, turn: 0.92, grow: 1.12, size: 28, colors: ['#f6d365', '#fda085'], fin: 2, tail: 2, eye: 2, pattern: 'dots', glow: 0 },
    { name: '旗鱼', hgt: 0.26, speed: 1.3, turn: 1.06, grow: 0.95, size: 26, colors: ['#4facfe', '#00f2fe'], fin: 3, tail: 3, eye: 1, pattern: 'none', glow: 0 },
    { name: '灯笼鱼', hgt: 0.38, speed: 1.0, turn: 1.0, grow: 1.0, size: 25, colors: ['#7f9cf5', '#a78bfa'], fin: 1, tail: 2, eye: 3, pattern: 'stars', glow: 1 },
    { name: '水母', hgt: 0.52, speed: 0.92, turn: 0.86, grow: 1.0, size: 27, colors: ['#c084fc', '#f0abfc'], fin: 4, tail: 4, eye: 4, pattern: 'none', glow: 1 },
    { name: '鲨鱼幼崽', hgt: 0.36, speed: 0.96, turn: 0.88, grow: 1.28, size: 30, colors: ['#64748b', '#334155'], fin: 5, tail: 5, eye: 2, pattern: 'none', glow: 0 },
  ];

  F.patterns = ['none', 'bars', 'dots', 'stars', 'stripes'];
  F.glows = ['无', '霓虹', '生物荧光'];
  F.accessories = ['无', '皇冠', '海盗帽', '墨镜', '尖角', '飘带', '伤疤'];
  F.fins = ['圆润', '三角', '镰刀', '飘纱', '伞盖', '巨帆'];
  F.tails = ['扇形', '新月', '燕尾', '飘带', '伞裙', '鲨尾'];
  F.eyes = ['灵动', '困倦', '凶狠', '发光', '呆萌'];

  // 生成一条鱼的外观配置
  F.makeStyle = function (spIdx, opt) {
    const sp = F.species[spIdx % F.species.length];
    const o = opt || {};
    return {
      sp: spIdx % F.species.length,
      name: o.name || sp.name,
      hgt: o.hgt !== undefined ? o.hgt : sp.hgt,
      c1: o.c1 || sp.colors[0],
      c2: o.c2 || sp.colors[1],
      fin: o.fin !== undefined ? o.fin : sp.fin,
      tail: o.tail !== undefined ? o.tail : sp.tail,
      eye: o.eye !== undefined ? o.eye : sp.eye,
      pattern: o.pattern || sp.pattern,
      glow: o.glow !== undefined ? o.glow : sp.glow,
      accessory: o.accessory || '无',
    };
  };

  F.styleKey = function (st) {
    return [st.sp, st.hgt.toFixed(2), st.c1, st.c2, st.fin, st.tail, st.eye, st.pattern, st.glow, st.accessory].join('_');
  };

  /* ---------- 绘制（面向 +x，体长 S） ---------- */
  F.draw = function (st, ctx, S, frame) {
    const h = S * st.hgt * 0.5;
    const c1 = U.hex(st.c1), c2 = U.hex(st.c2);
    const mid = U.mix(c1, c2, 0.5);
    const wag = frame === 0 ? -0.24 : frame === 1 ? 0 : frame === 2 ? 0.24 : 0;

    // 辉光
    if (st.glow) {
      const gc = st.glow === 2 ? c1 : { r: 255, g: 255, b: 255 };
      const g = ctx.createRadialGradient(0, 0, S * 0.04, 0, 0, S * 0.8);
      g.addColorStop(0, U.rgb(gc, 0.3));
      g.addColorStop(1, U.rgb(gc, 0));
      ctx.fillStyle = g;
      ctx.fillRect(-S, -S, S * 2, S * 2);
    }

    // 尾巴（在身体后方）
    ctx.save();
    ctx.translate(-S * 0.34, 0);
    ctx.rotate(wag * 0.7);
    const tg = ctx.createLinearGradient(0, 0, -S * 0.32, 0);
    tg.addColorStop(0, U.rgb(c2, 0.95));
    tg.addColorStop(1, U.rgb(c1, 0.45));
    ctx.fillStyle = tg;
    ctx.beginPath();
    if (st.tail === 3) { // 飘带
      ctx.moveTo(0, 0);
      ctx.quadraticCurveTo(-S * 0.18, -h * 0.4, -S * 0.34, -h * 1.25);
      ctx.quadraticCurveTo(-S * 0.2, -h * 0.1, -S * 0.34, h * 0.2);
      ctx.quadraticCurveTo(-S * 0.18, h * 0.5, -S * 0.32, h * 1.15);
    } else if (st.tail === 2) { // 新月
      ctx.moveTo(0, 0);
      ctx.quadraticCurveTo(-S * 0.16, -h * 1.05, -S * 0.3, -h * 1.3);
      ctx.quadraticCurveTo(-S * 0.24, -h * 0.2, -S * 0.26, 0);
      ctx.quadraticCurveTo(-S * 0.24, h * 0.2, -S * 0.3, h * 1.3);
      ctx.quadraticCurveTo(-S * 0.16, h * 1.05, 0, 0);
    } else if (st.tail === 5) { // 鲨尾：上叶长
      ctx.moveTo(0, 0);
      ctx.quadraticCurveTo(-S * 0.14, -h * 1.15, -S * 0.32, -h * 1.5);
      ctx.quadraticCurveTo(-S * 0.22, -h * 0.35, -S * 0.26, 0);
      ctx.quadraticCurveTo(-S * 0.2, h * 0.55, -S * 0.3, h * 0.85);
      ctx.quadraticCurveTo(-S * 0.12, h * 0.55, 0, 0);
    } else if (st.tail === 4) { // 伞裙
      ctx.moveTo(0, 0);
      ctx.quadraticCurveTo(-S * 0.22, -h * 0.75, -S * 0.3, -h * 0.6);
      ctx.quadraticCurveTo(-S * 0.36, 0, -S * 0.3, h * 0.6);
      ctx.quadraticCurveTo(-S * 0.22, h * 0.75, 0, 0);
    } else { // 扇形/燕尾
      ctx.moveTo(0, 0);
      ctx.quadraticCurveTo(-S * 0.15, -h * 0.95, -S * 0.29, -h * 1.1);
      ctx.quadraticCurveTo(-S * 0.21, -h * 0.12, -S * 0.27, 0);
      ctx.quadraticCurveTo(-S * 0.21, h * 0.12, -S * 0.29, h * 1.1);
      ctx.quadraticCurveTo(-S * 0.15, h * 0.95, 0, 0);
    }
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    // 背鳍（身后层）
    ctx.save();
    const finA = 0.35 + wag * 0.4;
    ctx.translate(-S * 0.02, -h * 0.78);
    ctx.rotate(finA * 0.25);
    const fg = ctx.createLinearGradient(0, 0, 0, -h);
    fg.addColorStop(0, U.rgb(c1, 0.9));
    fg.addColorStop(1, U.rgb(mid, 0.35));
    ctx.fillStyle = fg;
    ctx.beginPath();
    if (st.fin === 3) { // 镰刀
      ctx.moveTo(-S * 0.16, h * 0.2);
      ctx.quadraticCurveTo(-S * 0.1, -h * 1.5, S * 0.2, -h * 1.15);
      ctx.quadraticCurveTo(S * 0.02, -h * 0.35, S * 0.14, h * 0.1);
    } else if (st.fin === 4) { // 飘纱水母伞
      ctx.moveTo(-S * 0.2, h * 0.3);
      ctx.quadraticCurveTo(-S * 0.1, -h * 1.35, S * 0.22, -h * 0.85);
      ctx.quadraticCurveTo(S * 0.12, -h * 0.2, S * 0.18, h * 0.3);
    } else if (st.fin === 5) { // 巨帆
      ctx.moveTo(-S * 0.2, h * 0.25);
      ctx.lineTo(-S * 0.12, -h * 1.7);
      ctx.lineTo(S * 0.18, -h * 0.5);
      ctx.lineTo(S * 0.2, h * 0.25);
    } else { // 圆润/三角/伞盖
      ctx.moveTo(-S * 0.18, h * 0.2);
      ctx.quadraticCurveTo(-S * 0.1, -h * 1.25, S * 0.16, -h * 0.75);
      ctx.quadraticCurveTo(S * 0.12, -h * 0.2, S * 0.18, h * 0.2);
    }
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    // 身体
    const bg = ctx.createLinearGradient(0, -h * 1.25, 0, h * 1.25);
    bg.addColorStop(0, U.rgb(U.shade(c1, 1.08), 1));
    bg.addColorStop(0.52, U.rgb(mid, 1));
    bg.addColorStop(1, U.rgb(U.mix(c2, { r: 255, g: 255, b: 255 }, 0.22), 1));
    ctx.fillStyle = bg;
    ctx.beginPath();
    ctx.moveTo(S * 0.5, 0);
    ctx.bezierCurveTo(S * 0.34, -h * 1.02, -S * 0.06, -h * 1.12, -S * 0.35, -h * 0.6);
    ctx.lineTo(-S * 0.35, h * 0.6);
    ctx.bezierCurveTo(-S * 0.06, h * 1.12, S * 0.34, h * 1.02, S * 0.5, 0);
    ctx.closePath();
    ctx.fill();

    // 花纹 + 鳞光（裁剪到身体）
    ctx.save();
    ctx.clip();
    if (st.pattern !== 'none') {
      ctx.globalAlpha = 0.22;
      if (st.pattern === 'bars') {
        ctx.fillStyle = U.rgb(U.shade(c1, 0.55), 1);
        for (let i = -1; i <= 2; i++) {
          const x = i * S * 0.19 - S * 0.06;
          ctx.beginPath();
          ctx.moveTo(x - S * 0.045, -h * 1.2);
          ctx.quadraticCurveTo(x + S * 0.03, 0, x - S * 0.03, h * 1.2);
          ctx.lineTo(x + S * 0.075, h * 1.2);
          ctx.quadraticCurveTo(x + S * 0.115, 0, x + S * 0.065, -h * 1.2);
          ctx.closePath();
          ctx.fill();
        }
      } else if (st.pattern === 'dots') {
        ctx.fillStyle = U.rgb(U.shade(c2, 0.5), 1);
        for (let i = 0; i < 14; i++) {
          const x = ((i * 0.137) % 1) * S - S * 0.42;
          const y = ((i * 0.311) % 1) * h * 1.8 - h * 0.9;
          ctx.beginPath();
          ctx.arc(x, y, S * (0.018 + ((i * 7) % 3) * 0.007), 0, U.TAU);
          ctx.fill();
        }
      } else if (st.pattern === 'stars') {
        ctx.fillStyle = U.rgb({ r: 255, g: 255, b: 255 }, 1);
        for (let i = 0; i < 12; i++) {
          const x = ((i * 0.211) % 1) * S - S * 0.42;
          const y = ((i * 0.377) % 1) * h * 1.7 - h * 0.85;
          const r = S * 0.016;
          ctx.beginPath();
          ctx.moveTo(x, y - r * 2); ctx.lineTo(x + r * 0.6, y - r * 0.6);
          ctx.lineTo(x + r * 2, y); ctx.lineTo(x + r * 0.6, y + r * 0.6);
          ctx.lineTo(x, y + r * 2); ctx.lineTo(x - r * 0.6, y + r * 0.6);
          ctx.lineTo(x - r * 2, y); ctx.lineTo(x - r * 0.6, y - r * 0.6);
          ctx.closePath(); ctx.fill();
        }
      } else if (st.pattern === 'stripes') {
        ctx.fillStyle = U.rgb(U.shade(c2, 0.55), 1);
        for (let i = -1; i <= 3; i++) {
          const x = i * S * 0.16 - S * 0.12;
          ctx.fillRect(x, -h * 1.2, S * 0.075, h * 2.4);
        }
      }
      ctx.globalAlpha = 1;
    }
    // 斜向鳞光高光
    const sh = ctx.createLinearGradient(-S * 0.32, -h * 1.25, S * 0.18, h * 0.5);
    sh.addColorStop(0, 'rgba(255,255,255,0.24)');
    sh.addColorStop(0.45, 'rgba(255,255,255,0.07)');
    sh.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = sh;
    ctx.fillRect(-S * 0.6, -h * 1.35, S * 1.2, h * 2.7);
    // 背部缘光
    const rim = ctx.createLinearGradient(0, -h * 1.15, 0, -h * 0.1);
    rim.addColorStop(0, 'rgba(255,255,255,0.3)');
    rim.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = rim;
    ctx.fillRect(-S * 0.6, -h * 1.35, S * 1.2, h * 1.2);
    ctx.restore();

    // 腹部高光
    const belly = ctx.createLinearGradient(0, h * 0.1, 0, h * 1.1);
    belly.addColorStop(0, 'rgba(255,255,255,0)');
    belly.addColorStop(1, 'rgba(255,255,255,0.3)');
    ctx.fillStyle = belly;
    ctx.beginPath();
    ctx.moveTo(S * 0.42, h * 0.12);
    ctx.bezierCurveTo(S * 0.28, h * 1.0, -S * 0.1, h * 1.06, -S * 0.32, h * 0.5);
    ctx.lineTo(-S * 0.32, h * 0.95);
    ctx.bezierCurveTo(-S * 0.02, h * 1.18, S * 0.36, h * 1.06, S * 0.5, 0);
    ctx.closePath();
    ctx.fill();

    // 描边
    ctx.lineWidth = Math.max(1, S * 0.016);
    ctx.strokeStyle = U.rgb({ r: 12, g: 24, b: 44 }, 0.3);
    ctx.beginPath();
    ctx.moveTo(S * 0.5, 0);
    ctx.bezierCurveTo(S * 0.34, -h * 1.02, -S * 0.06, -h * 1.12, -S * 0.35, -h * 0.6);
    ctx.lineTo(-S * 0.35, h * 0.6);
    ctx.bezierCurveTo(-S * 0.06, h * 1.12, S * 0.34, h * 1.02, S * 0.5, 0);
    ctx.stroke();

    // 胸鳍
    ctx.save();
    ctx.translate(S * 0.1, h * 0.42);
    ctx.rotate(-0.5 + wag * 0.8);
    ctx.fillStyle = U.rgb(mid, 0.75);
    ctx.beginPath();
    ctx.ellipse(0, 0, S * 0.11, h * 0.34, 0, 0, U.TAU);
    ctx.fill();
    ctx.restore();

    // 嘴
    ctx.lineWidth = Math.max(1, S * 0.014);
    ctx.strokeStyle = U.rgb(U.shade(c1, 0.45), 0.75);
    ctx.beginPath();
    ctx.moveTo(S * 0.5, h * 0.02);
    ctx.quadraticCurveTo(S * 0.44, h * 0.18, S * 0.38, h * 0.16);
    ctx.stroke();

    // 眼睛
    const ex = S * 0.32, ey = -h * 0.2;
    const er = Math.max(1.6, S * 0.052);
    if (st.eye === 3) { // 发光
      const eg = ctx.createRadialGradient(ex, ey, 0, ex, ey, er * 3);
      eg.addColorStop(0, 'rgba(120,255,220,0.5)');
      eg.addColorStop(1, 'rgba(120,255,220,0)');
      ctx.fillStyle = eg;
      ctx.fillRect(ex - er * 3, ey - er * 3, er * 6, er * 6);
    }
    ctx.fillStyle = 'rgba(255,255,255,0.96)';
    ctx.beginPath();
    ctx.ellipse(ex, ey, er * (st.eye === 4 ? 1.25 : 1), er * (st.eye === 1 ? 0.72 : 1), 0, 0, U.TAU);
    ctx.fill();
    ctx.fillStyle = st.eye === 3 ? '#0d2b2b' : '#122036';
    ctx.beginPath();
    ctx.arc(ex + er * 0.22, ey, er * 0.5, 0, U.TAU);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    ctx.beginPath();
    ctx.arc(ex + er * 0.42, ey - er * 0.28, er * 0.18, 0, U.TAU);
    ctx.fill();
    if (st.eye === 2) { // 凶狠眉
      ctx.strokeStyle = 'rgba(10,18,32,0.8)';
      ctx.lineWidth = Math.max(1, S * 0.02);
      ctx.beginPath();
      ctx.moveTo(ex - er * 1.15, ey - er * 1.35);
      ctx.lineTo(ex + er * 1.05, ey - er * 0.55);
      ctx.stroke();
    }

    // 配饰
    drawAccessory(st, ctx, S, h);
  };

  function drawAccessory(st, ctx, S, h) {
    const a = st.accessory;
    if (!a || a === '无') return;
    if (a === '皇冠') {
      ctx.fillStyle = '#ffd45e';
      ctx.strokeStyle = 'rgba(120,80,0,0.55)';
      ctx.lineWidth = Math.max(1, S * 0.012);
      const bx = S * 0.16, by = -h * 1.02, w = S * 0.17, hh = S * 0.11;
      ctx.beginPath();
      ctx.moveTo(bx - w, by);
      ctx.lineTo(bx - w, by - hh * 0.5);
      ctx.lineTo(bx - w * 0.5, by - hh * 1.1);
      ctx.lineTo(bx, by - hh * 0.45);
      ctx.lineTo(bx + w * 0.5, by - hh * 1.1);
      ctx.lineTo(bx + w, by - hh * 0.5);
      ctx.lineTo(bx + w, by);
      ctx.closePath();
      ctx.fill(); ctx.stroke();
    } else if (a === '海盗帽') {
      ctx.fillStyle = '#22304d';
      const bx = S * 0.14, by = -h * 1.0;
      ctx.beginPath();
      ctx.ellipse(bx, by, S * 0.2, S * 0.045, 0, 0, U.TAU);
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(bx - S * 0.16, by);
      ctx.quadraticCurveTo(bx, by - S * 0.16, bx + S * 0.16, by);
      ctx.closePath();
      ctx.fill();
    } else if (a === '墨镜') {
      const ex = S * 0.32, ey = -h * 0.2, w = S * 0.1, hh = S * 0.062;
      ctx.fillStyle = 'rgba(14,22,40,0.9)';
      ctx.fillRect(ex - w * 1.15, ey - hh * 0.85, w * 2.2, hh * 0.55);
      ctx.beginPath();
      ctx.roundRect ? ctx.roundRect(ex - w * 1.1, ey - hh * 0.55, w * 0.95, hh * 1.15, hh * 0.4) : ctx.rect(ex - w * 1.1, ey - hh * 0.55, w * 0.95, hh * 1.15);
      ctx.roundRect ? ctx.roundRect(ex + w * 0.15, ey - hh * 0.55, w * 0.95, hh * 1.15, hh * 0.4) : ctx.rect(ex + w * 0.15, ey - hh * 0.55, w * 0.95, hh * 1.15);
      ctx.fill();
    } else if (a === '尖角') {
      ctx.fillStyle = '#e8e4da';
      ctx.strokeStyle = 'rgba(60,50,40,0.4)';
      ctx.lineWidth = Math.max(1, S * 0.01);
      [-0.55, -0.25].forEach((ox) => {
        ctx.beginPath();
        ctx.moveTo(S * ox, -h * 0.92);
        ctx.quadraticCurveTo(S * (ox - 0.02), -h * 1.75, S * (ox - 0.16), -h * 1.85);
        ctx.quadraticCurveTo(S * (ox + 0.02), -h * 1.35, S * (ox + 0.06), -h * 0.9);
        ctx.closePath();
        ctx.fill(); ctx.stroke();
      });
    } else if (a === '飘带') {
      ctx.strokeStyle = 'rgba(255,120,170,0.85)';
      ctx.lineWidth = Math.max(1, S * 0.028);
      ctx.beginPath();
      ctx.moveTo(-S * 0.34, -h * 0.15);
      ctx.quadraticCurveTo(-S * 0.52, -h * 0.75, -S * 0.62, -h * 0.35);
      ctx.stroke();
    } else if (a === '伤疤') {
      ctx.strokeStyle = 'rgba(90,40,40,0.7)';
      ctx.lineWidth = Math.max(1, S * 0.016);
      ctx.beginPath();
      ctx.moveTo(S * 0.2, -h * 0.85);
      ctx.lineTo(S * 0.1, h * 0.4);
      for (let i = 1; i < 4; i++) {
        const t = i / 4;
        const x = S * (0.2 - 0.1 * t), y = h * (-0.85 + 1.25 * t);
        ctx.moveTo(x - S * 0.035, y - S * 0.012);
        ctx.lineTo(x + S * 0.035, y + S * 0.012);
      }
      ctx.stroke();
    }
  }

  /* ---------- 精灵缓存（性能关键） ---------- */
  const cache = new Map();
  const BUCKETS = [16, 22, 30, 40, 54, 72, 96, 128, 172, 230, 310];
  F.sprite = function (st, len, frame) {
    let bucket = BUCKETS[BUCKETS.length - 1];
    for (let i = 0; i < BUCKETS.length; i++) {
      if (BUCKETS[i] >= len) { bucket = BUCKETS[i]; break; }
    }
    const key = F.styleKey(st) + '|' + bucket + '|' + frame;
    let rec = cache.get(key);
    if (rec) return rec;
    const pad = bucket * 1.15;
    const size = Math.ceil(bucket + pad * 2);
    const cv = document.createElement('canvas');
    cv.width = size; cv.height = size;
    const g = cv.getContext('2d');
    g.translate(size / 2, size / 2);
    F.draw(st, g, bucket, frame);
    rec = { cv: cv, size: size, bucket: bucket };
    if (cache.size > 320) cache.clear();
    cache.set(key, rec);
    return rec;
  };

  // 直接绘制实体（带旋转/缩放/摆尾动画）
  F.blit = function (ctx, st, x, y, angle, len, animT, alpha) {
    const frame = [0, 1, 2, 1][Math.floor(animT) % 4];
    const sp = F.sprite(st, len, frame);
    const k = len / sp.bucket;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);
    if (alpha !== undefined && alpha < 1) ctx.globalAlpha = alpha;
    ctx.drawImage(sp.cv, -sp.size / 2 * k, -sp.size / 2 * k, sp.size * k, sp.size * k);
    ctx.restore();
  };
})();
