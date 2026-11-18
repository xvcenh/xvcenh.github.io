"use strict";

(() => {
  const hero = document.querySelector(".hero");
  const figure = hero.querySelector(".machine");
  const sky = hero.querySelector(".night-sky");
  const object = hero.querySelector("#star-object");
  const skyCtx = sky.getContext("2d");
  const ctx = object.getContext("2d");
  if (!skyCtx || !ctx) return;

  const switcher = figure.querySelector(".scene-switch");
  const caption = figure.querySelector("#scene-caption");
  const pause = figure.querySelector(".motion-toggle");
  const reduced = matchMedia("(prefers-reduced-motion: reduce)");
  const captions = {orbit: "PARTICLE ORBIT", type: "STELLAR TYPE", crt: "CRT WORKSTATION"};
  const names = {orbit: "星尘组成的行星与轨道环，拖动可旋转", type: "星尘聚合成 XVCENH 字样"};
  let mode = "orbit";
  let targetMorph = 0;
  let morph = 0;
  let stopped = reduced.matches;
  let visible = true;
  let frame = 0;
  let previous = 0;
  let time = 0;
  let drag = null;
  let rotation = 0;
  let tilt = 0;
  let pointerX = 0;
  let pointerY = 0;
  let seed = 731;
  let skySize, stage, stars, planet, rings, letters;

  // Shade a sphere once. The animated tracers and rings run independently of this texture.
  function gasGiant() {
    const texture = document.createElement("canvas");
    texture.width = texture.height = 480;
    const brush = texture.getContext("2d");
    const pixels = brush.createImageData(480, 480);
    for (let y = 0; y < 480; y++) {
      for (let x = 0; x < 480; x++) {
        const nx = (x - 239.5) / 239, ny = (y - 239.5) / 239;
        const depth = 1 - nx*nx - ny*ny;
        if (depth <= 0) continue;
        const nz = Math.sqrt(depth);
        const latitude = ny * .93 + nx * .22 + nz * .15;
        const longitude = Math.atan2(nx, nz);
        const turbulence = Math.sin(longitude*6+latitude*12)*.7 + Math.sin(longitude*13-latitude*18)*.24;
        const band = .5 + .5*Math.sin(latitude*21 + turbulence);
        const fine = Math.sin(latitude*130 + turbulence*3)*4 + Math.sin(latitude*82-turbulence)*3;
        const golden = Math.max(0,Math.sin(latitude*12-1.3))**2;
        const light = Math.max(0, -.69*nx - .46*ny + .46*nz);
        const shade = .19 + .94*Math.pow(light,.72);
        const rim = Math.pow(1-nz,5)*(.35+light)*90;
        const i = (y*480+x)*4;
        pixels.data[i] = (49 + 40*band + 68*golden + fine)*shade + rim;
        pixels.data[i+1] = (114 + 30*band + 22*golden + fine)*shade + rim;
        pixels.data[i+2] = (125 + 30*band - 24*golden + fine)*shade + rim;
        pixels.data[i+3] = Math.min(255, depth*32000);
      }
    }
    brush.putImageData(pixels,0,0);
    return texture;
  }
  const surface = gasGiant();

  function random() {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  }
  function fit(canvas, context) {
    const {width, height} = canvas.getBoundingClientRect();
    const ratio = Math.min(devicePixelRatio || 1, 2);
    canvas.width = Math.max(1, Math.round(width * ratio));
    canvas.height = Math.max(1, Math.round(height * ratio));
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
    return {width, height};
  }
  function labelPoints() {
    const stencil = document.createElement("canvas");
    stencil.width = 420;
    stencil.height = 105;
    const ink = stencil.getContext("2d", {willReadFrequently: true});
    ink.font = "bold 90px monospace";
    ink.textAlign = "center";
    ink.fillText("XVCENH", 210, 80);
    const pixels = ink.getImageData(0, 0, 420, 105).data;
    const dots = [];
    for (let y = 10; y < 88; y += 3) {
      for (let x = 40; x < 380; x += 3) {
        if (pixels[(y * 420 + x) * 4 + 3] > 64) dots.push([(x - 210) / 162, (y - 47) / 162]);
      }
    }
    return dots;
  }
  function resize() {
    skySize = fit(sky, skyCtx);
    stage = fit(object, ctx);
    const compact = skySize.width < 680;
    seed = 731;
    stars = Array.from({length: compact ? 85 : 220}, () => ({
      x: random(), y: random(), size: .45 + random() ** 3 * 1.35, phase: random() * 6.28, depth: random()
    }));
    const count = compact ? 1050 : 2350;
    planet = Array.from({length: count}, (_, i) => {
      const y = (i + .5) / count * 2 - 1;
      const radius = Math.sqrt(1 - y * y);
      const angle = i * 2.399963;
      const texture = Math.sin(y * 25 + Math.sin(angle * 2) * .9);
      return {x: radius * Math.cos(angle), y, z: radius * Math.sin(angle), size: .45 + random() * .7, tone: texture > .56 ? 1 : random() > .84 ? 2 : 0};
    });
    rings = Array.from({length: compact ? 900 : 2100}, () => {
      const band = random();
      const r = band < .57 ? 1.40 + random() * .14 : band < .82 ? 1.57 + random() * .085 : 1.73 + random() * .085;
      const angle = random() * 2 * Math.PI;
      return {r, angle, size: .45 + random() * .72, tone: random()};
    });
    letters = labelPoints();
    draw();
  }

  function drawSky() {
    const {width, height} = skySize;
    skyCtx.clearRect(0, 0, width, height);
    for (const star of stars) {
      const x = (star.x * width + pointerX * star.depth * 8 + time * star.depth * 1.1 + width) % width;
      const y = (star.y * height + pointerY * star.depth * 6 + height) % height;
      skyCtx.globalAlpha = (.45 + .40 * (.5 + .5 * Math.sin(time * .7 + star.phase))) * (x < width * .45 ? .65 : 1);
      skyCtx.fillStyle = star.depth > .72 ? "#b8ebff" : "#effae3";
      skyCtx.fillRect(x, y, star.size, star.size);
      if (star.size > 1.66) {
        skyCtx.globalAlpha *= .46;
        skyCtx.fillRect(x - 2.1, y + .5, 6, .7);
        skyCtx.fillRect(x + .55, y - 2.15, .7, 6);
      }
    }
    skyCtx.globalAlpha = 1;
    const phase = time % 8.5;
    if (phase > 1.35 || stopped) return;
    const startX = width * .68 + phase * width * .18, startY = height * .08 + phase * height * .24;
    const tail = skyCtx.createLinearGradient(startX - 55, startY - 21, startX, startY);
    tail.addColorStop(0, "transparent");
    tail.addColorStop(1, "rgba(207,246,225," + Math.sin(phase / 1.35 * Math.PI) * .74 + ")");
    skyCtx.strokeStyle = tail;
    skyCtx.beginPath(); skyCtx.moveTo(startX - 55, startY - 21); skyCtx.lineTo(startX, startY); skyCtx.stroke();
  }

  function drawObject() {
    const {width, height} = stage;
    ctx.clearRect(0, 0, width, height);
    if (mode === "crt" || !width) return;
    const radius = Math.min(width * .26, height * .35);
    const labelScale = Math.min(width * .47, height * .95);
    const cx = width / 2, cy = height * .54;
    const yaw = time * .12 + rotation + pointerX * .08;
    const pitch = -.12 + tilt + pointerY * .035;
    const sinY = Math.sin(yaw), cosY = Math.cos(yaw);
    const sinP = Math.sin(pitch), cosP = Math.cos(pitch);
    const axis = -.29, sinA = Math.sin(axis), cosA = Math.cos(axis);
    const inverse = 1 - morph;
    function ring(front) {
      if (inverse < .005) return;
      const incline = .30 + tilt * .40;
      const phase = time * .043 + rotation * .32;
      ctx.save();
      ctx.translate(cx,cy); ctx.rotate(axis); ctx.scale(1,incline || .001);
      for (const [r,thickness,color] of [[1.42,.11,"#b7a77d"],[1.53,.034,"#e6cba1"],[1.62,.067,"#b5b7a3"],[1.76,.04,"#91bab8"]]) {
        ctx.globalAlpha = inverse*(front ? .49 : .28);
        ctx.strokeStyle = color; ctx.lineWidth = radius*thickness;
        ctx.beginPath();ctx.arc(0,0,r*radius,front?0:Math.PI,front?Math.PI:Math.PI*2);ctx.stroke();
      }
      ctx.restore();
      for (const particle of rings) {
        const a = particle.angle + phase;
        const depth = Math.sin(a);
        if ((depth > 0) !== front) continue;
        const rx = Math.cos(a) * particle.r, ry = depth * incline * particle.r;
        const x = (rx * cosA - ry * sinA) * radius + cx;
        const y = (rx * sinA + ry * cosA) * radius + cy;
        const size = particle.size * (width < 370 ? .9 : 1.14);
        ctx.globalAlpha = inverse * (.38 + .58 * particle.tone);
        ctx.fillStyle = particle.tone > .66 ? "#f2e4a5" : particle.tone > .23 ? "#b0d9c6" : "#73abad";
        ctx.fillRect(x,y,size,size);
      }
    }
    ring(false);
    if (inverse > .005) {
      const atmosphere = ctx.createRadialGradient(cx-radius*.28,cy-radius*.44,0,cx,cy,radius*1.20);
      atmosphere.addColorStop(0,"#172f31"); atmosphere.addColorStop(.82,"#24464f");
      atmosphere.addColorStop(.85,"#8bcac42b"); atmosphere.addColorStop(1,"transparent");
      ctx.globalAlpha = inverse;
      ctx.fillStyle = atmosphere;
      ctx.beginPath(); ctx.arc(cx,cy,radius*1.2,0,Math.PI*2); ctx.fill();
      ctx.drawImage(surface,cx-radius,cy-radius,radius*2,radius*2);
    }
    for (let i = 0; i < planet.length; i++) {
      const p = planet[i];
      const rx = p.x * cosY + p.z * sinY;
      const rz = p.z * cosY - p.x * sinY;
      const ry = p.y * cosP - rz * sinP;
      const depth = rz * cosP + p.y * sinP;
      if (depth < 0 && morph < .001) continue;
      const dest = letters[i % letters.length];
      const spread = Math.sin(morph * Math.PI);
      const x = cx + (rx*cosA - ry*sinA)*radius*inverse + dest[0]*labelScale*morph + p.z*radius*spread*.43;
      const y = cy + (rx*sinA + ry*cosA)*radius*inverse + dest[1]*labelScale*morph + p.x*radius*spread*.25;
      const light = Math.min(1,Math.max(.16,.48 - rx*.26 - ry*.30 + depth*.31));
      ctx.globalAlpha = Math.max(0, depth < 0 ? morph * .7 : light * inverse * .52 + .92*morph);
      ctx.fillStyle = p.tone === 1 ? "#d2f0bc" : p.tone === 2 ? "#f4e6b4" : "#7cbcc7";
      const sz = p.size * (1.28 + morph*.65) * (width < 370 ? .85 : 1);
      ctx.fillRect(x,y,sz,sz);
    }
    ctx.globalAlpha = 1;
    ring(true);
    ctx.globalAlpha = 1;
  }
  function draw() { drawSky(); drawObject(); }
  function tick(timestamp) {
    frame = 0;
    if (stopped || !visible || document.hidden) return;
    if (!previous || timestamp - previous >= 32) {
      const dt = previous ? Math.min((timestamp - previous)/1000, .08) : 0;
      previous = timestamp;
      time += dt;
      morph += (targetMorph - morph) * Math.min(1, dt * 5);
      if (Math.abs(morph - targetMorph) < .001) morph = targetMorph;
      draw();
    }
    frame = requestAnimationFrame(tick);
  }
  function playback() {
    cancelAnimationFrame(frame);
    previous = 0;
    pause.textContent = stopped ? "播放" : "暂停";
    pause.setAttribute("aria-pressed", String(stopped));
    if (!stopped && visible && !document.hidden) frame = requestAnimationFrame(tick);
  }
  function select(scene) {
    mode = scene;
    targetMorph = scene === "type" ? 1 : 0;
    if (stopped) morph = targetMorph;
    figure.dataset.scene = scene;
    object.setAttribute("aria-label", names[scene] || "复古工作站");
    caption.textContent = captions[scene];
    for (const button of switcher.children) button.setAttribute("aria-pressed", String(button.dataset.scene === scene));
    draw();
  }

  object.hidden = false;
  switcher.hidden = false;
  pause.hidden = false;
  resize();
  select(mode);
  switcher.addEventListener("click", event => { if (event.target.dataset.scene) select(event.target.dataset.scene); });
  pause.addEventListener("click", () => { stopped = !stopped; morph = targetMorph; draw(); playback(); });
  reduced.addEventListener("change", () => { stopped = reduced.matches; morph = targetMorph; draw(); playback(); });
  new ResizeObserver(resize).observe(hero);
  new IntersectionObserver(entries => { visible = entries[0].isIntersecting; playback(); }).observe(hero);
  document.addEventListener("visibilitychange", playback);
  hero.addEventListener("pointermove", event => {
    if (stopped || event.pointerType === "touch") return;
    const box = hero.getBoundingClientRect();
    pointerX = (event.clientX - box.left) / box.width - .5;
    pointerY = (event.clientY - box.top) / box.height - .5;
  });
  object.addEventListener("pointerdown", event => {
    if (mode !== "orbit") return;
    drag = {x:event.clientX, y:event.clientY, rotation, tilt};
    object.setPointerCapture(event.pointerId);
  });
  object.addEventListener("pointermove", event => {
    if (!drag) return;
    rotation = drag.rotation + (event.clientX - drag.x)*.014;
    tilt = Math.max(-.85, Math.min(.85, drag.tilt + (event.clientY - drag.y)*.006));
    if (stopped) draw();
  });
  object.addEventListener("lostpointercapture", () => { drag = null; });
  playback();
})();
