/* ============================================================
   NEIDE COSMÉTICOS — main.js
   ============================================================ */
(function () {
  'use strict';

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- Menu mobile ---------- */
  const toggle = document.getElementById('navToggle');
  const links  = document.getElementById('navLinks');
  const setMenu = (open) => {
    links.classList.toggle('open', open);
    toggle.setAttribute('aria-expanded', String(open));
    toggle.querySelector('i').className = open ? 'fa-solid fa-xmark' : 'fa-solid fa-bars';
  };
  toggle.addEventListener('click', () => setMenu(!links.classList.contains('open')));
  links.querySelectorAll('a').forEach(a => a.addEventListener('click', () => setMenu(false)));

  /* ---------- Animações de entrada (IntersectionObserver) ----------
     rootMargin de 50px embaixo + threshold 0.05: o card começa a aparecer um pouco ANTES
     de entrar na tela, evitando buracos vazios durante a rolagem. */
  const revealEls = document.querySelectorAll('.reveal');
  const REVEAL_CLASSES = ['reveal', 'visible', 'left', 'right', 'd1', 'd2', 'd3', 'd4'];

  if ('IntersectionObserver' in window && !reduceMotion) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach(e => {
        if (!e.isIntersecting) return;
        const el = e.target;
        el.classList.add('visible');
        io.unobserve(el);
        // Depois da animação, remove as classes para o hover do card (.glass) voltar a funcionar
        setTimeout(() => el.classList.remove(...REVEAL_CLASSES), 900);
      });
    }, { threshold: 0.05, rootMargin: '0px 0px 50px 0px' });
    revealEls.forEach(el => io.observe(el));
  } else {
    revealEls.forEach(el => el.classList.remove(...REVEAL_CLASSES));
  }

  /* ---------- Pausa animações de seções fora da tela ---------- */
  const sections = document.querySelectorAll('section');
  if ('IntersectionObserver' in window) {
    const ioView = new IntersectionObserver((entries) => {
      entries.forEach(e => e.target.classList.toggle('in-view', e.isIntersecting));
    }, { rootMargin: '120px 0px' });
    sections.forEach(s => ioView.observe(s));
  } else {
    sections.forEach(s => s.classList.add('in-view'));
  }

  /* ---------- Botão flutuante do WhatsApp (scroll leve, 1 leitura por frame) ---------- */
  const waFloat = document.getElementById('waFloat');
  let ticking = false, shown = false;
  const onScroll = () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => {
      const should = window.scrollY > 320;
      if (should !== shown) { shown = should; waFloat.classList.toggle('show', should); }
      ticking = false;
    });
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  /* ---------- Aberto / Fechado (fuso de Brasília) ---------- */
  const statusEl = document.getElementById('openStatus');
  function updateStatus() {
    let weekday, hour, minute;
    try {
      const parts = new Intl.DateTimeFormat('en-US', {
        timeZone: 'America/Sao_Paulo', weekday: 'short',
        hour: '2-digit', minute: '2-digit', hourCycle: 'h23'
      }).formatToParts(new Date());
      weekday = parts.find(p => p.type === 'weekday').value;   // Mon, Tue, ... Sun
      hour    = parseInt(parts.find(p => p.type === 'hour').value, 10) % 24;
      minute  = parseInt(parts.find(p => p.type === 'minute').value, 10);
    } catch (err) {
      const d = new Date();                                    // fallback: horário do navegador
      weekday = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][d.getDay()];
      hour = d.getHours(); minute = d.getMinutes();
    }
    const mins = hour * 60 + minute;
    const OPEN = 8 * 60 + 30, CLOSE = 19 * 60 + 30;            // 08h30 – 19h30
    const isOpen = weekday !== 'Sun' && mins >= OPEN && mins < CLOSE;
    statusEl.textContent = isOpen ? '● Aberto Agora' : '● Fechado no momento';
    statusEl.classList.toggle('open', isOpen);
    statusEl.classList.toggle('closed', !isOpen);
  }
  updateStatus();
  setInterval(updateStatus, 60 * 1000);

  /* ---------- Estrelas cintilantes (Canvas leve) ----------
     - sprites pré-renderizados (sem shadowBlur, que é muito pesado)
     - 30 fps, poucas estrelas, pausa com a aba oculta
     - só recria as estrelas se a LARGURA mudar (no celular, a barra do navegador
       muda a altura ao rolar e disparava resize → travadas) */
  const canvas = document.getElementById('stars');
  const ctx = canvas.getContext('2d');
  const colors = ['#eaf4ff', '#4fb3ff', '#a78bfa', '#f472b6'];
  const FRAME = 1000 / 30;
  let sprites = [], stars = [], w = 0, h = 0, dpr = 1, raf = 0, last = 0, lastWidth = 0, resizeTimer = 0;

  function makeSprite(color) {
    const s = 32, c = document.createElement('canvas');
    c.width = c.height = s;
    const g = c.getContext('2d');
    const grad = g.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
    grad.addColorStop(0, '#fff');
    grad.addColorStop(0.18, color);
    grad.addColorStop(0.5, color + '55');
    grad.addColorStop(1, color + '00');
    g.fillStyle = grad;
    g.fillRect(0, 0, s, s);
    return c;
  }
  sprites = colors.map(makeSprite);

  function build() {
    dpr = 1; // pontinhos de fundo não precisam de devicePixelRatio
    lastWidth = window.innerWidth;
    w = canvas.width  = Math.round(window.innerWidth  * dpr);
    h = canvas.height = Math.round(window.innerHeight * dpr);
    const count = Math.round(Math.min(60, (window.innerWidth * window.innerHeight) / 14000));
    stars = Array.from({ length: count }, () => ({
      x: Math.random() * w, y: Math.random() * h,
      r: (Math.random() * 3 + 2.5) * dpr,                 // raio do sprite (glow incluso)
      k: (Math.random() * sprites.length) | 0,
      s: Math.random() * 0.0016 + 0.0006,                 // velocidade do cintilar
      p: Math.random() * Math.PI * 2,
      dy: (Math.random() * 0.03 + 0.008) * dpr            // deriva lenta para cima
    }));
    draw(0);
  }

  function draw(t) {
    ctx.clearRect(0, 0, w, h);
    for (const s of stars) {
      ctx.globalAlpha = 0.3 + 0.7 * Math.abs(Math.sin(s.p + t * s.s));
      ctx.drawImage(sprites[s.k], s.x - s.r, s.y - s.r, s.r * 2, s.r * 2);
      if (!reduceMotion) {
        s.y -= s.dy;
        if (s.y < -8) { s.y = h + 8; s.x = Math.random() * w; }
      }
    }
    ctx.globalAlpha = 1;
  }

  function loop(t) {
    raf = requestAnimationFrame(loop);
    if (t - last < FRAME) return;
    last = t;
    draw(t);
  }

  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => { if (window.innerWidth !== lastWidth) build(); }, 200);
  });
  document.addEventListener('visibilitychange', () => {
    if (reduceMotion) return;
    if (document.hidden) cancelAnimationFrame(raf); else raf = requestAnimationFrame(loop);
  });

  build();
  if (!reduceMotion) raf = requestAnimationFrame(loop);
})();
