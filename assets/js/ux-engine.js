/* ============================================
   UX ENGINE - High-Performance Vanilla JS
   intersectionObserver, RAF, 3D Hover Math
   ============================================ */

document.addEventListener('DOMContentLoaded', () => {
    const reducedMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const finePointer = window.matchMedia && window.matchMedia('(pointer: fine)').matches;

    // 1. Scroll Progress Bar
    const progressBar = document.getElementById('scroll-progress');
    const updateScroll = () => {
        if (!progressBar) return;
        const s = window.scrollY;
        const h = document.documentElement.scrollHeight - window.innerHeight;
        if (h > 0) {
            progressBar.style.width = `${(s / h) * 100}%`;
        }
    };

    // Throttle scroll events via RequestAnimationFrame
    let scrollTicking = false;
    window.addEventListener('scroll', () => {
        if (!scrollTicking) {
            window.requestAnimationFrame(() => {
                updateScroll();
                scrollTicking = false;
            });
            scrollTicking = true;
        }
    });


    // 2. Intersection Observer for Scroll Reveals
    const revealElements = document.querySelectorAll('.data-reveal, .tech-stack, .reveal-on-scroll, .veille-source, .veille-step');
    if (reducedMotion) {
        revealElements.forEach((el) => {
            el.classList.add('is-visible');
            el.style.opacity = '1';
            el.style.transform = 'none';
        });
    }

    const revealOptions = {
        threshold: 0.15, // Trigger when 15% visible
        rootMargin: "0px 0px -50px 0px" // Trigger slightly before it hits bottom
    };

    if (!reducedMotion && 'IntersectionObserver' in window) {
        const revealObserver = new IntersectionObserver((entries, observer) => {
            entries.forEach((entry, index) => {
                if (entry.isIntersecting) {
                    const delay = Number(entry.target.dataset.revealDelay || 0) || (index * 45);
                    window.setTimeout(() => entry.target.classList.add('is-visible'), delay);
                    observer.unobserve(entry.target);
                }
            });
        }, revealOptions);

        revealElements.forEach(el => revealObserver.observe(el));
    }


    // 3. 3D Tilt Effect on Bento Cards (GPU Accelerated)
    const tiltElements = document.querySelectorAll('.data-tilt');
    if (!finePointer || reducedMotion) return;

    // Use bounds logic + requestAnimationFrame for buttery smoothness
    tiltElements.forEach(el => {
        let bounds;
        let reqId;

        const onMouseMove = (e) => {
            if (!bounds) return;

            const mouseX = e.clientX;
            const mouseY = e.clientY;
            const leftX = mouseX - bounds.x;
            const topY = mouseY - bounds.y;
            const center = {
                x: leftX - bounds.width / 2,
                y: topY - bounds.height / 2
            };

            // Math for tilt (adjust denominator for stronger/weaker tilt)
            const rotateX = (center.y / (bounds.height / 2)) * -5; // Max 5deg
            const rotateY = (center.x / (bounds.width / 2)) * 5;   // Max 5deg

            el.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(1.02, 1.02, 1.02)`;
        };

        el.addEventListener('mouseenter', () => {
            bounds = el.getBoundingClientRect();
            el.classList.remove('resetting');
        });

        el.addEventListener('mousemove', (e) => {
            // Clear previous raf if exists
            if (reqId) cancelAnimationFrame(reqId);
            reqId = requestAnimationFrame(() => onMouseMove(e));
        });

        el.addEventListener('mouseleave', () => {
            if (reqId) cancelAnimationFrame(reqId);
            el.classList.add('resetting');
            el.style.transform = `perspective(1000px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)`;

            // Remove transitioning class after animation finishes (0.6s as defined in CSS)
            setTimeout(() => el.classList.remove('resetting'), 600);
        });

        // Handle scroll resizing bounds
        window.addEventListener('scroll', () => { bounds = null; }, { passive: true });
        window.addEventListener('resize', () => { bounds = null; }, { passive: true });
    });

    // 4. Hero Parallax Orb Effect
    const orb = document.getElementById('hero-orb');
    if (orb && finePointer && !reducedMotion) {
        window.addEventListener('mousemove', (e) => {
            window.requestAnimationFrame(() => {
                const x = (e.clientX / window.innerWidth - 0.5) * 40; // Max 40px shift
                const y = (e.clientY / window.innerHeight - 0.5) * 40;
                orb.style.transform = `translate(calc(-50% + ${x}px), calc(-50% + ${y}px))`;
            });
        }, { passive: true });
    }

});
