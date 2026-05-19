/* PREMIUM PORTFOLIO JS v4.0 */
document.addEventListener('DOMContentLoaded', () => {
  initTheme();
  initScrollProgressBar();
  initConstellationParticles();
  initScrollReveal();
  initPageEntrance();
  initHeroMicroMotion();
  initRippleEffects();
  initLightbox();
  initHeaderScroll();
  initCursorGlow();
  initScrollToTop();
  initVeilleSitewideRefresh();
});

function prefersReducedMotion() {
  return window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/* ===== THEME MANAGER v2.0 ===== */
function initTheme() {
  const buttons = [...document.querySelectorAll('[data-theme-toggle], #global-theme-toggle, .theme-toggle')];
  const html = document.documentElement;
  const media = window.matchMedia('(prefers-color-scheme: dark)');
  const storageKey = 'portfolio-theme';

  const getStoredPreference = () => {
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored === 'dark' || stored === 'light') return stored;
    } catch {}
    return null;
  };

  const resolveTheme = () => {
    const stored = getStoredPreference();
    return stored || (media.matches ? 'dark' : 'light');
  };

  const applyTheme = (theme, animate = false) => {
    if (animate && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      html.classList.add('theme-transition');
      setTimeout(() => html.classList.remove('theme-transition'), 350);
    }

    html.setAttribute('data-theme', theme);

    document.querySelectorAll('meta[name="theme-color"]').forEach((meta) => {
      meta.content = theme === 'dark' ? '#0a0a0f' : '#f5f5f7';
    });

    buttons.forEach((btn) => {
      const iconDark = btn.querySelector('.theme-icon-dark');
      const iconLight = btn.querySelector('.theme-icon-light');
      const icon = btn.querySelector('i');

      btn.classList.add('switching');
      setTimeout(() => {
        if (iconDark && iconLight) {
          const isDark = theme === 'dark';
          iconDark.style.display = isDark ? 'inline-flex' : 'none';
          iconLight.style.display = isDark ? 'none' : 'inline-flex';
          iconDark.classList.add('ri-moon-clear-fill');
          iconLight.classList.add('ri-sun-line');
        } else if (icon) {
          icon.className = theme === 'dark' ? 'ri-moon-clear-fill' : 'ri-sun-line';
        }
        btn.classList.remove('switching');
      }, 120);

      btn.setAttribute('aria-label', theme === 'dark' ? 'Activer le mode clair' : 'Activer le mode sombre');
      btn.dataset.themeState = theme;
    });
  };

  let currentTheme = resolveTheme();
  applyTheme(currentTheme, false);

  buttons.forEach((btn) => {
    btn.addEventListener('click', () => {
      currentTheme = currentTheme === 'dark' ? 'light' : 'dark';
      try { localStorage.setItem(storageKey, currentTheme); } catch {}
      applyTheme(currentTheme, true);
    });
  });

  const handleSystemChange = (e) => {
    if (getStoredPreference()) return;
    currentTheme = e.matches ? 'dark' : 'light';
    applyTheme(currentTheme, true);
  };

  if (typeof media.addEventListener === 'function') {
    media.addEventListener('change', handleSystemChange);
  } else if (typeof media.addListener === 'function') {
    media.addListener(handleSystemChange);
  }

  window.addEventListener('storage', (e) => {
    if (e.key !== storageKey) return;
    currentTheme = resolveTheme();
    applyTheme(currentTheme, true);
  });
}

