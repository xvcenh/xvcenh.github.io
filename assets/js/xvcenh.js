    (function() {
        const canvas = document.getElementById('xvcenh-canvas');
        const ctx = canvas.getContext('2d');

        let W, H, centerX, centerY;

        function resize() {
            W = window.innerWidth;
            H = window.innerHeight;
            centerX = W / 2;
            centerY = H / 2;
            canvas.width = W;
            canvas.height = H;
        }
        resize();
        window.addEventListener('resize', () => { resize(); rebuildAll(); });

        const neonColors = [
            { hex: '#00e5ff', h: 192, s: 100, l: 50 },
            { hex: '#40c4ff', h: 200, s: 100, l: 62 },
            { hex: '#7c4dff', h: 260, s: 100, l: 65 },
            { hex: '#e040fb', h: 290, s: 90, l: 62 },
            { hex: '#ff4081', h: 340, s: 100, l: 62 },
            { hex: '#ff6e40', h: 16, s: 100, l: 62 },
            { hex: '#ffab00', h: 40, s: 100, l: 50 },
            { hex: '#00e676', h: 150, s: 100, l: 45 },
        ];

        function lerpHue(h1, h2, t) {
            let dh = h2 - h1; if (dh > 180) dh -= 360; if (dh < -180) dh += 360;
            return (h1 + dh * t + 360) % 360;
        }
        function getColor(frac) {
            const stops = [
                { pos: 0.0, c: neonColors[0] }, { pos: 0.3, c: neonColors[2] },
                { pos: 0.55, c: neonColors[3] }, { pos: 0.8, c: neonColors[5] },
                { pos: 1.0, c: neonColors[6] },
            ];
            let lo = stops[0], hi = stops[stops.length - 1];
            for (let i = 0; i < stops.length - 1; i++) {
                if (frac >= stops[i].pos && frac <= stops[i + 1].pos) { lo = stops[i]; hi = stops[i + 1]; break; }
            }
            const range = hi.pos - lo.pos, t = range ? Math.min(1, Math.max(0, (frac - lo.pos) / range)) : 0;
            const h = lerpHue(lo.c.h, hi.c.h, t), s = lo.c.s + (hi.c.s - lo.c.s) * t, l = lo.c.l + (hi.c.l - lo.c.l) * t;
            return `hsl(${h}, ${s}%, ${l}%)`;
        }

        function defineLetterComponents() {
            return {
                'X': [{ dx: 0, dy: 0, w: 0.18, h: 1.08, angle: 45, round: 10 }, { dx: 0, dy: 0, w: 0.18, h: 1.08, angle: -45, round: 10 }],
                'V': [{ dx: -0.18, dy: 0.05, w: 0.18, h: 1.1, angle: -22, round: 8 }, { dx: 0.18, dy: 0.05, w: 0.18, h: 1.1, angle: 22, round: 8 }],
                'C': [{ dx: -0.38, dy: 0, w: 0.16, h: 0.85, angle: 0, round: 8 }, { dx: 0, dy: -0.38, w: 0.65, h: 0.16, angle: 0, round: 8 }, { dx: 0, dy: 0.38, w: 0.65, h: 0.16, angle: 0, round: 8 }],
                'E': [{ dx: -0.42, dy: 0, w: 0.16, h: 1.0, angle: 0, round: 6 }, { dx: 0.05, dy: -0.42, w: 0.7, h: 0.16, angle: 0, round: 6 }, { dx: 0, dy: 0, w: 0.6, h: 0.16, angle: 0, round: 6 }, { dx: 0.05, dy: 0.42, w: 0.7, h: 0.16, angle: 0, round: 6 }],
                'N': [{ dx: 0, dy: 0, w: 0.18, h: 1.12, angle: 57, round: 6 }, { dx: -0.42, dy: 0, w: 0.18, h: 1.0, angle: 0, round: 6 }, { dx: 0.42, dy: 0, w: 0.18, h: 1.0, angle: 0, round: 6 }],
                'H': [{ dx: -0.4, dy: 0, w: 0.16, h: 1.0, angle: 0, round: 8 }, { dx: 0.4, dy: 0, w: 0.16, h: 1.0, angle: 0, round: 8 }, { dx: 0, dy: 0, w: 0.8, h: 0.24, angle: 0, round: 8 }],
            };
        }

        let allParts = [], rawTargets = [];

        function computeAllTargets(letterSet) {
            const baseHeight = Math.min(H * 0.38, W * 0.09);
            const spacing = baseHeight * 0.15;
            const widthCoeff = { X: 1.0, V: 0.95, C: 1.0, E: 1.05, N: 1.05, H: 1.0 };
            const letters = ['X', 'V', 'C', 'E', 'N', 'H'];
            const letterWidthArr = letters.map(l => widthCoeff[l] * baseHeight);
            const totalWidth = letterWidthArr.reduce((a, b) => a + b, 0) + spacing * (letters.length - 1);
            let currentX = centerX - totalWidth / 2;
            const parts = [];
            letters.forEach((letter, idx) => {
                const components = letterSet[letter];
                const letterW = letterWidthArr[idx], letterH = baseHeight;
                const letterCenterX = currentX + letterW / 2, letterCenterY = centerY;
                const letterFrac = idx / (letters.length - 1);
                components.forEach(comp => {
                    parts.push({
                        letter, color: getColor(letterFrac),
                        targetX: letterCenterX + comp.dx * letterW, targetY: letterCenterY + comp.dy * letterH,
                        w: comp.w * letterW, h: comp.h * letterH,
                        angle: comp.angle * Math.PI / 180, round: comp.round || 6,
                    });
                });
                currentX += letterW + spacing;
            });
            return parts;
        }

        class PartParticle {
            constructor(target) {
                this.tx = target.targetX; this.ty = target.targetY;
                this.tw = target.w; this.th = target.h; this.tAngle = target.angle;
                this.color = target.color; this.round = target.round;
                this.cx = Math.random() * W; this.cy = Math.random() * H;
                this.vx = 0; this.vy = 0;
                this.w = this.tw * (0.9 + Math.random() * 0.2); this.h = this.th * (0.9 + Math.random() * 0.2);
                this.angle = Math.random() * Math.PI * 2;
                this.rotationSpeed = (Math.random() - 0.5) * 0.06;
                this.spring = 0.018 + Math.random() * 0.03;
                this.damping = 0.82 + Math.random() * 0.1;
                this.alpha = 0.9 + Math.random() * 0.1;
            }
            setScatterTarget() {
                const r = Math.random();
                if (r < 0.15) { this.tx = -80 - Math.random() * 200; this.ty = Math.random() * H; }
                else if (r < 0.3) { this.tx = W + 80 + Math.random() * 200; this.ty = Math.random() * H; }
                else if (r < 0.45) { this.tx = Math.random() * W; this.ty = -80 - Math.random() * 200; }
                else if (r < 0.6) { this.tx = Math.random() * W; this.ty = H + 80 + Math.random() * 200; }
                else { this.tx = (Math.random() - 0.5) * W * 1.3 + centerX; this.ty = (Math.random() - 0.5) * H * 1.3 + centerY; }
            }
            update(dt, globalTime, isConverged) {
                const dx = this.tx - this.cx, dy = this.ty - this.cy;
                this.vx += dx * this.spring * dt * 60; this.vy += dy * this.spring * dt * 60;
                this.vx *= this.damping; this.vy *= this.damping;
                this.cx += this.vx * dt * 60; this.cy += this.vy * dt * 60;
                const dist = Math.sqrt(dx * dx + dy * dy);
                if (isConverged && dist < 6) {
                    this.angle += (this.tAngle - this.angle) * 0.12;
                    this.rotationSpeed *= 0.9;
                } else { this.angle += this.rotationSpeed * dt * 60; }
                this.w += (this.tw - this.w) * 0.15; this.h += (this.th - this.h) * 0.15;
            }
            draw(ctx) {
                ctx.save();
                ctx.globalAlpha = this.alpha;
                ctx.shadowColor = this.color; ctx.shadowBlur = 8;
                ctx.fillStyle = this.color;
                ctx.translate(this.cx, this.cy); ctx.rotate(this.angle);
                const hw = this.w / 2, hh = this.h / 2, r = Math.min(this.round, Math.min(hw, hh) * 0.5);
                ctx.beginPath();
                if (r > 0) {
                    ctx.moveTo(-hw + r, -hh); ctx.lineTo(hw - r, -hh);
                    ctx.quadraticCurveTo(hw, -hh, hw, -hh + r); ctx.lineTo(hw, hh - r);
                    ctx.quadraticCurveTo(hw, hh, hw - r, hh); ctx.lineTo(-hw + r, hh);
                    ctx.quadraticCurveTo(-hw, hh, -hw, hh - r); ctx.lineTo(-hw, -hh + r);
                    ctx.quadraticCurveTo(-hw, -hh, -hw + r, -hh);
                } else { ctx.rect(-hw, -hh, this.w, this.h); }
                ctx.closePath(); ctx.fill();
                ctx.shadowBlur = 0;
                ctx.restore();
            }
        }

        let particles = [], isConverged = false, stateTimer = 0;
        const CONV_TIME = 10.0, SCAT_TIME = 2.0;
        let globalTime = 0;

        function createParticles() {
            const letterSet = defineLetterComponents();
            const targets = computeAllTargets(letterSet);
            rawTargets = targets.map(t => ({ tx: t.targetX, ty: t.targetY }));
            particles = targets.map(t => {
                const p = new PartParticle(t);
                p.setScatterTarget(); p.cx = p.tx; p.cy = p.ty;
                return p;
            });
        }

        function toggle() {
            isConverged = !isConverged;
            stateTimer = 0;
            if (isConverged) {
                rawTargets.forEach((t, i) => { if (particles[i]) { particles[i].tx = t.tx; particles[i].ty = t.ty; } });
                canvas.style.pointerEvents = 'none';
            } else {
                particles.forEach(p => p.setScatterTarget());
                canvas.style.pointerEvents = 'auto';
            }
        }
        function rebuildAll() {
            createParticles();
            if (!isConverged) particles.forEach(p => p.setScatterTarget());
            else rawTargets.forEach((t, i) => { if (particles[i]) { particles[i].tx = t.tx; particles[i].ty = t.ty; } });
        }

        let mouseX = -999, mouseY = -999, mouseActive = false;
        canvas.addEventListener('mousemove', e => {
            if (canvas.getBoundingClientRect().bottom < 0) return;
            mouseX = e.clientX; mouseY = e.clientY; mouseActive = true;
        });
        canvas.addEventListener('mouseleave', () => mouseActive = false);
        canvas.addEventListener('touchmove', e => {
            if (canvas.getBoundingClientRect().bottom < 0) return;
            if (e.touches[0]) { mouseX = e.touches[0].clientX; mouseY = e.touches[0].clientY; mouseActive = true; }
        }, { passive: true });
        canvas.addEventListener('touchend', () => mouseActive = false);
        canvas.addEventListener('click', (e) => {
            if (canvas.getBoundingClientRect().bottom < 0) return;
            e.stopPropagation(); toggle();
        });

        function drawConnections() {
            if (isConverged) return;
            const maxDist = 90;
            for (let i = 0; i < particles.length; i += 2) {
                for (let j = i + 2; j < particles.length; j += 2) {
                    const a = particles[i], b = particles[j];
                    const dx = a.cx - b.cx, dy = a.cy - b.cy, dist = Math.sqrt(dx*dx + dy*dy);
                    if (dist < maxDist) {
                        ctx.strokeStyle = `rgba(200,220,255,${0.12 * (1 - dist/maxDist)})`;
                        ctx.lineWidth = 0.6; ctx.beginPath();
                        ctx.moveTo(a.cx, a.cy); ctx.lineTo(b.cx, b.cy); ctx.stroke();
                    }
                }
            }
        }

        function animate(ts) {
            requestAnimationFrame(animate);
            const dt = Math.min(0.1, (ts - (animate.lastTs || ts)) / 1000);
            animate.lastTs = ts; globalTime += dt;

            stateTimer += dt;
            if (stateTimer > (isConverged ? CONV_TIME : SCAT_TIME)) toggle();

            for (const p of particles) p.update(dt, globalTime, isConverged);

            if (mouseActive) {
                const r = 130;
                for (const p of particles) {
                    const dx = p.cx - mouseX, dy = p.cy - mouseY, dist = Math.sqrt(dx*dx + dy*dy);
                    if (dist < r && dist > 1) {
                        const force = (1 - dist/r) * 0.5;
                        p.vx += (dx/dist) * force; p.vy += (dy/dist) * force;
                    }
                }
            }

            // 透明背景，让3D星系显示出来
            ctx.clearRect(0, 0, W, H);

            drawConnections();
            for (const p of particles) p.draw(ctx);
        }

        function init() {
            resize();
            createParticles();
            isConverged = false; stateTimer = 0;
            // 初始不拦截触摸，等1.5秒后toggle才启用交互
            canvas.style.pointerEvents = 'none';
            animate.lastTs = performance.now();
            requestAnimationFrame(animate);
            setTimeout(() => { if (!isConverged) toggle(); }, 1500);
        }

        window.addEventListener('keydown', e => {
            if (e.key === ' ' || e.code === 'Space') { e.preventDefault(); toggle(); }
        });

        init();
    })();