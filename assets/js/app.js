/* =========================================================
   CONFIGURACIÓN · cambia solo esta parte para cada negocio
   ========================================================= */
const CONFIG = {
  // WhatsApp que recibe las cotizaciones: 52 + 10 dígitos, sin espacios ni signos.
  whatsapp: '524441107319',
  // Teléfono del negocio (10 dígitos). Hoy no se muestra botón de llamar; déjalo vacío si no hay.
  telefono: '',

  businessName: 'Reforma Innovare',
  city: 'Monterrey',

  // Promesas del negocio. Se muestran en el inicio, en la franja de confianza y junto al filtro.
  // Cámbialas aquí para cada cliente (escribe solo lo que el negocio sí cumple).
  promesaRespuesta: 'Respuesta el mismo día hábil',
  promesaVisita: 'Visita y medidas sin costo',
  promesaPresupuesto: 'Presupuesto por escrito',

  // Presupuesto mínimo que acepta el negocio (en pesos). Debajo de esto, no deja enviar.
  minBudget: 30000,

  // Opciones de presupuesto. "max" es el tope del rango; si max <= minBudget, el rango no califica.
  budgets: [
    { label: 'Menos de $30,000', sub: 'Reparaciones y detalles', max: 30000 },
    { label: '$30,000 a $80,000', sub: 'Baño o un espacio completo', max: 80000 },
    { label: '$80,000 a $200,000', sub: 'Cocina integral o varios espacios', max: 200000 },
    { label: 'Más de $200,000', sub: 'Remodelación mayor o ampliación', max: Infinity },
  ],

  services: [
    { label: 'Cocina integral', icon: 'cocina' },
    { label: 'Baño', icon: 'bano' },
    { label: 'Impermeabilización', icon: 'techo' },
    { label: 'Pisos y azulejo', icon: 'piso' },
    { label: 'Closets y carpintería', icon: 'closet' },
    { label: 'Muebles de madera', icon: 'mueble' },
    { label: 'Remodelación integral', icon: 'muro' },
  ],
  zones: ['Monterrey', 'San Pedro', 'San Nicolás', 'Guadalupe', 'Apodaca', 'Otra zona'],
  urgency: [
    { label: 'Lo antes posible', sub: 'Quiero empezar este mes', icon: 'rayo' },
    { label: 'En 1 a 3 meses', sub: 'Ya lo tengo planeado', icon: 'calendario' },
    { label: 'Solo estoy cotizando', sub: 'Quiero comparar opciones', icon: 'lupa' },
  ],

  // Ubicación en Google Maps. Vacío hasta que haya una ficha real del negocio.
  // Pon aquí la ficha REAL del negocio (nunca la de otro negocio). Si quedan vacíos, no se muestra ningún enlace.
  mapsUrl: '',
  reviewsUrl: '',
  // Centro de Monterrey (solo referencia de mapa; no es la dirección del negocio).
  mapLat: 25.6866,
  mapLng: -100.3161,

  siteUrl: 'https://remodelaciones.heyelevu.com',
};
/* ========================================================= */

