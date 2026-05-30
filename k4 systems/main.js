/* ════════════════════════════════════════════
   KR4 AUTOMATIONS – main.js
════════════════════════════════════════════ */

/* ── NAVBAR SCROLL ── */
const navbar = document.getElementById('navbar');
window.addEventListener('scroll', () => {
  navbar.classList.toggle('scrolled', window.scrollY > 40);
}, { passive: true });

/* ── MOBILE MENU ── */
const burger = document.getElementById('navBurger');
const navLinks = document.getElementById('navLinks');
burger.addEventListener('click', () => {
  burger.classList.toggle('open');
  navLinks.classList.toggle('open');
});
navLinks.querySelectorAll('a').forEach(a => {
  a.addEventListener('click', () => {
    burger.classList.remove('open');
    navLinks.classList.remove('open');
  });
});

/* ── SMOOTH SCROLL for native fallback ── */
document.querySelectorAll('a[href^="#"]').forEach(a => {
  a.addEventListener('click', e => {
    const target = document.querySelector(a.getAttribute('href'));
    if (!target) return;
    e.preventDefault();
    const offset = 80;
    window.scrollTo({ top: target.offsetTop - offset, behavior: 'smooth' });
  });
});

/* ── REVEAL ON SCROLL ── */
const revealObserver = new IntersectionObserver((entries) => {
  entries.forEach((entry, i) => {
    if (entry.isIntersecting) {
      entry.target.style.transitionDelay = `${(i % 4) * 0.08}s`;
      entry.target.classList.add('visible');
      revealObserver.unobserve(entry.target);
    }
  });
}, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });

document.querySelectorAll('.reveal').forEach(el => revealObserver.observe(el));

/* ── COUNTER ANIMATION ── */
function animateCounter(el) {
  const target = parseInt(el.dataset.target, 10);
  const suffix = el.dataset.suffix || '';
  const duration = 1800;
  const start = performance.now();

  function update(now) {
    const elapsed = now - start;
    const progress = Math.min(elapsed / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3);
    const value = Math.round(eased * target);
    el.textContent = value + suffix;
    if (progress < 1) requestAnimationFrame(update);
  }
  requestAnimationFrame(update);
}

const counterObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      animateCounter(entry.target);
      counterObserver.unobserve(entry.target);
    }
  });
}, { threshold: 0.5 });

document.querySelectorAll('.numero-value[data-target]').forEach(el => counterObserver.observe(el));