/* ===== SITEWIDE VEILLE REFRESH PING ===== */
function initVeilleSitewideRefresh() {
  const endpoint = '/api/veille-refresh';
  const isVeillePage = document.body?.classList.contains('veil-page');
  const host = window.location.hostname || '';
  const isLocalPreview = window.location.protocol === 'file:' || host === 'localhost' || host === '127.0.0.1' || host === '0.0.0.0';
  const pingThrottleMs = 2 * 60 * 1000;
  const storageKey = 'veille-last-sitewide-ping-at';
  let inFlight = false;

  // The dedicated veille page already manages its own refresh flow and UI update.
  // Skip background pings on local previews to avoid noisy 404s during static checks.
  if (isVeillePage || isLocalPreview || typeof window.fetch !== 'function' || typeof AbortController !== 'function') return;

  const readLastPing = () => {
    try {
      return Number(sessionStorage.getItem(storageKey) || localStorage.getItem(storageKey) || '0');
    } catch {
      return 0;
    }
  };

  const writeLastPing = (value) => {
    try { sessionStorage.setItem(storageKey, String(value)); } catch {}
    try { localStorage.setItem(storageKey, String(value)); } catch {}
  };

  const pingRefresh = () => {
    const now = Date.now();
    if (inFlight) return;
    if (now - readLastPing() < pingThrottleMs) return;

    inFlight = true;
    writeLastPing(now);

    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => controller.abort(), 2500);

    fetch(`${endpoint}?context=site&ts=${now}`, {
      method: 'GET',
      cache: 'no-store',
      credentials: 'same-origin',
      keepalive: true,
      signal: controller.signal,
    }).catch(() => {
      // Silent failure: this background ping must never degrade the rest of the site.
    }).finally(() => {
      inFlight = false;
      window.clearTimeout(timeoutId);
    });
  };

  window.setTimeout(pingRefresh, 350);
  window.addEventListener('pageshow', pingRefresh, { passive: true });
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      pingRefresh();
    }
  });
}

function initPageEntrance() {
  const targets = document.querySelectorAll(
    '.hero-section > *, .page-hero > *, .veille-hero__copy, .veille-hero__panel, #home-bento > *, .ap-year-overview, .ap-year-grid > *, .bento-grid > .bento-card, .bento-grid > .cyber-card, .report-section, .news-card, .veille-source, .contact-method'
  );
  if (!targets.length) return;

  targets.forEach((el, index) => {
    el.classList.add('premium-intro');
    el.style.setProperty('--intro-delay', `${Math.min(index, 12) * 55}ms`);
  });

  if (prefersReducedMotion()) {
    document.body.classList.add('ui-ready');
    return;
  }

  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      document.body.classList.add('ui-ready');
    });
  });
}

function initHeroMicroMotion() {
  if (prefersReducedMotion() || !window.matchMedia('(pointer: fine)').matches) return;

  const hero = document.querySelector('.hero-section, .page-hero, .veille-hero');
  if (!hero) return;

  let rafId = 0;
  let offsetX = 0;
  let offsetY = 0;

  const update = () => {
    hero.style.setProperty('--hero-parallax-x', `${offsetX}px`);
    hero.style.setProperty('--hero-parallax-y', `${offsetY}px`);
    rafId = 0;
  };

  hero.addEventListener('mousemove', (event) => {
    const rect = hero.getBoundingClientRect();
    const px = (event.clientX - rect.left) / rect.width - 0.5;
    const py = (event.clientY - rect.top) / rect.height - 0.5;
    offsetX = px * 18;
    offsetY = py * 14;
    if (!rafId) rafId = requestAnimationFrame(update);
  }, { passive: true });

  hero.addEventListener('mouseleave', () => {
    offsetX = 0;
    offsetY = 0;
    if (!rafId) rafId = requestAnimationFrame(update);
  }, { passive: true });
}

function initRippleEffects() {
  if (prefersReducedMotion()) return;

  const targets = document.querySelectorAll(
    '.btn, .footer-socials a, .theme-toggle, #global-theme-toggle, .header-action-btn, .ux-header-cta, .veille-filter, .nav-pill'
  );

  targets.forEach((target) => {
    target.classList.add('has-ripple');
    target.addEventListener('pointerdown', (event) => {
      const rect = target.getBoundingClientRect();
      const ripple = document.createElement('span');
      ripple.className = 'ui-ripple';
      const size = Math.max(rect.width, rect.height) * 1.2;
      ripple.style.width = `${size}px`;
      ripple.style.height = `${size}px`;
      ripple.style.left = `${event.clientX - rect.left - size / 2}px`;
      ripple.style.top = `${event.clientY - rect.top - size / 2}px`;
      target.appendChild(ripple);
      window.setTimeout(() => ripple.remove(), 650);
    }, { passive: true });
  });
}

