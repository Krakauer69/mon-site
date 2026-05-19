/* ============================================
   ULTRA EFFECTS JS v2.0
   Refined motion layer, guardrails included
   ============================================ */

document.addEventListener('DOMContentLoaded', () => {
    const reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const finePointer = window.matchMedia && window.matchMedia('(pointer: fine)').matches;

    initScrollProgress();
    if (!reduceMotion) {
        initTypingEffect();
        initCounters();
        initRevealAnimations();
    }
    if (!reduceMotion && finePointer) {
        initSpotlight();
        initMagneticButtons();
    }
    initSkillBars();
});

function initScrollProgress() {
    if (document.querySelector('.scroll-progress')) return;

    const progressBar = document.createElement('div');
    progressBar.className = 'scroll-progress';
    document.body.appendChild(progressBar);

    let rafId = 0;
    const update = () => {
        const scrollTop = window.scrollY;
        const docHeight = document.documentElement.scrollHeight - window.innerHeight;
        const progress = docHeight > 0 ? (scrollTop / docHeight) * 100 : 0;
        progressBar.style.width = `${progress}%`;
        rafId = 0;
    };

    const schedule = () => {
        if (rafId) return;
        rafId = requestAnimationFrame(update);
    };

    update();
    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', schedule, { passive: true });
}

function initTypingEffect() {
    const elements = document.querySelectorAll('[data-typing]:not([data-typing-ready])');

    elements.forEach((el) => {
        const text = el.getAttribute('data-typing') || el.textContent || '';
        const speed = parseInt(el.getAttribute('data-typing-speed') || '46', 10);
        const delay = parseInt(el.getAttribute('data-typing-delay') || '0', 10);

        el.textContent = '';
        el.style.visibility = 'visible';
        el.setAttribute('data-typing-ready', 'true');

        const cursor = document.createElement('span');
        cursor.className = 'typing-cursor';
        el.appendChild(cursor);

        let index = 0;
        window.setTimeout(() => {
            const typeInterval = window.setInterval(() => {
                if (index < text.length) {
                    el.insertBefore(document.createTextNode(text.charAt(index)), cursor);
                    index += 1;
                } else {
                    window.clearInterval(typeInterval);
                    window.setTimeout(() => {
                        cursor.style.opacity = '0';
                    }, 1800);
                }
            }, speed);
        }, delay);
    });
}

function initSkillBars() {
    const skillBars = document.querySelectorAll('.skill-progress');
    if (!skillBars.length) return;

    const observer = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
            if (!entry.isIntersecting) return;
            const bar = entry.target;
            const percent = bar.getAttribute('data-percent') || '80';
            bar.style.width = `${percent}%`;
            observer.unobserve(bar);
        });
    }, { threshold: 0.3 });

    skillBars.forEach((bar) => observer.observe(bar));
}

function initCounters() {
    const counters = document.querySelectorAll('[data-counter]');
    if (!counters.length) return;

    const observer = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
            if (!entry.isIntersecting) return;
            const counter = entry.target;
            const target = parseInt(counter.getAttribute('data-counter') || '0', 10);
            const duration = parseInt(counter.getAttribute('data-duration') || '1400', 10);
            const suffix = counter.getAttribute('data-suffix') || '';
            const prefix = counter.getAttribute('data-prefix') || '';
            animateCounter(counter, target, duration, prefix, suffix);
            observer.unobserve(counter);
        });
    }, { threshold: 0.4 });

    counters.forEach((counter) => observer.observe(counter));
}

function animateCounter(element, target, duration, prefix, suffix) {
    const startTime = performance.now();
    const start = 0;

    const tick = (now) => {
        const progress = Math.min((now - startTime) / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3);
        const value = Math.round(start + (target - start) * eased);
        element.textContent = `${prefix}${value}${suffix}`;
        if (progress < 1) requestAnimationFrame(tick);
    };

    requestAnimationFrame(tick);
}

function initSpotlight() {
    if (document.querySelector('.spotlight')) return;
    const spotlight = document.createElement('div');
    spotlight.className = 'spotlight';
    document.body.appendChild(spotlight);

    let rafId = 0;
    let x = 0;
    let y = 0;

    document.addEventListener('mousemove', (e) => {
        x = e.clientX;
        y = e.clientY;
        if (rafId) return;
        rafId = requestAnimationFrame(() => {
            spotlight.style.left = `${x}px`;
            spotlight.style.top = `${y}px`;
            rafId = 0;
        });
    }, { passive: true });
}

function initMagneticButtons() {
    const buttons = document.querySelectorAll('.btn-magnetic, .btn-primary, .btn-secondary');

    buttons.forEach((btn) => {
        btn.addEventListener('mousemove', (e) => {
            const rect = btn.getBoundingClientRect();
            const x = e.clientX - rect.left - rect.width / 2;
            const y = e.clientY - rect.top - rect.height / 2;
            btn.style.transform = `translate(${x * 0.12}px, ${y * 0.12}px)`;
        }, { passive: true });

        btn.addEventListener('mouseleave', () => {
            btn.style.transform = 'translate(0, 0)';
        }, { passive: true });
    });
}

function initRevealAnimations() {
    const reveals = document.querySelectorAll('.reveal-bottom');
    if (!reveals.length) return;

    const observer = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
                observer.unobserve(entry.target);
            }
        });
    }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });

    reveals.forEach((el) => observer.observe(el));
}