/* ── NETWORK CANVAS ── */
(function initCanvas() {
  const canvas = document.getElementById('networkCanvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  let W, H, nodes, animFrame;

  const NODE_COUNT = 55;
  const MAX_DIST = 180;
  const SPEED = 0.35;

  function resize() {
    W = canvas.width = canvas.offsetWidth;
    H = canvas.height = canvas.offsetHeight;
  }

  function makeNode() {
    return {
      x: Math.random() * W,
      y: Math.random() * H,
      vx: (Math.random() - 0.5) * SPEED,
      vy: (Math.random() - 0.5) * SPEED,
      r: Math.random() * 2.5 + 1,
      pulse: Math.random() * Math.PI * 2,
    };
  }

  function init() {
    resize();
    nodes = Array.from({ length: NODE_COUNT }, makeNode);
  }

  function draw() {
    ctx.clearRect(0, 0, W, H);

    /* edges */
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const a = nodes[i], b = nodes[j];
        const dx = b.x - a.x, dy = b.y - a.y;
        const dist = Math.hypot(dx, dy);
        if (dist > MAX_DIST) continue;
        const alpha = (1 - dist / MAX_DIST) * 0.25;
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
        ctx.strokeStyle = `rgba(0, 119, 255, ${alpha})`;
        ctx.lineWidth = 1;
        ctx.stroke();
      }
    }

    /* nodes */
    nodes.forEach(n => {
      n.pulse += 0.02;
      const glow = (Math.sin(n.pulse) + 1) / 2;

      ctx.beginPath();
      ctx.arc(n.x, n.y, n.r + glow * 1.5, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(0, 170, 255, ${0.4 + glow * 0.4})`;
      ctx.fill();

      /* subtle glow halo */
      const grad = ctx.createRadialGradient(n.x, n.y, 0, n.x, n.y, (n.r + 4) * 3);
      grad.addColorStop(0, `rgba(0, 119, 255, ${0.12 * glow})`);
      grad.addColorStop(1, 'transparent');
      ctx.beginPath();
      ctx.arc(n.x, n.y, (n.r + 4) * 3, 0, Math.PI * 2);
      ctx.fillStyle = grad;
      ctx.fill();

      /* move */
      n.x += n.vx;
      n.y += n.vy;
      if (n.x < -20) n.x = W + 20;
      if (n.x > W + 20) n.x = -20;
      if (n.y < -20) n.y = H + 20;
      if (n.y > H + 20) n.y = -20;
    });

    animFrame = requestAnimationFrame(draw);
  }

  /* mouse interaction */
  let mouse = { x: -9999, y: -9999 };
  canvas.addEventListener('mousemove', e => {
    const rect = canvas.getBoundingClientRect();
    mouse.x = e.clientX - rect.left;
    mouse.y = e.clientY - rect.top;
    nodes.forEach(n => {
      const dx = n.x - mouse.x, dy = n.y - mouse.y;
      const dist = Math.hypot(dx, dy);
      if (dist < 100) {
        const force = (100 - dist) / 100 * 0.6;
        n.vx += (dx / dist) * force;
        n.vy += (dy / dist) * force;
        /* clamp velocity */
        const speed = Math.hypot(n.vx, n.vy);
        if (speed > SPEED * 4) { n.vx = (n.vx / speed) * SPEED * 4; n.vy = (n.vy / speed) * SPEED * 4; }
      }
    });
  });
  canvas.addEventListener('mouseleave', () => { mouse.x = -9999; mouse.y = -9999; });

  /* velocity decay */
  setInterval(() => {
    nodes.forEach(n => { n.vx *= 0.98; n.vy *= 0.98; });
  }, 50);

  const ro = new ResizeObserver(() => { resize(); });
  ro.observe(canvas.parentElement);

  init();
  draw();
})();

/* ── STAGGER REVEAL DELAY ── */
function applyStagger(selector) {
  document.querySelectorAll(selector).forEach((el, i) => {
    el.style.transitionDelay = `${i * 0.08}s`;
  });
}
applyStagger('.vantagem-card.reveal');
applyStagger('.servico-card.reveal');
applyStagger('.numero-card.reveal');
applyStagger('.porque-card.reveal');
applyStagger('.pstep.reveal');

/* ── CONTACT FORM ── */
const form = document.getElementById('contactForm');
if (form) {
  form.addEventListener('submit', e => {
    e.preventDefault();
    const btn = form.querySelector('button[type="submit"]');
    btn.disabled = true;
    btn.innerHTML = '<span>Enviando...</span>';

    setTimeout(() => {
      form.reset();
      btn.disabled = false;
      btn.innerHTML = '<span>Solicitar Diagnóstico Gratuito</span><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M5 12h14M12 5l7 7-7 7"/></svg>';
      showToast('Mensagem enviada! Entraremos em contato em até 24h.');
    }, 1600);
  });
}

function showToast(message) {
  let toast = document.querySelector('.toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.className = 'toast';
    toast.innerHTML = `
      <svg class="toast-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
        <polyline points="22 4 12 14.01 9 11.01"/>
      </svg>
      <span></span>
    `;
    document.body.appendChild(toast);
  }
  toast.querySelector('span').textContent = message;
  requestAnimationFrame(() => toast.classList.add('show'));
  setTimeout(() => {
    toast.classList.remove('show');
  }, 4000);
}

/* ── ACTIVE NAV HIGHLIGHT ── */
const sections = document.querySelectorAll('section[id]');
const navAnchors = document.querySelectorAll('.nav-links a[href^="#"]');

const sectionObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      navAnchors.forEach(a => {
        a.classList.toggle('nav-active', a.getAttribute('href') === `#${entry.target.id}`);
      });
    }
  });
}, { rootMargin: '-40% 0px -55% 0px' });

sections.forEach(s => sectionObserver.observe(s));

/* Inject nav-active style */
const styleTag = document.createElement('style');
styleTag.textContent = `
  .nav-links a.nav-active:not(.nav-cta) {
    color: #fff !important;
    position: relative;
  }
  .nav-links a.nav-active:not(.nav-cta)::after {
    content: '';
    position: absolute;
    bottom: -4px;
    left: 0; right: 0;
    height: 2px;
    background: var(--blue-electric);
    border-radius: 2px;
  }
`;
document.head.appendChild(styleTag);
