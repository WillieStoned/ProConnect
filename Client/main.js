const nav = document.getElementById('nav');
const burger = document.getElementById('navBurger');
const links = document.querySelector('.nav__links');
const cta = document.querySelector('.nav__cta');
const themeToggle = document.getElementById('themeToggle');
const yearEl = document.getElementById('year');

if (nav) {
  window.addEventListener('scroll', () => {
    nav.classList.toggle('scrolled', window.scrollY > 30);
  }, { passive: true });
}

if (burger && nav) {
  burger.addEventListener('click', () => {
    const isOpen = nav.classList.toggle('nav--open');
    burger.setAttribute('aria-expanded', String(isOpen));
    burger.setAttribute('aria-label', isOpen ? 'Close menu' : 'Open menu');
  });

  [links, cta].forEach((container) => {
    if (!container) {
      return;
    }

    container.addEventListener('click', (event) => {
      if (!(event.target instanceof HTMLElement) || !event.target.closest('a')) {
        return;
      }

      nav.classList.remove('nav--open');
      burger.setAttribute('aria-expanded', 'false');
      burger.setAttribute('aria-label', 'Open menu');
    });
  });
}

if (themeToggle && typeof toggleTheme === 'function') {
  themeToggle.addEventListener('click', toggleTheme);
}

if (yearEl) {
  yearEl.textContent = String(new Date().getFullYear());
}

const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
if (!prefersReducedMotion && typeof IntersectionObserver === 'function') {
  const revealTargets = document.querySelectorAll('.feature-card, .step, .stat-card, .section-header');
  if (revealTargets.length > 0) {
    const reveal = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) {
          return;
        }

        entry.target.style.opacity = '1';
        entry.target.style.transform = 'translateY(0)';
        reveal.unobserve(entry.target);
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });

    revealTargets.forEach((el) => {
      el.style.opacity = '0';
      el.style.transform = 'translateY(24px)';
      el.style.transition = 'opacity 0.55s ease, transform 0.55s ease';
      reveal.observe(el);
    });
  }
}

