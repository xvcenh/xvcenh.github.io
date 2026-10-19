/*!
 * fx.js — xvcenh 超级博客自研特效库
 * 零依赖 · 原生 Canvas 2D + DOM API · 支持 prefers-reduced-motion
 * 移植灵感来源：tsParticles / Vanta.js / anime.js / text-scramble / canvas-confetti
 */
(function (global) {
  'use strict';

  var REDUCED = global.matchMedia && global.mediaMatches !== undefined
    ? global.matchMedia('(prefers-reduced-motion: reduce)').matches
    : false;
  try { REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) {}

  /* ============================== 核心调度 ============================== */
  var tasks = new Set(), running = false, hidden = false;

  function loop(t) {
    if (!running) return;
    tasks.forEach(function (fn) {
      try { fn(t); } catch (e) { /* isolate task errors */ }
    });
    requestAnimationFrame(loop);
  }
  function start() {
    if (running || hidden) return;
    running = true;
    requestAnimationFrame(loop);
  }
  function stop() { running = false; }
  function add(fn) {
    tasks.add(fn); start();
    return function () { tasks.delete(fn); };
  }
  document.addEventListener('visibilitychange', function () {
    hidden = document.hidden;
    if (hidden) stop(); else start();
  });

  /* ============================== 画布工具 ============================== */
  function fit(canvas, maxDpr) {
    var dpr = Math.min(global.devicePixelRatio || 1, maxDpr || 2);
    var r = canvas.getBoundingClientRect();
    var w = Math.max(1, r.width), h = Math.max(1, r.height);
    if (canvas.width !== (w * dpr | 0) || canvas.height !== (h * dpr | 0)) {
      canvas.width = w * dpr | 0;
      canvas.height = h * dpr | 0;
    }
    var ctx = canvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    return { ctx: ctx, w: w, h: h, dpr: dpr };
  }

  function inView(canvas, fn) {
    if (!('IntersectionObserver' in global)) return fn(true);
    var io = new IntersectionObserver(function (es) {
      fn(es[0].isIntersecting);
    }, { rootMargin: '80px' });
    io.observe(canvas);
  }

  function pointer(canvas) {
    var p = { x: 0.5, y: 0.5, active: false, down: false };
    canvas.addEventListener('pointermove', function (e) {
      var r = canvas.getBoundingClientRect();
      p.x = (e.clientX - r.left) / r.width;
      p.y = (e.clientY - r.top) / r.height;
      p.active = true;
    }, { passive: true });
    canvas.addEventListener('pointerleave', function () { p.active = false; });
    canvas.addEventListener('pointerdown', function () { p.down = true; });
    global.addEventListener('pointerup', function () { p.down = false; });
    return p;
  }

  var rand = function (a, b) { return a + Math.random() * (b - a); };

  /* ============================== 1. 星野 Starfield ============================== */
  function starfield(canvas, opts) {
    opts = opts || {};
    var n = opts.count || 220, speed = opts.speed || 0.22,
        shootEvery = opts.shootEvery || 2600, parallax = opts.parallax !== false;
    var f = fit(canvas), ctx = f.ctx, w = f.w, h = f.h, p = pointer(canvas);
    var stars = [], shots = [], last = 0, visible = true;
    for (var i = 0; i < n; i++) stars.push({
      x: Math.random() * w, y: Math.random() * h,
      z: Math.random() * 0.8 + 0.2,
      r: Math.random() * 1.4 + 0.25,
      tw: Math.random() * Math.PI * 2
    });
    global.addEventListener('resize', function () {
      var g = fit(canvas); ctx = g.ctx; w = g.w; h = g.h;
    });
    inView(canvas, function (v) { visible = v; });

    add(function (t) {
      if (!visible) return;
      ctx.clearRect(0, 0, w, h);
      if (t - last > shootEvery && !REDUCED) {
        last = t;
        shots.push({ x: Math.random() * w * 0.7, y: Math.random() * h * 0.45, vx: rand(6, 11), vy: rand(2.2, 4.6), life: 1 });
      }
      for (var i = 0; i < stars.length; i++) {
        var s = stars[i];
        s.y += speed * s.z * (opts.fall ? 1 : 0.35);
        if (s.y > h + 4) { s.y = -4; s.x = Math.random() * w; }
        s.tw += 0.035;
        var px = s.x, py = s.y;
        if (parallax && p.active) { px += (p.x - 0.5) * s.z * 34; py += (p.y - 0.5) * s.z * 34; }
        var a = 0.35 + 0.6 * s.z * (0.62 + 0.38 * Math.sin(s.tw));
        ctx.beginPath();
        ctx.fillStyle = 'rgba(' + (opts.rgb || '255,255,255') + ',' + a.toFixed(3) + ')';
        ctx.arc(px, py, s.r * s.z * 1.7, 0, 6.2832);
        ctx.fill();
        if (s.r > 1.1 && s.z > 0.75) {
          ctx.beginPath();
          ctx.fillStyle = 'rgba(' + (opts.rgb || '255,255,255') + ',' + (a * 0.12).toFixed(3) + ')';
          ctx.arc(px, py, s.r * 7, 0, 6.2832);
          ctx.fill();
        }
      }
      for (var j = shots.length - 1; j >= 0; j--) {
        var m = shots[j];
        m.x += m.vx; m.y += m.vy; m.life -= 0.012;
        if (m.life <= 0 || m.x > w + 60 || m.y > h + 60) { shots.splice(j, 1); continue; }
        var g = ctx.createLinearGradient(m.x, m.y, m.x - m.vx * 14, m.y - m.vy * 14);
        g.addColorStop(0, 'rgba(255,255,255,' + (0.9 * m.life) + ')');
        g.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.strokeStyle = g; ctx.lineWidth = 1.8; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(m.x, m.y); ctx.lineTo(m.x - m.vx * 14, m.y - m.vy * 14); ctx.stroke();
      }
    });
    return { stop: stop };
  }

  /* ============================== 2. 极光 Aurora ============================== */
  function aurora(canvas, opts) {
    opts = opts || {};
    var hues = opts.hues || [[168, 96, 58], [276, 88, 52], [330, 90, 58], [210, 92, 55]];
    var f = fit(canvas), ctx = f.ctx, w = f.w, h = f.h, visible = true;
    global.addEventListener('resize', function () {
      var g = fit(canvas); ctx = g.ctx; w = g.w; h = g.h;
    });
    inView(canvas, function (v) { visible = v; });
    add(function (t) {
      if (!visible) return;
      var time = t * (REDUCED ? 0.00004 : 0.00012);
      ctx.clearRect(0, 0, w, h);
      ctx.globalCompositeOperation = 'lighter';
      for (var b = 0; b < hues.length; b++) {
        var col = hues[b], phase = time * (1 + b * 0.22) + b * 1.7;
        ctx.beginPath();
        for (var x = -40; x <= w + 40; x += 14) {
          var k = x / w;
          var y = h * (0.34 + 0.14 * Math.sin(k * 3.1 + phase))
                + h * 0.12 * Math.sin(k * 7.3 - phase * 1.4 + b)
                + h * 0.05 * Math.sin(k * 13.7 + phase * 0.7);
          if (x === -40) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        }
        var grad = ctx.createLinearGradient(0, 0, 0, h);
        grad.addColorStop(0, 'hsla(' + col[0] + ',' + col[1] + '%,' + col[2] + '%,0)');
        grad.addColorStop(0.55, 'hsla(' + col[0] + ',' + col[1] + '%,' + col[2] + '%,' + (opts.alpha || 0.2) + ')');
        grad.addColorStop(1, 'hsla(' + col[0] + ',' + col[1] + '%,' + col[2] + '%,0)');
        ctx.strokeStyle = grad;
        ctx.lineWidth = (opts.width || 90) * (0.7 + 0.3 * Math.sin(phase));
        ctx.lineCap = 'round';
        ctx.filter = 'blur(' + (opts.blur || 26) + 'px)';
        ctx.stroke();
        ctx.filter = 'none';
      }
      ctx.globalCompositeOperation = 'source-over';
    });
  }

  /* ============================== 3. 数字雨 Matrix Rain ============================== */
  function matrixRain(canvas, opts) {
    opts = opts || {};
    var glyphs = opts.glyphs || 'アイウエオカキクケコサシスセソタチツテトナニヌネノ0123456789ABCDEF$#%&';
    var fontSize = opts.fontSize || 16, color = opts.color || '#7CFFB2', rgb = opts.rgb || '124,255,178';
    var f = fit(canvas), ctx = f.ctx, w = f.w, h = f.h, visible = true;
    var cols = Math.ceil(w / fontSize), drops = [];
    for (var i = 0; i < cols; i++) drops[i] = Math.random() * -h / fontSize;
    global.addEventListener('resize', function () {
      var g = fit(canvas); ctx = g.ctx; w = g.w; h = g.h;
      cols = Math.ceil(w / fontSize); drops = [];
      for (var k = 0; k < cols; k++) drops[k] = Math.random() * -h / fontSize;
    });
    inView(canvas, function (v) { visible = v; });
    ctx.textBaseline = 'top';
    var tick = 0;
    add(function () {
      if (!visible || REDUCED && tick++ % 6) return;
      ctx.fillStyle = 'rgba(' + (opts.bg || '6,9,7') + ',' + (opts.fade || 0.085) + ')';
      ctx.fillRect(0, 0, w, h);
      ctx.font = fontSize + 'px "JetBrains Mono", monospace';
      for (var i = 0; i < cols; i++) {
        var ch = glyphs[Math.random() * glyphs.length | 0];
        var y = drops[i] * fontSize;
        ctx.fillStyle = 'rgba(235,255,244,0.92)';
        ctx.fillText(ch, i * fontSize, y);
        ctx.fillStyle = 'rgba(' + rgb + ',0.85)';
        if (y > fontSize) ctx.fillText(glyphs[Math.random() * glyphs.length | 0], i * fontSize, y - fontSize);
        drops[i]++;
        if (y > h && Math.random() > 0.972) drops[i] = Math.random() * -24;
      }
    });
    void color;
  }

  /* ============================== 4. 星链 Constellation Network ============================== */
  function network(canvas, opts) {
    opts = opts || {};
    var count = opts.count || 70, dist = opts.dist || 140, rgb = opts.rgb || '120,180,255';
    var f = fit(canvas), ctx = f.ctx, w = f.w, h = f.h, p = pointer(canvas), visible = true;
    var nodes = [];
    function seed() {
      nodes = [];
      for (var i = 0; i < count; i++) nodes.push({
        x: Math.random() * w, y: Math.random() * h,
        vx: rand(-0.32, 0.32), vy: rand(-0.32, 0.32), r: rand(1, 2.6)
      });
    }
    seed();
    global.addEventListener('resize', function () {
      var g = fit(canvas); ctx = g.ctx; w = g.w; h = g.h; seed();
    });
    inView(canvas, function (v) { visible = v; });
    add(function () {
      if (!visible) return;
      ctx.clearRect(0, 0, w, h);
      var mx = (p.x || 0.5) * w, my = (p.y || 0.5) * h;
      for (var i = 0; i < nodes.length; i++) {
        var n = nodes[i];
        n.x += n.vx; n.y += n.vy;
        if (n.x < 0 || n.x > w) n.vx *= -1;
        if (n.y < 0 || n.y > h) n.vy *= -1;
        if (p.active) {
          var dx = n.x - mx, dy = n.y - my, d2 = dx * dx + dy * dy;
          if (d2 < 22000 && d2 > 1) { n.x += dx / Math.sqrt(d2) * 0.9; n.y += dy / Math.sqrt(d2) * 0.9; }
        }
        ctx.beginPath();
        ctx.fillStyle = 'rgba(' + rgb + ',0.85)';
        ctx.arc(n.x, n.y, n.r, 0, 6.2832); ctx.fill();
      }
      for (var a = 0; a < nodes.length; a++) for (var b = a + 1; b < nodes.length; b++) {
        var ddx = nodes[a].x - nodes[b].x, ddy = nodes[a].y - nodes[b].y, d = Math.sqrt(ddx * ddx + ddy * ddy);
        if (d < dist) {
          ctx.beginPath();
          ctx.strokeStyle = 'rgba(' + rgb + ',' + (0.34 * (1 - d / dist)).toFixed(3) + ')';
          ctx.lineWidth = 1;
          ctx.moveTo(nodes[a].x, nodes[a].y); ctx.lineTo(nodes[b].x, nodes[b].y); ctx.stroke();
        }
      }
      if (p.active) {
        ctx.beginPath();
        ctx.fillStyle = 'rgba(' + rgb + ',0.5)';
        ctx.arc(mx, my, 3.4, 0, 6.2832); ctx.fill();
      }
    });
  }

  /* ============================== 5. 超空间跃迁 Warp ============================== */
  function warp(canvas, opts) {
    opts = opts || {};
    var count = opts.count || 320, speed = opts.speed || 1.1, rgb = opts.rgb || '180,210,255';
    var f = fit(canvas), ctx = f.ctx, w = f.w, h = f.h, p = pointer(canvas), visible = true;
    var stars = [];
    function seed() {
      stars = [];
      for (var i = 0; i < count; i++) stars.push({ x: rand(-w, w), y: rand(-h, h), z: rand(0.1, w) });
    }
    seed();
    global.addEventListener('resize', function () {
      var g = fit(canvas); ctx = g.ctx; w = g.w; h = g.h; seed();
    });
    inView(canvas, function (v) { visible = v; });
    add(function () {
      if (!visible) return;
      ctx.fillStyle = 'rgba(' + (opts.bg || '4,6,14') + ',' + (opts.fade || 0.34) + ')';
      ctx.fillRect(0, 0, w, h);
      var cx = w * (0.5 + (p.x - 0.5) * 0.22), cy = h * (0.5 + (p.y - 0.5) * 0.22);
      for (var i = 0; i < stars.length; i++) {
        var s = stars[i], pz = s.z;
        s.z -= speed * (REDUCED ? 0.35 : 1) * (p.down ? 3.2 : 1);
        if (s.z < 1) { s.z = w; s.x = rand(-w, w); s.y = rand(-h, h); pz = s.z; }
        var sx = cx + s.x / s.z * w * 0.62, sy = cy + s.y / s.z * w * 0.62;
        var lx = cx + s.x / pz * w * 0.62, ly = cy + s.y / pz * w * 0.62;
        if (sx < -30 || sx > w + 30 || sy < -30 || sy > h + 30) continue;
        var k = 1 - s.z / w;
        ctx.beginPath();
        ctx.strokeStyle = 'rgba(' + rgb + ',' + (0.15 + k * 0.85).toFixed(3) + ')';
        ctx.lineWidth = Math.max(0.4, k * 2.6);
        ctx.moveTo(lx, ly); ctx.lineTo(sx, sy); ctx.stroke();
      }
    });
  }

  /* ============================== 6. 点阵星球 Dotted Globe ============================== */
  function globe(canvas, opts) {
    opts = opts || {};
    var count = opts.count || 900, rgb = opts.rgb || '110,200,255', accent = opts.accent || '255,190,90';
    var f = fit(canvas), ctx = f.ctx, w = f.w, h = f.h, p = pointer(canvas), visible = true;
    var pts = [];
    var gr = Math.PI * (3 - Math.sqrt(5));
    for (var i = 0; i < count; i++) {
      var y = 1 - (i / (count - 1)) * 2, r = Math.sqrt(1 - y * y), th = gr * i;
      pts.push({ x: Math.cos(th) * r, y: y, z: Math.sin(th) * r, hot: Math.random() < 0.055 });
    }
    var ang = 0, drag = 0;
    global.addEventListener('resize', function () {
      var g = fit(canvas); ctx = g.ctx; w = g.w; h = g.h;
    });
    inView(canvas, function (v) { visible = v; });
    add(function () {
      if (!visible) return;
      ctx.clearRect(0, 0, w, h);
      var R = Math.min(w, h) * (opts.radius || 0.32);
      var cx = w / 2, cy = h / 2;
      drag += ((p.active ? (p.x - 0.5) * 1.2 : 0) - drag) * 0.04;
      ang += REDUCED ? 0.0012 : 0.0032;
      var a = ang + drag, tilt = -0.42;
      var ca = Math.cos(a), sa = Math.sin(a), ct = Math.cos(tilt), st = Math.sin(tilt);
      for (var i = 0; i < pts.length; i++) {
        var q = pts[i];
        var x1 = q.x * ca + q.z * sa, z1 = -q.x * sa + q.z * ca;
        var y2 = q.y * ct - z1 * st, z2 = q.y * st + z1 * ct;
        var depth = (z2 + 1) / 2;
        var sx = cx + x1 * R, sy = cy + y2 * R;
        var rad = (q.hot ? 2.1 : 1.05) * (0.45 + depth * 0.9);
        if (q.hot && z2 > 0) {
          ctx.beginPath();
          ctx.fillStyle = 'rgba(' + accent + ',' + (0.1 * depth).toFixed(3) + ')';
          ctx.arc(sx, sy, rad * 5.5, 0, 6.2832); ctx.fill();
        }
        ctx.beginPath();
        ctx.fillStyle = 'rgba(' + (q.hot ? accent : rgb) + ',' + (0.12 + depth * (q.hot ? 0.95 : 0.72)).toFixed(3) + ')';
        ctx.arc(sx, sy, rad, 0, 6.2832); ctx.fill();
      }
      ctx.beginPath();
      ctx.strokeStyle = 'rgba(' + rgb + ',0.16)';
      ctx.lineWidth = 1;
      ctx.ellipse(cx, cy, R * 1.22, R * 1.22 * 0.3, -0.16, 0, 6.2832);
      ctx.stroke();
      for (var s = 0; s < 3; s++) {
        var oa = ang * (1.6 + s * 0.5) + s * 2.1;
        var ox = cx + Math.cos(oa) * R * 1.22, oy = cy + Math.sin(oa) * R * 1.22 * 0.3 - Math.sin(oa) * R * 0.16;
        ctx.beginPath();
        ctx.fillStyle = 'rgba(' + accent + ',0.9)';
        ctx.arc(ox, oy, 2.6, 0, 6.2832); ctx.fill();
      }
    });
  }

  /* ============================== 7. 樱吹雪 Petals ============================== */
  function petals(canvas, opts) {
    opts = opts || {};
    var count = opts.count || 38, color = opts.color || '255,183,197', leaf = opts.leaf;
    var f = fit(canvas), ctx = f.ctx, w = f.w, h = f.h, p = pointer(canvas), visible = true;
    var list = [];
    function seed() {
      list = [];
      for (var i = 0; i < count; i++) list.push({
        x: Math.random() * w, y: Math.random() * h,
        s: rand(6, 15), vy: rand(0.5, 1.5), vx: rand(-0.5, 0.5),
        rot: Math.random() * 6.28, vr: rand(-0.016, 0.016),
        sway: Math.random() * 6.28, hue: rand(-14, 14), flip: Math.random() * 6.28
      });
    }
    seed();
    global.addEventListener('resize', function () {
      var g = fit(canvas); ctx = g.ctx; w = g.w; h = g.h;
    });
    inView(canvas, function (v) { visible = v; });
    add(function () {
      if (!visible) return;
      ctx.clearRect(0, 0, w, h);
      for (var i = 0; i < list.length; i++) {
        var q = list[i];
        q.sway += 0.014; q.flip += 0.026;
        q.x += q.vx + Math.sin(q.sway) * 0.7 + (p.active ? (p.x - 0.5) * 1.6 : 0);
        q.y += q.vy * (REDUCED ? 0.4 : 1);
        q.rot += q.vr;
        if (q.y > h + 24) { q.y = -24; q.x = Math.random() * w; }
        if (q.x > w + 30) q.x = -30; if (q.x < -30) q.x = w + 30;
        ctx.save();
        ctx.translate(q.x, q.y); ctx.rotate(q.rot);
        ctx.scale(1, 0.62 + 0.38 * Math.abs(Math.sin(q.flip)));
        var g2 = ctx.createLinearGradient(-q.s, -q.s, q.s, q.s);
        g2.addColorStop(0, 'rgba(' + color + ',0.92)');
        g2.addColorStop(1, 'hsla(' + (340 + q.hue) + ',90%,72%,0.72)');
        ctx.fillStyle = g2;
        ctx.beginPath();
        if (leaf) {
          ctx.moveTo(-q.s, 0);
          ctx.quadraticCurveTo(0, -q.s * 0.8, q.s, 0);
          ctx.quadraticCurveTo(0, q.s * 0.8, -q.s, 0);
        } else {
          ctx.moveTo(0, -q.s);
          ctx.quadraticCurveTo(q.s * 0.92, -q.s * 0.52, q.s * 0.6, q.s * 0.52);
          ctx.quadraticCurveTo(q.s * 0.18, q.s * 1.02, 0, q.s * 0.62);
          ctx.quadraticCurveTo(-q.s * 0.18, q.s * 1.02, -q.s * 0.6, q.s * 0.52);
          ctx.quadraticCurveTo(-q.s * 0.92, -q.s * 0.52, 0, -q.s);
        }
        ctx.fill();
        ctx.restore();
      }
    });
  }

  /* ============================== 8. 烟花 Fireworks ============================== */
  function fireworks(canvas, opts) {
    opts = opts || {};
    var f = fit(canvas), ctx = f.ctx, w = f.w, h = f.h, visible = true;
    var rockets = [], sparks = [], auto = opts.auto !== false;
    var palette = opts.palette || ['#FF6B6B', '#FFD166', '#06D6A0', '#4CC9F0', '#C77DFF', '#FFE66D'];
    global.addEventListener('resize', function () {
      var g = fit(canvas); ctx = g.ctx; w = g.w; h = g.h;
    });
    inView(canvas, function (v) { visible = v; });
    function burst(x, y, hue) {
      var n = REDUCED ? 26 : 64, base = hue || palette[Math.random() * palette.length | 0];
      for (var i = 0; i < n; i++) {
        var a = (i / n) * 6.2832 + rand(-0.08, 0.08), sp = rand(1.2, 5.4);
        sparks.push({
          x: x, y: y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp,
          life: 1, decay: rand(0.011, 0.026), c: base, trail: []
        });
      }
    }
    function launch(x, y) {
      rockets.push({ x: x, y: h, tx: x, ty: y, vy: -rand(7.4, 10.4), vx: rand(-1, 1), c: palette[Math.random() * palette.length | 0] });
    }
    canvas.addEventListener('pointerdown', function (e) {
      var r = canvas.getBoundingClientRect();
      launch(e.clientX - r.left, e.clientY - r.top);
    });
    var lastAuto = 0;
    add(function (t) {
      if (!visible) return;
      ctx.fillStyle = 'rgba(' + (opts.bg || '8,8,18') + ',' + (opts.fade || 0.16) + ')';
      ctx.fillRect(0, 0, w, h);
      if (auto && t - lastAuto > (opts.interval || 1700) && !REDUCED) {
        lastAuto = t;
        launch(rand(w * 0.18, w * 0.82), rand(h * 0.16, h * 0.58));
      }
      for (var i = rockets.length - 1; i >= 0; i--) {
        var r = rockets[i];
        r.x += r.vx; r.y += r.vy; r.vy += 0.108;
        ctx.beginPath();
        ctx.fillStyle = r.c;
        ctx.arc(r.x, r.y, 2.4, 0, 6.2832); ctx.fill();
        ctx.beginPath();
        ctx.fillStyle = 'rgba(255,220,160,0.32)';
        ctx.arc(r.x, r.y + 6, 1.6, 0, 6.2832); ctx.fill();
        if (r.vy >= -1.1 || r.y <= r.ty) { burst(r.x, r.y, r.c); rockets.splice(i, 1); }
      }
      for (var j = sparks.length - 1; j >= 0; j--) {
        var s = sparks[j];
        s.trail.push(s.x, s.y); if (s.trail.length > 8) s.trail.splice(0, 2);
        s.x += s.vx; s.y += s.vy;
        s.vx *= 0.974; s.vy = s.vy * 0.974 + 0.043;
        s.life -= s.decay;
        if (s.life <= 0) { sparks.splice(j, 1); continue; }
        for (var k = 0; k < s.trail.length - 1; k += 2) {
          ctx.beginPath();
          ctx.fillStyle = hexA(s.c, s.life * (k / s.trail.length) * 0.34);
          ctx.arc(s.trail[k], s.trail[k + 1], 1.5, 0, 6.2832); ctx.fill();
        }
        ctx.beginPath();
        ctx.fillStyle = hexA(s.c, Math.min(1, s.life * 1.2));
        ctx.arc(s.x, s.y, 2.1 * s.life + 0.5, 0, 6.2832); ctx.fill();
      }
    });
    return {
      burst: burst, launch: launch,
      celebrate: function () {
        for (var i = 0; i < 7; i++) setTimeout(function () {
          launch(rand(w * 0.15, w * 0.85), rand(h * 0.12, h * 0.5));
        }, i * 260);
      }
    };
  }

  function hexA(hex, a) {
    if (hex[0] !== '#') return hex;
    var n = parseInt(hex.slice(1), 16);
    return 'rgba(' + (n >> 16 & 255) + ',' + (n >> 8 & 255) + ',' + (n & 255) + ',' + Math.max(0, Math.min(1, a)) + ')';
  }

  /* ============================== 9. 液态光斑 Bokeh / Metaballs ============================== */
  function bokeh(canvas, opts) {
    opts = opts || {};
    var count = opts.count || 14, rgb = opts.rgb || '120,170,255', accent = opts.accent || '255,120,190';
    var f = fit(canvas), ctx = f.ctx, w = f.w, h = f.h, visible = true;
    var blobs = [];
    for (var i = 0; i < count; i++) blobs.push({
      x: Math.random(), y: Math.random(),
      r: rand(0.06, 0.2), vx: rand(-0.0016, 0.0016), vy: rand(-0.0013, 0.0013),
      hot: i < 3
    });
    inView(canvas, function (v) { visible = v; });
    global.addEventListener('resize', function () {
      var g = fit(canvas); ctx = g.ctx; w = g.w; h = g.h;
    });
    add(function (t) {
      if (!visible) return;
      ctx.clearRect(0, 0, w, h);
      var phase = t * 0.00022;
      for (var i = 0; i < blobs.length; i++) {
        var b = blobs[i];
        b.x += b.vx + Math.sin(phase + i) * 0.0007;
        b.y += b.vy + Math.cos(phase * 0.8 + i * 1.3) * 0.0006;
        if (b.x < -0.2) b.x = 1.2; if (b.x > 1.2) b.x = -0.2;
        if (b.y < -0.2) b.y = 1.2; if (b.y > 1.2) b.y = -0.2;
        var R = b.r * Math.min(w, h);
        var g2 = ctx.createRadialGradient(b.x * w, b.y * h, 0, b.x * w, b.y * h, R);
        var c = b.hot ? accent : rgb;
        g2.addColorStop(0, 'rgba(' + c + ',' + (opts.alpha || 0.34) + ')');
        g2.addColorStop(1, 'rgba(' + c + ',0)');
        ctx.fillStyle = g2;
        ctx.beginPath(); ctx.arc(b.x * w, b.y * h, R, 0, 6.2832); ctx.fill();
      }
    });
  }

  /* ============================== 10. 雨 Rain ============================== */
  function rain(canvas, opts) {
    opts = opts || {};
    var count = opts.count || 160, rgb = opts.rgb || '170,200,255';
    var f = fit(canvas), ctx = f.ctx, w = f.w, h = f.h, visible = true;
    var drops = [];
    for (var i = 0; i < count; i++) drops.push({ x: Math.random() * w, y: Math.random() * h, l: rand(8, 26), v: rand(6, 15), o: rand(0.16, 0.62) });
    global.addEventListener('resize', function () {
      var g = fit(canvas); ctx = g.ctx; w = g.w; h = g.h;
    });
    inView(canvas, function (v) { visible = v; });
    add(function () {
      if (!visible) return;
      ctx.clearRect(0, 0, w, h);
      ctx.lineCap = 'round';
      for (var i = 0; i < drops.length; i++) {
        var d = drops[i];
        ctx.beginPath();
        ctx.strokeStyle = 'rgba(' + rgb + ',' + d.o + ')';
        ctx.lineWidth = 1.25;
        ctx.moveTo(d.x, d.y); ctx.lineTo(d.x - 1.6, d.y + d.l);
        ctx.stroke();
        d.y += d.v * (REDUCED ? 0.4 : 1); d.x -= 0.65;
        if (d.y > h) { d.y = -30; d.x = Math.random() * (w + 60); }
      }
    });
  }

  /* ============================== 文字扰乱 Scramble ============================== */
  var GLYPHS = '!<>-_\\/[]{}—=+*^?#________0123456789アイウエオ';
  function scramble(el, opts) {
    opts = opts || {};
    var text = opts.text || el.dataset.text || el.textContent.trim();
    el.dataset.text = text;
    var frame = 0, queue = [], resolveFns = [], raf = 0, runningSc = false;
    function run() {
      if (runningSc) return;
      runningSc = true;
      frame = 0;
      queue = [];
      for (var i = 0; i < text.length; i++) {
        var from = el.textContent[i] || '', to = text[i] || '';
        var startF = Math.floor(Math.random() * (opts.speed || 26));
        var endF = startF + Math.floor(Math.random() * (opts.speed || 26)) + 8;
        queue.push({ from: from, to: to, start: startF, end: endF, char: '' });
      }
      cancelAnimationFrame(raf);
      (function update() {
        var out = '', done = 0;
        for (var i = 0; i < queue.length; i++) {
          var q = queue[i];
          if (frame >= q.end) { done++; out += q.to; }
          else if (frame >= q.start) {
            if (!q.char || Math.random() < 0.3) q.char = GLYPHS[Math.random() * GLYPHS.length | 0];
            out += '<span class="fx-scr" style="opacity:.7">' + q.char + '</span>';
          } else out += q.from;
        }
        el.innerHTML = out;
        if (done === queue.length) { runningSc = false; el.textContent = text; return; }
        frame++;
        raf = requestAnimationFrame(update);
      })();
    }
    if (opts.trigger === 'hover') el.addEventListener('mouseenter', run);
    else if (opts.trigger === 'visible' && 'IntersectionObserver' in global) {
      var io = new IntersectionObserver(function (es) {
        if (es[0].isIntersecting) { run(); io.disconnect(); }
      }, { threshold: 0.4 });
      io.observe(el);
    } else run();
    return run;
  }

  /* ============================== 打字机 Typewriter ============================== */
  function typewriter(el, strings, opts) {
    opts = opts || {};
    var si = 0, ci = 0, deleting = false, timer = 0;
    strings = strings || JSON.parse(el.dataset.strings || '[]');
    if (!strings.length) return;
    var cursor = document.createElement('span');
    cursor.className = 'fx-cursor';
    cursor.textContent = opts.cursor || '▌';
    function step() {
      var cur = strings[si % strings.length];
      if (!deleting) {
        ci++;
        el.textContent = cur.slice(0, ci);
        if (ci === cur.length) {
          deleting = true;
          timer = setTimeout(step, opts.pause || 1700);
          return;
        }
        timer = setTimeout(step, opts.speed || 62);
      } else {
        ci -= 2;
        if (ci <= 0) { ci = 0; deleting = false; si++; timer = setTimeout(step, 320); return; }
        el.textContent = cur.slice(0, ci);
        timer = setTimeout(step, 28);
      }
    }
    el.textContent = '';
    el.appendChild(cursor);
    if (REDUCED) { el.textContent = strings[0]; return; }
    var holder = document.createTextNode('');
    el.insertBefore(holder, cursor);
    (function tick() {
      var cur = strings[si % strings.length];
      if (!deleting) {
        ci++;
        holder.textContent = cur.slice(0, ci);
        if (ci >= cur.length) {
          deleting = true;
          timer = setTimeout(tick, opts.pause || 1700);
          return;
        }
        timer = setTimeout(tick, opts.speed || 62);
      } else {
        ci -= 2;
        if (ci <= 0) { ci = 0; deleting = false; si++; timer = setTimeout(tick, 320); return; }
        holder.textContent = cur.slice(0, ci);
        timer = setTimeout(tick, 26);
      }
    })();
    void step; void timer;
  }

  /* ============================== 滚动揭示 Reveal ============================== */
  function reveal(selector) {
    var els = [].slice.call(document.querySelectorAll(selector || '.reveal'));
    if (!('IntersectionObserver' in global) || REDUCED) {
      els.forEach(function (el) { el.classList.add('in'); });
      return;
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        var el = en.target;
        var d = el.dataset.delay || 0;
        setTimeout(function () { el.classList.add('in'); }, +d);
        io.unobserve(el);
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -6% 0px' });
    els.forEach(function (el, i) {
      if (!el.dataset.delay) el.dataset.delay = (i % 6) * 70;
      io.observe(el);
    });
  }

  /* ============================== 数字滚动 Counter ============================== */
  function counter(el, opts) {
    opts = opts || {};
    var target = parseFloat(el.dataset.target || el.textContent) || 0;
    var dec = +(el.dataset.dec || 0), suffix = el.dataset.suffix || '';
    function play() {
      var t0 = performance.now(), dur = opts.duration || 1500;
      (function tick(t) {
        var k = Math.min(1, (t - t0) / dur);
        var e = 1 - Math.pow(1 - k, 4);
        el.textContent = (target * e).toFixed(dec).replace(/\B(?=(\d{3})+(?!\d))/g, ',') + suffix;
        if (k < 1) requestAnimationFrame(tick);
        else el.textContent = target.toFixed(dec).replace(/\B(?=(\d{3})+(?!\d))/g, ',') + suffix;
      })(performance.now());
    }
    if (!('IntersectionObserver' in global) || REDUCED) {
      el.textContent = target.toFixed(dec).replace(/\B(?=(\d{3})+(?!\d))/g, ',') + suffix;
      return;
    }
    var io = new IntersectionObserver(function (es) {
      if (es[0].isIntersecting) { play(); io.disconnect(); }
    }, { threshold: 0.5 });
    io.observe(el);
  }

  /* ============================== 磁吸按钮 Magnetic ============================== */
  function magnetic(el, strength) {
    if (REDUCED || matchMedia('(hover: none)').matches) return;
    strength = strength || 0.32;
    el.addEventListener('pointermove', function (e) {
      var r = el.getBoundingClientRect();
      var x = e.clientX - r.left - r.width / 2, y = e.clientY - r.top - r.height / 2;
      el.style.transform = 'translate(' + x * strength + 'px,' + y * strength + 'px)';
    });
    el.addEventListener('pointerleave', function () {
      el.style.transform = '';
      el.style.transition = 'transform .45s cubic-bezier(.2,.9,.25,1)';
      setTimeout(function () { el.style.transition = ''; }, 460);
    });
  }

  /* ============================== 自定义光标 Cursor ============================== */
  function cursor(opts) {
    opts = opts || {};
    if (matchMedia('(hover: none)').matches || REDUCED) return;
    var dot = document.createElement('div'), ring = document.createElement('div');
    dot.className = 'fx-cursor-dot'; ring.className = 'fx-cursor-ring';
    document.body.appendChild(ring); document.body.appendChild(dot);
    document.documentElement.classList.add('fx-cursor-on');
    var mx = innerWidth / 2, my = innerHeight / 2, rx = mx, ry = my;
    addEventListener('pointermove', function (e) {
      mx = e.clientX; my = e.clientY;
      dot.style.transform = 'translate(' + mx + 'px,' + my + 'px)';
    }, { passive: true });
    add(function () {
      rx += (mx - rx) * 0.16; ry += (my - ry) * 0.16;
      ring.style.transform = 'translate(' + rx + 'px,' + ry + 'px)';
    });
    var hoverSel = opts.hover || 'a,button,[data-hover],input,textarea,summary,.fx-hover';
    document.addEventListener('pointerover', function (e) {
      if (e.target.closest && e.target.closest(hoverSel)) ring.classList.add('big');
    });
    document.addEventListener('pointerout', function (e) {
      if (e.target.closest && e.target.closest(hoverSel)) ring.classList.remove('big');
    });
    if (opts.trail !== false) {
      var lastX = 0, lastY = 0;
      addEventListener('pointermove', function (e) {
        if (Math.abs(e.clientX - lastX) + Math.abs(e.clientY - lastY) < 42) return;
        lastX = e.clientX; lastY = e.clientY;
        var s = document.createElement('span');
        s.className = 'fx-trail';
        s.style.left = e.clientX + 'px'; s.style.top = e.clientY + 'px';
        s.style.background = opts.trailColor || 'rgba(120,190,255,.7)';
        document.body.appendChild(s);
        setTimeout(function () { s.remove(); }, 720);
      }, { passive: true });
    }
  }

  /* ============================== Konami 彩蛋 ============================== */
  function konami(cb) {
    var code = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'b', 'a'];
    var i = 0;
    addEventListener('keydown', function (e) {
      var k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
      if (k === code[i] || k === code[i].toLowerCase()) {
        i++;
        if (i === code.length) { i = 0; cb(); }
      } else i = k === code[0] ? 1 : 0;
    });
  }

  /* ============================== 命令面板 Command Palette ============================== */
  function palette(items, opts) {
    opts = opts || {};
    var wrap = document.createElement('div');
    wrap.className = 'fx-palette';
    wrap.innerHTML =
      '<div class="fx-palette-box" role="dialog" aria-label="命令面板">' +
      '<div class="fx-palette-search"><span class="fx-palette-k">⌘K</span>' +
      '<input type="text" placeholder="' + (opts.placeholder || '输入命令或页面名…') + '" aria-label="搜索命令"></div>' +
      '<ul class="fx-palette-list"></ul>' +
      '<div class="fx-palette-foot"><span>↑↓ 导航</span><span>Enter 执行</span><span>Esc 关闭</span></div></div>';
    document.body.appendChild(wrap);
    var input = wrap.querySelector('input'), list = wrap.querySelector('ul');
    var idx = 0, filtered = items.slice();

    function render() {
      list.innerHTML = '';
      filtered.forEach(function (it, i) {
        var li = document.createElement('li');
        li.className = 'fx-palette-item' + (i === idx ? ' active' : '');
        li.innerHTML = '<span class="fx-palette-ico">' + (it.icon || '›') + '</span>' +
          '<span class="fx-palette-label">' + it.label + '</span>' +
          '<span class="fx-palette-hint">' + (it.hint || '') + '</span>';
        li.addEventListener('click', function () { close(); it.run && it.run(); });
        li.addEventListener('pointerenter', function () { idx = i; render(); });
        list.appendChild(li);
      });
    }
    function open() {
      wrap.classList.add('open');
      input.value = ''; filtered = items.slice(); idx = 0; render();
      setTimeout(function () { input.focus(); }, 30);
    }
    function close() { wrap.classList.remove('open'); }
    input.addEventListener('input', function () {
      var q = input.value.trim().toLowerCase();
      filtered = items.filter(function (it) {
        return (it.label + ' ' + (it.hint || '') + ' ' + (it.keywords || '')).toLowerCase().indexOf(q) >= 0;
      });
      idx = 0; render();
    });
    addEventListener('keydown', function (e) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        wrap.classList.contains('open') ? close() : open();
        return;
      }
      if (!wrap.classList.contains('open')) return;
      if (e.key === 'Escape') close();
      else if (e.key === 'ArrowDown') { e.preventDefault(); idx = Math.min(filtered.length - 1, idx + 1); render(); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); idx = Math.max(0, idx - 1); render(); }
      else if (e.key === 'Enter' && filtered[idx]) { close(); filtered[idx].run && filtered[idx].run(); }
    });
    wrap.addEventListener('click', function (e) { if (e.target === wrap) close(); });
    render();
    return { open: open, close: close };
  }

  /* ============================== Toast ============================== */
  function toast(msg, opts) {
    opts = opts || {};
    var box = document.querySelector('.fx-toast-box');
    if (!box) {
      box = document.createElement('div');
      box.className = 'fx-toast-box';
      document.body.appendChild(box);
    }
    var t = document.createElement('div');
    t.className = 'fx-toast';
    t.innerHTML = msg;
    box.appendChild(t);
    requestAnimationFrame(function () { t.classList.add('show'); });
    setTimeout(function () {
      t.classList.remove('show');
      setTimeout(function () { t.remove(); }, 380);
    }, opts.duration || 2800);
  }

  /* ============================== confetti 桥接 ============================== */
  function confetti(x, y) {
    if (typeof global.confetti !== 'function') return;
    global.confetti({
      particleCount: 80, spread: 78, startVelocity: 38,
      origin: { x: (x || innerWidth / 2) / innerWidth, y: (y || innerHeight / 2) / innerHeight },
      colors: ['#FF6B6B', '#FFD166', '#06D6A0', '#4CC9F0', '#C77DFF']
    });
  }

  /* ============================== 涟漪 Ripple ============================== */
  function ripple() {
    document.addEventListener('click', function (e) {
      var host = e.target.closest && e.target.closest('.fx-ripple');
      if (!host || REDUCED) return;
      var r = host.getBoundingClientRect();
      var s = document.createElement('span');
      s.className = 'fx-ripple-wave';
      var size = Math.max(r.width, r.height) * 2;
      s.style.width = s.style.height = size + 'px';
      s.style.left = (e.clientX - r.left - size / 2) + 'px';
      s.style.top = (e.clientY - r.top - size / 2) + 'px';
      host.appendChild(s);
      setTimeout(function () { s.remove(); }, 620);
    });
  }

  /* ============================== 平滑锚点滚动 ============================== */
  function smoothScroll() {
    document.addEventListener('click', function (e) {
      var a = e.target.closest && e.target.closest('a[href^="#"]');
      if (!a) return;
      var id = a.getAttribute('href');
      if (id.length < 2) return;
      var tgt = document.querySelector(id);
      if (!tgt) return;
      e.preventDefault();
      tgt.scrollIntoView({ behavior: REDUCED ? 'auto' : 'smooth', block: 'start' });
    });
  }

  global.FX = {
    REDUCED: REDUCED,
    add: add, fit: fit, pointer: pointer,
    starfield: starfield, aurora: aurora, matrixRain: matrixRain,
    network: network, warp: warp, globe: globe, petals: petals,
    fireworks: fireworks, bokeh: bokeh, rain: rain,
    scramble: scramble, typewriter: typewriter, reveal: reveal,
    counter: counter, magnetic: magnetic, cursor: cursor,
    konami: konami, palette: palette, toast: toast,
    confetti: confetti, ripple: ripple, smoothScroll: smoothScroll
  };
})(window);
