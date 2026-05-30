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

  let W, H, nodes, packets, pulses;

  const NODE_COUNT = 65;
  const MAX_DIST   = 190;
  const SPEED      = 0.45;

  function resize() {
    W = canvas.width  = window.innerWidth;
    H = canvas.height = window.innerHeight;
  }

  function makeNode() {
    return {
      x: Math.random() * W,
      y: Math.random() * H,
      vx: (Math.random() - 0.5) * SPEED,
      vy: (Math.random() - 0.5) * SPEED,
      r: Math.random() * 2.5 + 1,
      pulse: Math.random() * Math.PI * 2,
      pulseSpeed: 0.018 + Math.random() * 0.012,
    };
  }

  /* pacote de dados viajando de nó A → nó B */
  function spawnPacket() {
    const a = nodes[Math.floor(Math.random() * nodes.length)];
    const b = nodes[Math.floor(Math.random() * nodes.length)];
    if (a === b) return;
    const dist = Math.hypot(b.x - a.x, b.y - a.y);
    if (dist > MAX_DIST) return;
    packets.push({ ax: a.x, ay: a.y, bx: b.x, by: b.y, t: 0, speed: 0.012 + Math.random() * 0.01 });
  }

  /* onda de pulso saindo de um nó */
  function spawnPulse() {
    const n = nodes[Math.floor(Math.random() * nodes.length)];
    pulses.push({ x: n.x, y: n.y, r: 0, maxR: 60 + Math.random() * 60, alpha: 0.7 });
  }

  function init() {
    resize();
    nodes   = Array.from({ length: NODE_COUNT }, makeNode);
    packets = [];
    pulses  = [];
    for (let i = 0; i < 6; i++) spawnPacket(); // burst inicial
    setInterval(() => { for (let i = 0; i < 4; i++) spawnPacket(); }, 120);
    setInterval(spawnPulse, 1200);
  }

  function draw() {
    ctx.clearRect(0, 0, W, H);

    /* ── pulses ── */
    pulses.forEach((p, i) => {
      p.r     += 1.4;
      p.alpha -= 0.012;
      if (p.alpha <= 0) { pulses.splice(i, 1); return; }
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(0, 119, 255, ${p.alpha * 0.5})`;
      ctx.lineWidth = 1.5;
      ctx.stroke();
    });

    /* ── edges ── */
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const a = nodes[i], b = nodes[j];
        const dx = b.x - a.x, dy = b.y - a.y;
        const dist = Math.hypot(dx, dy);
        if (dist > MAX_DIST) continue;
        const alpha = (1 - dist / MAX_DIST) * 0.28;
        /* linha gradiente de cor dinâmica */
        const grad = ctx.createLinearGradient(a.x, a.y, b.x, b.y);
        const hue1 = 210 + Math.sin(a.pulse) * 20;
        const hue2 = 210 + Math.sin(b.pulse) * 20;
        grad.addColorStop(0, `hsla(${hue1}, 100%, 55%, ${alpha})`);
        grad.addColorStop(1, `hsla(${hue2}, 100%, 55%, ${alpha})`);
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
        ctx.strokeStyle = grad;
        ctx.lineWidth = 0.8;
        ctx.stroke();
      }
    }

    /* ── packets (bolinhas nos fios) ── */
    packets.forEach((p, i) => {
      p.t += p.speed;
      if (p.t >= 1) { packets.splice(i, 1); return; }
      const x = p.ax + (p.bx - p.ax) * p.t;
      const y = p.ay + (p.by - p.ay) * p.t;
      /* trilha */
      for (let k = 1; k <= 5; k++) {
        const tr = p.t - k * 0.025;
        if (tr < 0) continue;
        const tx = p.ax + (p.bx - p.ax) * tr;
        const ty = p.ay + (p.by - p.ay) * tr;
        ctx.beginPath();
        ctx.arc(tx, ty, 1.5 - k * 0.2, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(0, 200, 255, ${0.35 - k * 0.06})`;
        ctx.fill();
      }
      /* ponto principal */
      ctx.beginPath();
      ctx.arc(x, y, 3, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(0, 220, 255, 0.95)';
      ctx.fill();
      /* micro glow */
      const g = ctx.createRadialGradient(x, y, 0, x, y, 10);
      g.addColorStop(0, 'rgba(0, 200, 255, 0.3)');
      g.addColorStop(1, 'transparent');
      ctx.beginPath();
      ctx.arc(x, y, 10, 0, Math.PI * 2);
      ctx.fillStyle = g;
      ctx.fill();
    });

    /* ── nodes ── */
    nodes.forEach(n => {
      n.pulse += n.pulseSpeed;
      const glow = (Math.sin(n.pulse) + 1) / 2;

      /* halo */
      const halo = ctx.createRadialGradient(n.x, n.y, 0, n.x, n.y, (n.r + 5) * 4);
      halo.addColorStop(0, `rgba(0, 119, 255, ${0.15 * glow})`);
      halo.addColorStop(1, 'transparent');
      ctx.beginPath();
      ctx.arc(n.x, n.y, (n.r + 5) * 4, 0, Math.PI * 2);
      ctx.fillStyle = halo;
      ctx.fill();

      /* nó */
      ctx.beginPath();
      ctx.arc(n.x, n.y, n.r + glow * 1.8, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${40 + glow * 60}, ${140 + glow * 60}, 255, ${0.5 + glow * 0.4})`;
      ctx.fill();

      /* move */
      n.x += n.vx; n.y += n.vy;
      if (n.x < -20) n.x = W + 20;
      if (n.x > W + 20) n.x = -20;
      if (n.y < -20) n.y = H + 20;
      if (n.y > H + 20) n.y = -20;
    });

    requestAnimationFrame(draw);
  }

  /* ── mouse repulsion ── */
  document.addEventListener('mousemove', e => {
    const mx = e.clientX, my = e.clientY;
    nodes.forEach(n => {
      const dx = n.x - mx, dy = n.y - my;
      const dist = Math.hypot(dx, dy);
      if (dist < 110) {
        const f = (110 - dist) / 110 * 0.7;
        n.vx += (dx / dist) * f;
        n.vy += (dy / dist) * f;
        const spd = Math.hypot(n.vx, n.vy);
        if (spd > SPEED * 5) { n.vx = n.vx / spd * SPEED * 5; n.vy = n.vy / spd * SPEED * 5; }
      }
    });
    /* spawn pulse on fast move */
    if (Math.random() < 0.04) spawnPulse();
  });

  /* ── click cria onda ── */
  document.addEventListener('click', e => {
    pulses.push({ x: e.clientX, y: e.clientY, r: 0, maxR: 120, alpha: 0.9 });
  });

  setInterval(() => { nodes.forEach(n => { n.vx *= 0.97; n.vy *= 0.97; }); }, 60);

  window.addEventListener('resize', resize, { passive: true });
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