function initScrollProgressBar() {
  const progressBar = document.getElementById('scroll-progress');
  if (!progressBar) return;

  let rafId = 0;
  const update = () => {
    const scrollTop = window.scrollY;
    const scrollHeight = document.documentElement.scrollHeight - window.innerHeight;
    const progress = scrollHeight > 0 ? Math.min(100, Math.max(0, (scrollTop / scrollHeight) * 100)) : 0;
    progressBar.style.width = `${progress}%`;
    rafId = 0;
  };

  const onScroll = () => {
    if (rafId) return;
    rafId = window.requestAnimationFrame(update);
  };

  update();
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll, { passive: true });
}

/* ===== 3D TILT EFFECT (Vanilla Tilt Clone) ===== */
function initTiltEffect() {
  const cards = document.querySelectorAll('.bento-card, .cyber-card');

  cards.forEach(card => {
    card.style.transformStyle = 'preserve-3d';
    card.style.perspective = '1000px';

    // Create glare overlay
    const glare = document.createElement('div');
    glare.className = 'tilt-glare';
    glare.style.cssText = `
      position: absolute; inset: 0; pointer-events: none; border-radius: inherit;
      background: linear-gradient(135deg, rgba(255,255,255,0.1) 0%, transparent 50%);
      opacity: 0; transition: opacity 0.3s ease;
    `;
    card.style.position = 'relative';
    card.appendChild(glare);

    const handleMove = (e) => {
      const rect = card.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const centerX = rect.width / 2;
      const centerY = rect.height / 2;
      const rotateX = (y - centerY) / 15;
      const rotateY = (centerX - x) / 15;

      card.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(1.02, 1.02, 1.02)`;
      glare.style.opacity = '1';
      glare.style.background = `radial-gradient(circle at ${x}px ${y}px, rgba(255,255,255,0.15), transparent 60%)`;
    };

    const handleLeave = () => {
      card.style.transform = 'perspective(1000px) rotateX(0) rotateY(0) scale3d(1, 1, 1)';
      card.style.transition = 'transform 0.5s ease';
      glare.style.opacity = '0';
    };

    const handleEnter = () => { card.style.transition = 'none'; };

    card.addEventListener('mousemove', handleMove);
    card.addEventListener('mouseleave', handleLeave);
    card.addEventListener('mouseenter', handleEnter);
  });
}

/* ===== SCROLL REVEAL (Reduced Animation) ===== */
function initScrollReveal() {
  const els = document.querySelectorAll('.reveal-on-scroll, .veille-source, .veille-step, .veille-panel');
  if (!els.length) return;

  if (prefersReducedMotion() || !('IntersectionObserver' in window)) {
    els.forEach((el) => {
      el.style.opacity = '1';
      el.style.transform = 'none';
    });
    return;
  }

  const obs = new IntersectionObserver(entries => {
    entries.forEach((e, i) => {
      if (e.isIntersecting) {
        const delay = Number(e.target.getAttribute('data-reveal-delay') || e.target.style.getPropertyValue('--reveal-delay').replace('ms', '')) || (i * 70);
        setTimeout(() => {
          e.target.style.opacity = '1';
          e.target.style.transform = 'translateY(0)';
        }, delay);
        obs.unobserve(e.target);
      }
    });
  }, { threshold: 0.1 });

  els.forEach((el) => {
    el.style.opacity = '0';
    el.style.transform = 'translateY(26px)';
    el.style.transition = `opacity 0.72s cubic-bezier(0.16, 1, 0.3, 1), transform 0.72s cubic-bezier(0.16, 1, 0.3, 1)`;
    obs.observe(el);
  });
}

/* ===== INTERACTIVE CONSTELLATION PARTICLES ===== */
function initConstellationParticles() {
  const canvas = document.getElementById('particle-canvas');
  if (!canvas || prefersReducedMotion()) return;

  const ctx = canvas.getContext('2d', { alpha: true, desynchronized: true });
  if (!ctx) return;

  let width = 0;
  let height = 0;
  let dpr = 1;
  let animationFrame = 0;
  let paused = document.hidden;
  let particles = [];
  const pointerFine = window.matchMedia && window.matchMedia('(pointer: fine)').matches;
  const mouse = { x: null, y: null, radius: pointerFine ? 140 : 0 };
  const particleCount = Math.min(pointerFine ? 72 : 42, Math.max(22, Math.floor((window.innerWidth * window.innerHeight) / 22000)));

  const resize = () => {
    width = window.innerWidth;
    height = window.innerHeight;
    dpr = Math.min(window.devicePixelRatio || 1, 1.8);
    canvas.width = Math.floor(width * dpr);
    canvas.height = Math.floor(height * dpr);
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  };
  addEventListener('resize', resize);
  resize();

  if (pointerFine) {
    addEventListener('mousemove', e => { mouse.x = e.clientX; mouse.y = e.clientY; }, { passive: true });
    addEventListener('mouseout', () => { mouse.x = null; mouse.y = null; }, { passive: true });
  }

  class Particle {
    constructor() {
      this.baseX = Math.random() * width;
      this.baseY = Math.random() * height;
      this.x = this.baseX;
      this.y = this.baseY;
      this.vx = (Math.random() - 0.5) * (pointerFine ? 0.22 : 0.16);
      this.vy = (Math.random() - 0.5) * (pointerFine ? 0.22 : 0.16);
      this.size = Math.random() * 1.6 + 0.6;
    }

    update() {
      if (pointerFine && mouse.x && mouse.y) {
        const dx = mouse.x - this.x;
        const dy = mouse.y - this.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist > 0 && dist < mouse.radius) {
          const force = (mouse.radius - dist) / mouse.radius;
          this.x -= (dx / dist) * force * 2.1;
          this.y -= (dy / dist) * force * 2.1;
        }
      }

      this.x += this.vx;
      this.y += this.vy;
      this.x += (this.baseX - this.x) * 0.012;
      this.y += (this.baseY - this.y) * 0.012;
      if (this.x < 0 || this.x > width) this.vx *= -1;
      if (this.y < 0 || this.y > height) this.vy *= -1;
    }

    draw() {
      const isDark = document.documentElement.getAttribute('data-theme') !== 'light';
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
      ctx.fillStyle = isDark ? 'rgba(132, 166, 255, 0.42)' : 'rgba(71, 102, 190, 0.22)';
      ctx.fill();
    }
  }

  const createParticles = () => {
    particles = Array.from({ length: particleCount }, () => new Particle());
  };
  createParticles();

  function drawConnections() {
    const isDark = document.documentElement.getAttribute('data-theme') !== 'light';
    const maxDist = pointerFine ? 124 : 92;

    for (let i = 0; i < particles.length; i++) {
      for (let j = i + 1; j < particles.length; j++) {
        const dx = particles[i].x - particles[j].x;
        const dy = particles[i].y - particles[j].y;
        const distanceSquared = dx * dx + dy * dy;
        const maxDistSquared = maxDist * maxDist;

        if (distanceSquared < maxDistSquared) {
          const dist = Math.sqrt(distanceSquared);
          const opacity = (1 - dist / maxDist) * (pointerFine ? 0.22 : 0.14);
          ctx.beginPath();
          ctx.moveTo(particles[i].x, particles[i].y);
          ctx.lineTo(particles[j].x, particles[j].y);
          ctx.strokeStyle = isDark ? `rgba(96, 136, 218, ${opacity})` : `rgba(80, 110, 190, ${opacity * 0.85})`;
          ctx.lineWidth = 0.5;
          ctx.stroke();
        }
      }
    }
  }

  function animate() {
    if (paused) {
      animationFrame = window.requestAnimationFrame(animate);
      return;
    }
    ctx.clearRect(0, 0, width, height);
    particles.forEach(p => { p.update(); p.draw(); });
    drawConnections();
    animationFrame = window.requestAnimationFrame(animate);
  }

  document.addEventListener('visibilitychange', () => {
    paused = document.hidden;
  });
  window.addEventListener('resize', () => {
    resize();
    createParticles();
  }, { passive: true });

  animate();
}

/* ===== IMAGE LIGHTBOX ===== */
function initLightbox() {
  if (document.querySelector('.lightbox-overlay')) return;
  const images = [...document.querySelectorAll('.card-image-wrapper img, main figure img, .zoomable')]
    .filter((img, index, arr) =>
      !img.matches('[data-no-lightbox]') &&
      !img.closest('[data-no-lightbox]') &&
      arr.indexOf(img) === index
    );
  if (!images.length) return;

  // Create lightbox overlay
  const overlay = document.createElement('div');
  overlay.className = 'lightbox-overlay';
  overlay.setAttribute('aria-hidden', 'true');
  overlay.innerHTML = `
    <button class="lightbox-nav lightbox-prev" aria-label="Image précédente"><i class="ri-arrow-left-s-line"></i></button>
    <button class="lightbox-close" aria-label="Fermer la visionneuse"><i class="ri-close-line"></i></button>
    <button class="lightbox-nav lightbox-next" aria-label="Image suivante"><i class="ri-arrow-right-s-line"></i></button>
    <div class="lightbox-shell" role="dialog" aria-modal="true" aria-label="Visionneuse de preuves visuelles">
      <figure class="lightbox-figure">
        <div class="lightbox-stage">
          <img src="" alt="Zoom">
        </div>
        <figcaption class="lightbox-panel">
          <div class="lightbox-panel__label">PREUVE VISUELLE</div>
          <div class="lightbox-caption" aria-live="polite"></div>
          <div class="lightbox-counter" aria-live="polite"></div>
        </figcaption>
      </figure>
    </div>
  `;
  document.body.appendChild(overlay);

  const lightboxImg = overlay.querySelector('img');
  const lightboxShell = overlay.querySelector('.lightbox-shell');
  const closeBtn = overlay.querySelector('.lightbox-close');
  const prevBtn = overlay.querySelector('.lightbox-prev');
  const nextBtn = overlay.querySelector('.lightbox-next');
  const counter = overlay.querySelector('.lightbox-counter');
  const caption = overlay.querySelector('.lightbox-caption');
  let currentIndex = -1;
  let touchStartX = 0;
  let touchDeltaX = 0;

  const isOpen = () => overlay.classList.contains('active');
  const getSafeIndex = (idx) => {
    if (!images.length) return -1;
    const len = images.length;
    return ((idx % len) + len) % len;
  };

  const getImageFrame = (img) =>
    img.closest('figure, .gallery-item, .card-image-wrapper, .report-image-card, .report-card, .gallery-card') ||
    img.parentElement;

  const getImageCaption = (img) => {
    const explicitCaption = img.getAttribute('data-lightbox-caption');
    if (explicitCaption && explicitCaption.trim()) return explicitCaption.trim();

    const figureCaption = img.closest('figure')?.querySelector('figcaption')?.textContent?.trim();
    if (figureCaption) return figureCaption;

    const wrapperCaption = getImageFrame(img)?.querySelector('figcaption, p')?.textContent?.trim();
    if (wrapperCaption) return wrapperCaption;

    return (img.alt && img.alt.trim()) || 'Preuve visuelle du portfolio';
  };

  const updateLightbox = () => {
    if (currentIndex < 0 || !images[currentIndex]) return;
    const img = images[currentIndex];
    lightboxImg.src = img.currentSrc || img.src;
    lightboxImg.alt = img.alt || 'Image portfolio';
    if (caption) caption.textContent = getImageCaption(img);
    if (counter) counter.textContent = `${currentIndex + 1} / ${images.length}`;
    const navVisibility = images.length > 1 ? 'flex' : 'none';
    if (prevBtn) prevBtn.style.display = navVisibility;
    if (nextBtn) nextBtn.style.display = navVisibility;
  };

  const openLightbox = (index) => {
    currentIndex = getSafeIndex(index);
    updateLightbox();
    overlay.classList.add('active');
    overlay.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
  };

  // Make all card images zoomable
  images.forEach((img, index) => {
    img.classList.add('zoomable');
    const frame = getImageFrame(img);
    if (frame && frame !== img && !frame.matches('[data-no-lightbox]')) {
      frame.classList.add('zoomable-frame');
    }
    img.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      openLightbox(index);
    });
  });

  const navigate = (delta) => {
    if (!isOpen() || images.length < 2) return;
    currentIndex = getSafeIndex(currentIndex + delta);
    updateLightbox();
  };

  // Close lightbox
  const closeLightbox = () => {
    overlay.classList.remove('active');
    overlay.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
  };

  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) closeLightbox();
  });
  lightboxShell?.addEventListener('click', (e) => e.stopPropagation());
  lightboxImg.addEventListener('click', (e) => e.stopPropagation());
  closeBtn.addEventListener('click', (e) => { e.stopPropagation(); closeLightbox(); });
  prevBtn?.addEventListener('click', (e) => { e.stopPropagation(); navigate(-1); });
  nextBtn?.addEventListener('click', (e) => { e.stopPropagation(); navigate(1); });

  overlay.addEventListener('touchstart', (e) => {
    if (!isOpen() || e.touches.length !== 1) return;
    touchStartX = e.touches[0].clientX;
    touchDeltaX = 0;
  }, { passive: true });
  overlay.addEventListener('touchmove', (e) => {
    if (!isOpen() || e.touches.length !== 1) return;
    touchDeltaX = e.touches[0].clientX - touchStartX;
  }, { passive: true });
  overlay.addEventListener('touchend', () => {
    if (!isOpen()) return;
    if (Math.abs(touchDeltaX) > 45) {
      navigate(touchDeltaX > 0 ? -1 : 1);
    }
    touchDeltaX = 0;
  }, { passive: true });

  document.addEventListener('keydown', (e) => {
    if (!isOpen()) return;
    if (e.key === 'Escape') closeLightbox();
    if (e.key === 'ArrowLeft') navigate(-1);
    if (e.key === 'ArrowRight') navigate(1);
  });
}

/* ===== HEADER SCROLL EFFECT ===== */
function initHeaderScroll() {
  const header = document.querySelector('.app-top');
  if (!header) return;

  let lastScroll = 0;
  const scrollThreshold = 50;

  window.addEventListener('scroll', () => {
    const currentScroll = window.scrollY;

    // Add/remove scrolled class
    if (currentScroll > scrollThreshold) {
      header.classList.add('scrolled');
    } else {
      header.classList.remove('scrolled');
    }

    lastScroll = currentScroll;
  }, { passive: true });
}

/* ===== CURSOR GLOW ON CARDS ===== */
function initCursorGlow() {
  if ((window.matchMedia && !window.matchMedia('(pointer: fine)').matches) || prefersReducedMotion()) return;
  const cards = document.querySelectorAll('.bento-card, .cyber-card, .error-card');
  if (!cards.length) return;

  let activeCard = null;
  let rafId = 0;
  let pendingX = 0;
  let pendingY = 0;

  const flush = () => {
    if (activeCard) {
      activeCard.style.setProperty('--mouse-x', `${pendingX}px`);
      activeCard.style.setProperty('--mouse-y', `${pendingY}px`);
    }
    rafId = 0;
  };

  cards.forEach(card => {
    card.addEventListener('mousemove', (e) => {
      const rect = card.getBoundingClientRect();
      pendingX = e.clientX - rect.left;
      pendingY = e.clientY - rect.top;
      activeCard = card;
      if (!rafId) rafId = window.requestAnimationFrame(flush);
    }, { passive: true });

    card.addEventListener('mouseleave', () => {
      card.style.removeProperty('--mouse-x');
      card.style.removeProperty('--mouse-y');
      if (activeCard === card) activeCard = null;
    }, { passive: true });
  });
}

/* ===== SCROLL TO TOP VISIBILITY ===== */
function initScrollToTop() {
  const scrollBtn = document.querySelector('.scroll-top, #scrollToTop');
  if (!scrollBtn) return;

  window.addEventListener('scroll', () => {
    if (window.scrollY > 400) {
      scrollBtn.classList.add('visible');
    } else {
      scrollBtn.classList.remove('visible');
    }
  }, { passive: true });
}
