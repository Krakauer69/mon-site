/* ============================================
   PARTICLES V2 - Refined Performance Engine
   Calm motion, theme-aware colors, DPR safe
   ============================================ */

document.addEventListener('DOMContentLoaded', () => {
    const canvas = document.getElementById('particle-canvas');
    const reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!canvas || reduceMotion) return;

    const ctx = canvas.getContext('2d', { alpha: true, desynchronized: true });
    if (!ctx) return;

    let width = 0;
    let height = 0;
    let dpr = 1;
    let particles = [];
    let isVisible = !document.hidden;

    const getParticleCount = () => {
        const isMobile = window.innerWidth < 768;
        return isMobile ? 26 : 48;
    };

    const resizeRaw = () => {
        width = window.innerWidth;
        height = window.innerHeight;
        dpr = Math.min(window.devicePixelRatio || 1, 1.8);

        canvas.width = Math.floor(width * dpr);
        canvas.height = Math.floor(height * dpr);
        canvas.style.width = `${width}px`;
        canvas.style.height = `${height}px`;
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

        initParticles();
    };

    let resizeTimer = 0;
    const resize = () => {
        window.clearTimeout(resizeTimer);
        resizeTimer = window.setTimeout(resizeRaw, 160);
    };

    window.addEventListener('resize', resize, { passive: true });

    class Particle {
        constructor() {
            this.reset();
        }

        reset() {
            this.x = Math.random() * width;
            this.y = Math.random() * height;
            this.size = Math.random() * 1.35 + 0.55;
            this.speedX = (Math.random() - 0.5) * 0.28;
            this.speedY = (Math.random() - 0.5) * 0.28;
            this.opacity = Math.random() * 0.36 + 0.08;
        }

        update() {
            this.x += this.speedX;
            this.y += this.speedY;

            if (this.x > width || this.x < 0 || this.y > height || this.y < 0) {
                this.reset();
            }
        }

        draw() {
            const isDark = document.documentElement.getAttribute('data-theme') !== 'light';
            ctx.fillStyle = isDark
                ? `rgba(118, 150, 255, ${this.opacity})`
                : `rgba(92, 108, 190, ${this.opacity * 0.88})`;
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    function initParticles() {
        const particleCount = getParticleCount();
        particles = Array.from({ length: particleCount }, () => new Particle());
    }

    function drawConnections() {
        if (window.innerWidth < 768) return;

        const isDark = document.documentElement.getAttribute('data-theme') !== 'light';
        const maxDistance = 10000;

        for (let i = 0; i < particles.length; i++) {
            for (let j = i + 1; j < particles.length; j++) {
                const dx = particles[i].x - particles[j].x;
                const dy = particles[i].y - particles[j].y;
                const distance = dx * dx + dy * dy;

                if (distance < maxDistance) {
                    const opacity = 1 - (distance / maxDistance);
                    ctx.strokeStyle = isDark
                        ? `rgba(96, 146, 255, ${opacity * 0.14})`
                        : `rgba(98, 118, 190, ${opacity * 0.11})`;
                    ctx.lineWidth = 0.5;
                    ctx.beginPath();
                    ctx.moveTo(particles[i].x, particles[i].y);
                    ctx.lineTo(particles[j].x, particles[j].y);
                    ctx.stroke();
                }
            }
        }
    }

    const observer = new IntersectionObserver((entries) => {
        isVisible = entries[0]?.isIntersecting && !document.hidden;
    }, { threshold: 0 });

    observer.observe(canvas);
    document.addEventListener('visibilitychange', () => {
        isVisible = !document.hidden;
    });

    function animate() {
        if (isVisible) {
            ctx.clearRect(0, 0, width, height);

            for (let i = 0; i < particles.length; i++) {
                particles[i].update();
                particles[i].draw();
            }

            drawConnections();
        }

        requestAnimationFrame(animate);
    }

    resizeRaw();
    animate();
});