(() => {
  'use strict';
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const money = (n) => '$' + n.toLocaleString('es-MX');
  const fmtTel = (d) => (/^(55|56|33|81)/.test(d)
    ? [d.slice(0, 2), d.slice(2, 6), d.slice(6, 10)]
    : [d.slice(0, 3), d.slice(3, 6), d.slice(6, 10)]).filter(Boolean).join(' ');

  /* ---------- Textos configurables ---------- */
  const cfgText = { ...CONFIG, minBudgetText: money(CONFIG.minBudget) };
  $$('[data-cfg]').forEach((el) => {
    const v = cfgText[el.dataset.cfg];
    if (!v) return;
    if (!el.hasAttribute('data-cfg-bold')) { el.textContent = v; return; }
    // Franja de confianza: la primera palabra va en negritas.
    const sp = String(v).indexOf(' ');
    const b = document.createElement('b');
    b.textContent = sp < 0 ? v : v.slice(0, sp);
    el.replaceChildren(b, sp < 0 ? '' : v.slice(sp));
  });
  const setHref = (id, url) => { const el = document.getElementById(id); if (el && url) el.href = url; };
  setHref('map-link', CONFIG.mapsUrl);
  setHref('review-link', CONFIG.reviewsUrl);
  const call = $('#call-link');
  if (call) {
    const digits = CONFIG.telefono.replace(/\D/g, '');
    if (digits) call.href = 'tel:+52' + digits.slice(-10); else call.remove();
  }

  /* ---------- Prólogo: recorrido de entrada ---------- */
  // Con animation-timeline lo anima CSS (clase intro-css desde la cabecera).
  // Sin soporte, el avance --p (0 a 1) se calcula aquí con requestAnimationFrame.
  // Con reduced-motion no hay escenas: queda la portada estática.
  const root = document.documentElement;
  const track = $('#intro-track');
  const hero = $('#inicio');
  const themeMeta = $('meta[name="theme-color"]');
  const introListeners = [];
  let inIntro = false;
  if (track) {
    const jsDriven = !reduceMotion && !root.classList.contains('intro-css');
    if (jsDriven) root.classList.add('intro-on');
    let ticking = false;
    let lastP = -1;
    const update = () => {
      ticking = false;
      const r = track.getBoundingClientRect();
      if (jsDriven) {
        const span = r.height - window.innerHeight;
        const p = span > 0 ? Math.min(1, Math.max(0, -r.top / span)) : 0;
        if (Math.abs(p - lastP) > 0.0005) { lastP = p; track.style.setProperty('--p', p.toFixed(4)); }
      }
      const now = r.bottom > 72;
      if (now !== inIntro) {
        inIntro = now;
        root.classList.toggle('at-intro', now);
        if (themeMeta) themeMeta.setAttribute('content', now ? '#161310' : '#f3ede3');
        introListeners.forEach((f) => f());
      }
    };
    const request = () => { if (!ticking) { ticking = true; requestAnimationFrame(update); } };
    window.addEventListener('scroll', request, { passive: true });
    window.addEventListener('resize', request);
    inIntro = !root.classList.contains('at-intro');
    update();

    // «Saltar introducción» (y la marca): brinco directo al sitio, sin recorrer las escenas.
    if (hero) {
      document.addEventListener('click', (e) => {
        const a = e.target.closest && e.target.closest('a[href="#inicio"]');
        if (!a) return;
        const top = hero.getBoundingClientRect().top + window.scrollY;
        if (window.scrollY >= top - 2) return;
        e.preventDefault();
        const prev = root.style.scrollBehavior;
        root.style.scrollBehavior = 'auto';
        window.scrollTo(0, top);
        root.style.scrollBehavior = prev;
        hero.focus({ preventScroll: true });
        request();
      });
    }
  } else {
    root.classList.remove('at-intro');
  }

  /* ---------- Aparición al hacer scroll ---------- */
  const reveals = $$('.reveal');
  if (!reduceMotion && 'IntersectionObserver' in window) {
    // Solo aquí se activa el estado oculto inicial: sin JS, todo se ve.
    document.documentElement.classList.add('rv');
    reveals.forEach((el) => {
      const sib = Array.from(el.parentElement.children).filter((c) => c.classList.contains('reveal'));
      const i = sib.indexOf(el);
      if (i > 0) el.style.setProperty('--d', Math.min(i, 3) * 0.06 + 's');
    });
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); } });
    }, { threshold: 0 });
    reveals.forEach((el) => io.observe(el));
    // Respaldo: marca lo que ya entró al viewport o quedó por encima (página recorrida).
    const sweep = () => {
      const h = window.innerHeight || document.documentElement.clientHeight;
      reveals.forEach((el) => {
        if (!el.classList.contains('is-in') && el.getBoundingClientRect().top < h) { el.classList.add('is-in'); io.unobserve(el); }
      });
    };
    sweep();
    requestAnimationFrame(sweep);
    setTimeout(sweep, 200);
    window.addEventListener('scroll', sweep, { passive: true });
    window.addEventListener('resize', sweep);
    window.addEventListener('load', sweep);
  }

  /* ---------- Escenario de categorías: pestañas con crossfade ---------- */
  const showcase = $('#showcase');
  if (showcase) {
    const tabs = $$('[role="tab"]', showcase);
    const panels = tabs.map((t) => document.getElementById(t.getAttribute('aria-controls')));
    const list = $('[role="tablist"]', showcase);
    let cur = Math.max(0, tabs.findIndex((t) => t.getAttribute('aria-selected') === 'true'));
    const select = (i, focus = false) => {
      cur = (i + tabs.length) % tabs.length;
      tabs.forEach((t, k) => {
        const on = k === cur;
        t.setAttribute('aria-selected', String(on));
        t.tabIndex = on ? 0 : -1;
        panels[k].classList.toggle('is-active', on);
      });
      if (focus) tabs[cur].focus({ preventScroll: true });
      // En celular la fila de pestañas se desliza para dejar visible la activa.
      if (list.scrollWidth > list.clientWidth + 2) {
        const t = tabs[cur];
        list.scrollTo({ left: t.offsetLeft - (list.clientWidth - t.offsetWidth) / 2, behavior: reduceMotion ? 'auto' : 'smooth' });
      }
    };
    // Avance automático solo con movimiento permitido: se detiene al primer toque y se pausa fuera de pantalla.
    const stopAuto = () => showcase.classList.remove('is-auto');
    tabs.forEach((t, k) => t.addEventListener('click', () => { stopAuto(); select(k); }));
    list.addEventListener('keydown', (e) => {
      const to = { ArrowRight: cur + 1, ArrowDown: cur + 1, ArrowLeft: cur - 1, ArrowUp: cur - 1, Home: 0, End: tabs.length - 1 }[e.key];
      if (to === undefined) return;
      e.preventDefault(); stopAuto(); select(to, true);
    });
    if (!reduceMotion && 'IntersectionObserver' in window) {
      showcase.classList.add('is-auto', 'is-paused');
      new IntersectionObserver(([e]) => showcase.classList.toggle('is-paused', !e.isIntersecting), { threshold: 0.35 }).observe(showcase);
      showcase.addEventListener('animationend', (e) => { if (e.animationName === 'tabfill' && showcase.classList.contains('is-auto')) select(cur + 1); });
    }
  }

  /* ---------- Estado activo: menú y barra de categorías ---------- */
  const spy = (links) => {
    const pairs = links.map((a) => [document.getElementById(a.getAttribute('href').slice(1)), a]).filter(([el]) => el);
    if (!pairs.length || !('IntersectionObserver' in window)) return;
    const seen = new Set();
    let last = null;
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => { if (e.isIntersecting) seen.add(e.target); else seen.delete(e.target); });
      let act = null;
      pairs.forEach(([el, a]) => { if (seen.has(el)) act = a; });
      if (act === last) return;
      last = act;
      links.forEach((a) => { if (a === act) a.setAttribute('aria-current', 'true'); else a.removeAttribute('aria-current'); });
      const row = act && act.parentElement;
      if (row && row.scrollWidth > row.clientWidth + 2) row.scrollTo({ left: act.offsetLeft - (row.clientWidth - act.offsetWidth) / 2, behavior: reduceMotion ? 'auto' : 'smooth' });
    }, { rootMargin: '-38% 0px -58% 0px' });
    pairs.forEach(([el]) => io.observe(el));
  };
  spy($$('.nav a'));
  spy($$('#catbar a'));

  /* ---------- Galería con vista ampliada ---------- */
  const lb = $('#lightbox');
  const items = $$('.g__btn');
  if (lb && items.length && typeof lb.showModal === 'function') {
    const img = document.createElement('img'); img.id = 'lb-img'; img.alt = '';
    $('#lb-fig').prepend(img);
    const t = $('#lb-title'); const m = $('#lb-meta');
    let cur = 0; let opener = null;
    const show = (i) => {
      cur = (i + items.length) % items.length;
      const b = items[cur];
      img.src = b.dataset.full; img.alt = b.dataset.title + ': ' + b.dataset.meta;
      t.textContent = b.dataset.title; m.textContent = b.dataset.meta;
      img.style.animation = 'none'; void img.offsetWidth; img.style.animation = '';
    };
    items.forEach((b, i) => b.addEventListener('click', () => { opener = b; show(i); lb.showModal(); }));
    $('#lb-prev').addEventListener('click', () => show(cur - 1));
    $('#lb-next').addEventListener('click', () => show(cur + 1));
    $('#lb-close').addEventListener('click', () => lb.close());
    lb.addEventListener('click', (e) => { if (e.target === lb || e.target.tagName === 'FIGURE') lb.close(); });
    lb.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowRight') show(cur + 1);
      if (e.key === 'ArrowLeft') show(cur - 1);
    });
    lb.addEventListener('close', () => { if (opener) opener.focus(); });
    // Deslizar con el dedo
    let x0 = null;
    lb.addEventListener('touchstart', (e) => { x0 = e.touches[0].clientX; }, { passive: true });
    lb.addEventListener('touchend', (e) => {
      if (x0 === null) return;
      const dx = e.changedTouches[0].clientX - x0;
      if (Math.abs(dx) > 50) show(cur + (dx < 0 ? 1 : -1));
      x0 = null;
    });
  } else {
    // Sin <dialog>: abrir la foto directo
    items.forEach((b) => b.addEventListener('click', () => window.open(b.dataset.full, '_blank')));
  }

  /* ---------- Iconos del formulario ---------- */
  const ICONS = {
    cocina: '<path d="M6 22h36v18H6zM6 28h36M18 22v18M30 22v18M10 6h28v10H10zM22 32h-6M34 32h-6"/>',
    bano: '<path d="M6 24h36v5a11 11 0 0 1-11 11H17A11 11 0 0 1 6 29zM12 24V11a4 4 0 0 1 8 0v1M15 40l-2 4M33 40l2 4"/>',
    techo: '<path d="M4 22 24 8l20 14M9 19v21h30V19"/><path d="M18 28c0 2-2 3-2 5a2 2 0 0 0 4 0c0-2-2-3-2-5zM30 26c0 2-2 3-2 5a2 2 0 0 0 4 0c0-2-2-3-2-5z"/>',
    piso: '<path d="M6 6h36v36H6zM6 18h36M6 30h36M18 6v36M30 6v36"/>',
    closet: '<path d="M8 4h32v40H8zM24 4v40M19 22v6M29 22v6M8 38h32"/>',
    mueble: '<path d="M6 14h36v20H6zM6 24h36M20 18h8M20 28h8M10 34v6M38 34v6"/>',
    muro: '<path d="M4 10h40v30H4zM4 20h40M4 30h40M16 10v10M32 10v10M10 20v10M24 20v10M38 20v10M16 30v10M32 30v10"/>',
    rayo: '<path d="M26 4 10 27h12l-2 17 16-23H24z"/>',
    calendario: '<path d="M6 10h36v32H6zM6 19h36M15 4v10M33 4v10M14 27h4M22 27h4M30 27h4M14 34h4M22 34h4"/>',
    lupa: '<circle cx="21" cy="21" r="13"/><path d="m31 31 12 12"/>',
  };
  const svg = (name) => `<svg viewBox="0 0 48 48" aria-hidden="true">${ICONS[name] || ''}</svg>`;

  /* ---------- Formulario de 4 pasos ---------- */
  const form = $('#filtro');
  if (form) {
    const state = { tipo: '', zona: '', urgencia: '', presupuesto: null };
    const steps = $$('.wz-step', form);
    const btnNext = $('#wz-next');
    const btnBack = $('#wz-back');
    const btnSend = $('#wz-send');
    const count = $('#wz-count');
    const bar = $('#wz-bar');
    const progress = $('#wz-progress');
    const eta = $('#wz-eta');
    const picked = $('#wz-picked');
    const lowBox = $('#wz-low');
    const zonaOtra = $('#zona-otra');
    const nombre = $('#f-nombre');
    const tel = $('#f-tel');
    let current = 1;
    let pointerPick = false;

    const qualifies = (b) => b && b.max > CONFIG.minBudget;

    const tile = (name, i, html, extra = '') => {
      const label = document.createElement('label');
      label.className = 'tile ' + extra;
      label.innerHTML = `<input type="radio" name="${name}" value="${i}"><span class="tile__body">${html}</span>`;
      return label;
    };
    const esc = (t) => String(t).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

    CONFIG.services.forEach((s, i) => $('#opt-tipo').append(tile('tipo', i, `${svg(s.icon)}<span>${esc(s.label)}</span>`)));
    CONFIG.zones.forEach((z, i) => $('#opt-zona').append(tile('zona', i, `<span>${esc(z)}</span>`)));
    if (!CONFIG.zones.length) $('#opt-zona').remove();
    CONFIG.urgency.forEach((u, i) => $('#opt-urgencia').append(tile('urgencia', i, `${svg(u.icon)}<span>${esc(u.label)}<span class="tile__sub">${esc(u.sub)}</span></span>`)));
    CONFIG.budgets.forEach((b, i) => {
      const lvl = Math.min(4, i + 1);
      const barsHtml = `<span class="bars" aria-hidden="true">${[1, 2, 3, 4].map((n) => `<i class="${n <= lvl ? 'on' : ''}"></i>`).join('')}</span>`;
      $('#opt-presupuesto').append(tile('presupuesto', i, `${barsHtml}<span>${esc(b.label)}<span class="tile__sub">${esc(b.sub || '')}</span></span>`, qualifies(b) ? '' : 'tile--low'));
    });

    const canAdvance = () => {
      switch (current) {
        case 1: return !!state.tipo;
        case 2: return !!state.zona;
        case 3: return !!state.urgencia;
        case 4: return qualifies(state.presupuesto);
        default: return true;
      }
    };
    const refresh = () => { btnNext.disabled = !canAdvance(); };

    const renderPicked = () => {
      const vals = [state.tipo, current > 2 && state.zona, current > 3 && state.urgencia].filter(Boolean);
      picked.replaceChildren(...vals.map((v) => { const s = document.createElement('span'); s.textContent = v; return s; }));
    };

    const show = (n, focus = true) => {
      current = n;
      steps.forEach((s) => { const on = Number(s.dataset.step) === n; s.hidden = !on; s.classList.toggle('is-active', on); });
      const done = n === 6;
      form.classList.toggle('is-done', done);
      btnBack.hidden = n === 1 || done;
      btnNext.hidden = n >= 5;
      btnSend.hidden = n !== 5;
      count.textContent = n <= 4 ? `Pregunta ${n} de 4` : 'Tus datos para contestarte';
      const pct = Math.min(100, n * 20);
      bar.style.width = pct + '%';
      progress.setAttribute('aria-valuenow', String(pct));
      eta.textContent = n <= 2 ? 'Menos de 1 minuto' : n <= 4 ? 'Ya casi' : 'Listo para enviar';
      if (n === 5) renderSummary();
      renderPicked();
      refresh();
      if (focus) {
        const target = done ? steps[5] : $('legend', steps[n - 1]);
        if (target) { if (!target.hasAttribute('tabindex')) target.setAttribute('tabindex', '-1'); target.focus({ preventScroll: true }); }
        const top = form.getBoundingClientRect().top;
        if (top < 70 || top > window.innerHeight * 0.5) form.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' });
      }
    };

    form.addEventListener('pointerdown', (e) => { if (e.target.closest('.tile')) pointerPick = true; });

    form.addEventListener('change', (e) => {
      const t = e.target;
      if (t.type !== 'radio') return;
      const i = Number(t.value);
      if (t.name === 'tipo') state.tipo = CONFIG.services[i].label;
      if (t.name === 'zona') { state.zona = CONFIG.zones[i]; zonaOtra.value = ''; }
      if (t.name === 'urgencia') state.urgencia = CONFIG.urgency[i].label;
      if (t.name === 'presupuesto') {
        state.presupuesto = CONFIG.budgets[i];
        const ok = qualifies(state.presupuesto);
        lowBox.hidden = ok;
        if (!ok) {
          $('#wz-low-msg').textContent = `Por ahora tomamos obras desde ${money(CONFIG.minBudget)}. Si tu proyecto crece o quieres juntar varios trabajos, aquí estaremos para cotizarte.`;
          const lbl = t.closest('.tile');
          if (lbl && !reduceMotion) { lbl.classList.remove('is-shake'); void lbl.offsetWidth; lbl.classList.add('is-shake'); }
          requestAnimationFrame(() => {
            const r = lowBox.getBoundingClientRect();
            if (r.bottom > window.innerHeight || r.top < 70) lowBox.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'center' });
          });
        }
      }
      refresh();
      const auto = pointerPick && canAdvance();
      pointerPick = false;
      if (auto && current < 5) setTimeout(() => { if (canAdvance()) show(current + 1); }, reduceMotion ? 0 : 320);
    });

    zonaOtra.addEventListener('input', () => {
      const v = zonaOtra.value.trim();
      if (v) $$('input[name="zona"]', form).forEach((r) => { r.checked = false; });
      state.zona = v.length >= 3 ? v : ($('input[name="zona"]:checked', form) ? state.zona : '');
      refresh();
    });
    zonaOtra.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); if (canAdvance()) show(3); } });

    btnNext.addEventListener('click', () => { if (canAdvance()) show(current + 1); });
    $('#wz-low-back').addEventListener('click', () => {
      const ok = $$('input[name="presupuesto"]', form).find((r) => qualifies(CONFIG.budgets[Number(r.value)]));
      if (ok) ok.focus();
    });
    btnBack.addEventListener('click', () => { if (current > 1) show(current - 1); });

    tel.addEventListener('input', () => {
      let d = tel.value.replace(/\D/g, '');
      // Quita prefijos que la gente suele escribir: +52, 52 1, 044, 045, 01.
      if (d.length > 10) d = d.replace(/^(521|52|044|045|01|1)/, '');
      d = d.slice(0, 10);
      tel.value = fmtTel(d);
      if (tel.getAttribute('aria-invalid') === 'true' && d.length === 10) setErr(tel, '#err-tel', false);
    });
    nombre.addEventListener('input', () => { if (nombre.value.trim().length >= 2) setErr(nombre, '#err-nombre', false); });

    function setErr(input, errSel, on) {
      input.setAttribute('aria-invalid', on ? 'true' : 'false');
      const err = $(errSel);
      err.hidden = !on;
      if (on) input.setAttribute('aria-describedby', err.id); else input.removeAttribute('aria-describedby');
    }

    function renderSummary() {
      const rows = [['Obra', state.tipo], ['Zona', state.zona], ['Para cuándo', state.urgencia], ['Presupuesto', state.presupuesto && state.presupuesto.label]];
      const dl = document.createElement('dl');
      rows.forEach(([k, v]) => {
        const dt = document.createElement('dt'); dt.textContent = k;
        const dd = document.createElement('dd'); dd.textContent = v || '—';
        dl.append(dt, dd);
      });
      $('#wz-summary').replaceChildren(dl);
    }

    function buildMessage() {
      const t = tel.value.replace(/\D/g, '');
      return [
        'Hola, vi su página y quiero cotizar una obra.',
        '',
        `• Obra: ${state.tipo}`,
        `• Zona: ${state.zona}`,
        `• Presupuesto: ${state.presupuesto.label}`,
        `• Para cuándo: ${state.urgencia}`,
        `• Nombre: ${nombre.value.trim()}`,
        `• Teléfono: ${fmtTel(t)}`,
      ].join('\n');
    }

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      if (current !== 5) { if (canAdvance()) show(current + 1); return; }
      const nOk = nombre.value.trim().length >= 2;
      const tOk = tel.value.replace(/\D/g, '').length === 10;
      setErr(nombre, '#err-nombre', !nOk);
      setErr(tel, '#err-tel', !tOk);
      if (!nOk) { nombre.focus(); return; }
      if (!tOk) { tel.focus(); return; }
      if (!qualifies(state.presupuesto)) { show(4); return; }
      const url = `https://wa.me/${CONFIG.whatsapp.replace(/\D/g, '')}?text=${encodeURIComponent(buildMessage())}`;
      $('#wz-reopen').href = url;
      // window.open con 'noopener' siempre devuelve null; se corta el vínculo a mano.
      const win = window.open(url, '_blank');
      if (win) { try { win.opener = null; } catch (_) { /* sin acceso */ } } else window.location.href = url;
      show(6);
    });

    $('#wz-restart').addEventListener('click', () => {
      form.reset();
      Object.assign(state, { tipo: '', zona: '', urgencia: '', presupuesto: null });
      lowBox.hidden = true;
      $$('[aria-invalid]', form).forEach((el) => el.removeAttribute('aria-invalid'));
      show(1);
    });

    show(1, false);
  }

  /* ---------- Barra fija en celular ---------- */
  const mbar = $('#mbar');
  // Aparece en cuanto el botón principal del inicio sale de la pantalla
  // y se oculta mientras el filtro está a la vista, para no tapar las opciones.
  const heroCta = $('.hero__ctas');
  const quote = $('#filtro');
  if (mbar && heroCta && 'IntersectionObserver' in window) {
    let ctaVisible = true; let quoteVisible = false;
    // Durante el prólogo tampoco aparece: el encabezado ya tiene «Cotizar».
    const upd = () => mbar.classList.toggle('is-on', !ctaVisible && !quoteVisible && !inIntro);
    introListeners.push(upd);
    new IntersectionObserver(([e]) => { ctaVisible = e.isIntersecting; upd(); }, { threshold: 0 }).observe(heroCta);
    if (quote) new IntersectionObserver(([e]) => { quoteVisible = e.isIntersecting; upd(); }, { threshold: 0 }).observe(quote);
  } else if (mbar) {
    mbar.classList.add('is-on');
  }

  /* ---------- Video del inicio ---------- */
  const promo = $('#promo');
  if (promo) {
    if (reduceMotion) { promo.removeAttribute('autoplay'); promo.pause(); }
    else if ('IntersectionObserver' in window) {
      new IntersectionObserver(([e]) => { if (e.isIntersecting) { const p = promo.play(); if (p && p.catch) p.catch(() => {}); } else if (promo.muted) promo.pause(); }, { threshold: 0.15 }).observe(promo);
    }
    const snd = $('#sound');
    const sndT = $('#sound-t');
    if (snd) {
      const setUi = (on) => { snd.setAttribute('aria-pressed', String(on)); sndT.textContent = on ? 'Silenciar' : 'Activar sonido'; };
      snd.addEventListener('click', () => {
        if (promo.muted) {
          // iOS: quitar el silencio dentro del toque del usuario y reproducir desde el inicio.
          promo.muted = false; promo.currentTime = 0;
          const p = promo.play();
          if (p && p.catch) p.catch(() => { promo.muted = true; setUi(false); });
          setUi(true);
        } else { promo.muted = true; setUi(false); }
      });
    }
  }

})();
