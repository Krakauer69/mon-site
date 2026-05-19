// ============================================
// PORTFOLIO APP SCRIPT (Bento / Product UI)
// - Theme system (system default + toggle)
// - Global dock injection
// - Scroll reveal (prefers-reduced-motion aware)
// - Contact modal (works on all pages)
// ============================================

const THEME_KEY = 'portfolio-theme';

function getSystemTheme() {
 return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function getStoredTheme() {
 try {
  return localStorage.getItem(THEME_KEY);
 } catch {
  return null;
 }
}

function setTheme(theme) {
 document.documentElement.setAttribute('data-theme', theme);
 try {
  localStorage.setItem(THEME_KEY, theme);
 } catch {
  // no-op
 }
}

function initTheme() {
 const stored = getStoredTheme();
 if (stored === 'light' || stored === 'dark') {
  document.documentElement.setAttribute('data-theme', stored);
  return;
 }
 document.documentElement.setAttribute('data-theme', getSystemTheme());
}

function toggleTheme() {
 const current = document.documentElement.getAttribute('data-theme') || getSystemTheme();
 setTheme(current === 'dark' ? 'light' : 'dark');
 updateThemeToggles();
}

function svgIcon(name) {
 const icons = {
  home:
   '<path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1z" />',
  grid:
   '<path d="M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z" />',
  briefcase:
   '<path d="M9 6V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v1h3a2 2 0 0 1 2 2v3a3 3 0 0 1-3 3H5a3 3 0 0 1-3-3V8a2 2 0 0 1 2-2zm2 0h4V5h-4z" />',
  rocket:
   '<path d="M14.5 4.5c3.5 1 5.5 4 5.5 8.5-2.5 0-4.5.5-6 1.5l-3.5-3.5c1-1.5 1.5-3.5 1.5-6zM4 20c4.5 0 7.5-2 8.5-5.5L9 11c-1.5 1.5-2 3.5-2 6.5z" />',
  bolt:
   '<path d="M13 2 3 14h7l-1 8 10-12h-7z" />',
  file:
   '<path d="M14 2H7a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7z" /><path d="M14 2v5h5" />',
  mail:
   '<path d="M4 4h16a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z" /><path d="m22 6-10 7L2 6" />',
  moon:
   '<path d="M21 12.8A8.5 8.5 0 1 1 11.2 3a6.5 6.5 0 1 0 9.8 9.8z" />',
  sun:
   '<path d="M12 18a6 6 0 1 0 0-12 6 6 0 0 0 0 12Z" /><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />'
  ,
  x: '<path d="M18 6 6 18" /><path d="m6 6 12 12" />'
 };

 const body = icons[name] || icons.grid;
 return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${body}</svg>`;
}

function injectDock() {
 if (document.querySelector('.dock')) return;

 const path = (location.pathname.split('/').pop() || 'index.html').toLowerCase();

 const items = [
  { href: 'index.html', label: 'Accueil', icon: 'home' },
  { href: 'ap.html', label: 'AP', icon: 'grid' },
  { href: 'stages.html', label: 'Stages', icon: 'briefcase' },
  { href: 'projets-personnels.html', label: 'Projets', icon: 'rocket' },
  { href: 'projet-professionnel.html', label: 'Projet pro', icon: 'bolt' },
  { href: 'veille.html', label: 'Veille', icon: 'grid' },
  { href: 'cv.html', label: 'CV', icon: 'file' }
 ];

 const dock = document.createElement('nav');
 dock.className = 'dock';
 dock.setAttribute('aria-label', 'Navigation');

 const bar = document.createElement('div');
 bar.className = 'dock__bar';

 items.forEach((it) => {
  const a = document.createElement('a');
  a.className = 'dock__item';
  a.href = it.href;
  if (path === it.href.toLowerCase()) a.setAttribute('aria-current', 'page');
  a.innerHTML = `${svgIcon(it.icon)}<span class="dock__label">${it.label}</span>`;
  bar.appendChild(a);
 });

 const contact = document.createElement('button');
 contact.type = 'button';
 contact.className = 'dock__item';
 contact.setAttribute('data-open-contact', 'true');
 contact.innerHTML = `${svgIcon('mail')}<span class="dock__label">Contact</span>`;
 bar.appendChild(contact);

 const theme = document.createElement('button');
 theme.type = 'button';
 theme.className = 'dock__item';
 theme.setAttribute('data-theme-toggle', 'true');
 theme.innerHTML = `${svgIcon('moon')}<span class="dock__label">Thème</span>`;
 bar.appendChild(theme);

 dock.appendChild(bar);
 document.body.appendChild(dock);
}

function updateThemeToggles() {
 const isLight = (document.documentElement.getAttribute('data-theme') || getSystemTheme()) === 'light';
 const icon = isLight ? svgIcon('sun') : svgIcon('moon');

 document.querySelectorAll('[data-theme-toggle]').forEach((el) => {
  if (!(el instanceof HTMLElement)) return;
  const iconDark = el.querySelector('.theme-icon-dark');
  const iconLight = el.querySelector('.theme-icon-light');
  if (iconDark && iconLight) {
   iconDark.style.display = isLight ? 'none' : 'inline-flex';
   iconLight.style.display = isLight ? 'inline-flex' : 'none';
   return;
  }
  // dock button contains a label; keep it
  if (el.classList.contains('dock__item')) {
   el.innerHTML = `${icon}<span class="dock__label">Thème</span>`;
   return;
  }
  el.innerHTML = icon;
 });
}

function ensureContactModal() {
 if (document.getElementById('modal')) return;

 const overlay = document.createElement('div');
 overlay.className = 'modal-overlay';
 overlay.id = 'modal';
 overlay.innerHTML = `
  <div class="modal-card" role="dialog" aria-modal="true" aria-label="Contact">
   <button class="modal-close" type="button" data-close-contact="true" aria-label="Fermer">
    ${svgIcon('x')}
   </button>

   <div id="formView">
    <h2 class="form-title">Envoyons un message</h2>
    <p class="form-subtitle">Remplis ce formulaire ou contacte-moi directement par email.</p>

    <form id="contactForm">
     <div class="form-group">
      <label class="form-label" for="contact_name">Ton Nom / Entreprise</label>
      <input id="contact_name" type="text" name="nom" class="form-input" placeholder="Ex: Jean Dupont / ACME Corp" required>
     </div>

     <div class="form-group">
      <label class="form-label" for="contact_email">Email</label>
      <input id="contact_email" type="email" name="email" class="form-input" placeholder="contact@exemple.fr" required>
     </div>

     <div class="form-group">
      <label class="form-label" for="contact_subject">Sujet</label>
      <select id="contact_subject" name="sujet" class="form-input" required>
       <option value="">-- Choisis un sujet --</option>
       <option value="alternance">Proposition alternance</option>
       <option value="stage">Proposition stage</option>
       <option value="projet">Projet / Mission</option>
       <option value="autre">Autre demande</option>
      </select>
     </div>

     <div class="form-group">
      <label class="form-label" for="contact_message">Message</label>
      <textarea id="contact_message" name="message" class="form-input" rows="5" placeholder="Décris ton projet, tes besoins..." required></textarea>
     </div>

     <button type="submit" class="btn-submit">Envoyer</button>

     <div style="margin-top: 18px; padding-top: 18px; border-top: 1px solid rgba(17,24,39,.12); text-align: center;">
      <p style="font-size: 0.9rem; color: var(--text-2); margin-bottom: 10px;">Ou contacte-moi directement :</p>
      <a href="mailto:contact@jasir.fr" style="color: var(--primary); font-weight: 700; text-decoration: underline;">contact@jasir.fr</a>
     </div>
    </form>
   </div>

   <div id="successView" class="success-view">
    <h2 class="form-title">Message envoyé</h2>
    <p style="font-size: 1.05rem; color: var(--text-2); margin: 10px 0 18px;">Je te réponds sous 48h maximum.</p>
    <button type="button" class="btn-white" data-close-contact="true" style="width: 100%;">Retour</button>
   </div>
  </div>
 `.trim();

 document.body.appendChild(overlay);
}

function getModalEls() {
 return {
  modal: document.getElementById('modal'),
  formView: document.getElementById('formView'),
  successView: document.getElementById('successView'),
  contactForm: document.getElementById('contactForm')
 };
}

function openContact() {
 const { modal, formView, successView } = getModalEls();
 if (!modal) return;
 modal.classList.add('active');
 if (formView) formView.style.display = 'block';
 if (successView) successView.classList.remove('active');
}

function closeContact() {
 const { modal, formView, successView, contactForm } = getModalEls();
 if (!modal) return;
 modal.classList.remove('active');
 window.setTimeout(() => {
  if (formView) formView.style.display = 'block';
  if (successView) successView.classList.remove('active');
  if (contactForm && typeof contactForm.reset === 'function') contactForm.reset();
 }, 220);
}

// Back-compat for inline handlers on existing pages
window.toggleModal = function toggleModal() {
 const { modal } = getModalEls();
 if (!modal) return;
 if (modal.classList.contains('active')) closeContact();
 else openContact();
};

window.handleContact = function handleContact(event) {
 if (event) event.preventDefault();
 const { formView, successView } = getModalEls();
 if (formView) formView.style.display = 'none';
 if (successView) successView.classList.add('active');
};

function wireInteractions() {
 document.addEventListener('click', (e) => {
  const openBtn = e.target && e.target.closest && e.target.closest('[data-open-contact]');
  if (openBtn) {
   openContact();
   return;
  }

  const closeBtn = e.target && e.target.closest && e.target.closest('[data-close-contact]');
  if (closeBtn) {
   closeContact();
   return;
  }

  const themeBtn = e.target && e.target.closest && e.target.closest('[data-theme-toggle]');
  if (themeBtn) {
   toggleTheme();
   return;
  }

  const overlay = e.target && e.target.id === 'modal' ? e.target : null;
  if (overlay) closeContact();
 });

 document.addEventListener('keydown', (e) => {
  if (e.key !== 'Escape') return;
  const { modal } = getModalEls();
  if (modal && modal.classList.contains('active')) closeContact();
 });

 const form = document.getElementById('contactForm');
 if (form) {
  form.addEventListener('submit', (e) => window.handleContact(e));
 }
}

function initReveal() {
 const reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

 const targets = [
  ...document.querySelectorAll(
   '.card, .bento-container > *, section.content-section, section.project-gallery, nav.breadcrumb, .timeline, .timeline-item, .page-hero, header.site-header'
  )
 ].filter((el) => el instanceof Element);

 targets.forEach((el) => el.classList.add('reveal'));

 if (reduce || !('IntersectionObserver' in window)) {
  targets.forEach((el) => el.classList.add('is-visible'));
  return;
 }

 const io = new IntersectionObserver(
  (entries) => {
   entries.forEach((entry) => {
    if (!entry.isIntersecting) return;
    entry.target.classList.add('is-visible');
    io.unobserve(entry.target);
   });
  },
  { threshold: 0.12, rootMargin: '0px 0px -10% 0px' }
 );

 targets.forEach((el) => io.observe(el));
}

// Boot
initTheme();

window.addEventListener('DOMContentLoaded', () => {
 document.body.classList.add('app');
 ensureContactModal();
 injectDock();
 updateThemeToggles();
 wireInteractions();
 initReveal();
});


/* ============================================
   UX/UI MASTER UPGRADE JS 2026
   - Advanced Smooth Scrolling
   - Re-tuned AOS Animations
   ============================================ */

document.addEventListener('DOMContentLoaded', () => {
    // 1. Native Smooth Scrolling for all internal anchor links
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            const targetId = this.getAttribute('href');
            if (targetId === '#') return;
            
            const targetElement = document.querySelector(targetId);
            if (targetElement) {
                e.preventDefault();
                const headerOffset = 80;
                const elementPosition = targetElement.getBoundingClientRect().top;
                const offsetPosition = elementPosition + window.pageYOffset - headerOffset;
  
                window.scrollTo({
                    top: offsetPosition,
                    behavior: "smooth"
                });
            }
        });
    });

    // 2. Re-tune AOS (Animate On Scroll) for smoother, less intrusive animations
    if (typeof AOS !== 'undefined') {
        AOS.init({
            offset: 50,       // Declenche un peu plus tôt
            duration: 800,    // Animation plus longue et douce
            easing: 'cubic-bezier(0.16, 1, 0.3, 1)', // Courbe d'animation premium
            delay: 50,
            once: true,       // N'anime qu'une seule fois pour ne pas distraire l'utilisateur qui remonte
            mirror: false
        });
    }

    // 3. Magnetic Buttons Effect (High-end UX touch)
    const magneticElements = document.querySelectorAll('.btn, .premium-dl-btn, .theme-toggle-btn');
    
    magneticElements.forEach(elem => {
        elem.addEventListener('mousemove', (e) => {
            const rect = elem.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            
            elem.style.transform = `translate(${(x - rect.width / 2) * 0.1}px, ${(y - rect.height / 2) * 0.1}px)`;
        });
        
        elem.addEventListener('mouseleave', () => {
            elem.style.transform = 'translate(0px, 0px)';
        });
    });
});
