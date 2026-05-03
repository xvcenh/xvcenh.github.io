    (function() {
        // 星空粒子系统
        (function() {
            const c = document.querySelector('.stars-bg');
            if (!c || c.tagName !== 'CANVAS') return;
            const ctx = c.getContext('2d');
            const stars = [];
            let w, h;
            function resize() {
                w = c.width = window.innerWidth; h = c.height = window.innerHeight;
            }
            resize();
            for (let i = 0; i < 80; i++) {
                stars.push({
                    x: Math.random() * w, y: Math.random() * h,
                    r: 0.3 + Math.random() * 1.2,
                    vx: (Math.random() - 0.5) * 0.15,
                    vy: (Math.random() - 0.5) * 0.15,
                    a: 0.2 + Math.random() * 0.5,
                    blink: Math.random() * Math.PI * 2
                });
            }
            window.addEventListener('resize', resize);
            function draw() {
                ctx.clearRect(0, 0, w, h);
                for (const s of stars) {
                    s.x += s.vx; s.y += s.vy;
                    if (s.x < 0) s.x = w; if (s.x > w) s.x = 0;
                    if (s.y < 0) s.y = h; if (s.y > h) s.y = 0;
                    const blink = s.a + Math.sin(Date.now() * 0.001 + s.blink) * 0.2;
                    ctx.fillStyle = `rgba(200,220,255,${Math.max(0.1, blink)})`;
                    ctx.beginPath();
                    ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
                    ctx.fill();
                }
                requestAnimationFrame(draw);
            }
            draw();
        })();

        const contentSection = document.getElementById('content-section');
        if (!contentSection) return;
        const cards = document.querySelectorAll('#content-section .post-card');
        if (!cards.length) return;

        // 卡片入场动画 - 逐个延迟显现
        const observer = new IntersectionObserver((entries) => {
            entries.forEach((entry) => {
                if (entry.isIntersecting) {
                    const el = entry.target;
                    const idx = parseInt(el.dataset.index) || 0;
                    setTimeout(() => el.classList.add('visible'), idx * 60);
                    observer.unobserve(el);
                }
            });
        }, { threshold: 0.1, rootMargin: '0px 0px -20px 0px' });

        cards.forEach((card, i) => {
            card.dataset.index = i;
            observer.observe(card);
        });

        // 3D 倾斜
        let tiltedCard = null;

        contentSection.addEventListener('mousemove', (e) => {
            const card = e.target.closest('.post-card');
            if (!card || !card.classList.contains('visible')) {
                if (tiltedCard) {
                    tiltedCard.style.transform = 'translateY(0) rotateX(0) rotateY(0)';
                    tiltedCard = null;
                }
                return;
            }
            if (tiltedCard && tiltedCard !== card) {
                tiltedCard.style.transform = 'translateY(0) rotateX(0) rotateY(0)';
            }
            tiltedCard = card;
            const r = card.getBoundingClientRect();
            const x = (e.clientX - r.left) / r.width - 0.5;
            const y = (e.clientY - r.top) / r.height - 0.5;
            card.style.transform = `translateY(0) rotateX(${y * -6}deg) rotateY(${x * 8}deg)`;
        });

        contentSection.addEventListener('mouseleave', () => {
            if (tiltedCard) {
                tiltedCard.style.transform = 'translateY(0) rotateX(0) rotateY(0)';
                tiltedCard = null;
            }
        });
    })();