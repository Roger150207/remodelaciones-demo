/* =========================================================
   CONFIGURACIÓN · cambia solo esta parte para cada negocio
   ========================================================= */
const CONFIG = {
  // WhatsApp que recibe las cotizaciones: 52 + 10 dígitos, sin espacios ni signos.
  whatsapp: '524441107319',
  // Teléfono para el botón "Llamar" en celular (10 dígitos). Déjalo vacío '' para ocultarlo.
  telefono: '',

  businessName: 'Remodelaciones Tu Nombre',
  city: 'San Luis Potosí',

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
    { label: 'Remodelación integral', icon: 'muro' },
  ],
  zones: ['Centro', 'Lomas', 'Tangamanga', 'Pozos', 'Soledad', 'Otra zona'],
  urgency: [
    { label: 'Lo antes posible', sub: 'Quiero empezar este mes', icon: 'rayo' },
    { label: 'En 1 a 3 meses', sub: 'Ya lo tengo planeado', icon: 'calendario' },
    { label: 'Solo estoy cotizando', sub: 'Quiero comparar opciones', icon: 'lupa' },
  ],

  // Ubicación en Google Maps (ficha del negocio, reseñas y mapa incrustado).
  mapsUrl: 'https://www.google.com/maps/place/Casa+del+Valle:+Decks,+Tapices,+Cortinas+y+Persianas/@25.6611881,-100.3029777,17z/data=!3m1!4b1!4m6!3m5!1s0x8662bfcce28db05f:0x23b0aa2322c97a64!8m2!3d25.6611881!4d-100.3029777!16s%2Fg%2F1th49tw7',
  reviewsUrl: 'https://www.google.com/maps/place/Casa+del+Valle:+Decks,+Tapices,+Cortinas+y+Persianas/@25.6611881,-100.3029777,17z/data=!3m1!4b1!4m6!3m5!1s0x8662bfcce28db05f:0x23b0aa2322c97a64!8m2!3d25.6611881!4d-100.3029777!16s%2Fg%2F1th49tw7',
  mapLat: 25.6611881,
  mapLng: -100.3029777,

  siteUrl: 'https://remodelaciones.heyelevu.com',
};
/* ========================================================= */

(() => {
  'use strict';
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const money = (n) => '$' + n.toLocaleString('es-MX');

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

  /* ---------- Aparición al hacer scroll ---------- */
  const reveals = $$('.reveal');
  if (reduceMotion || !('IntersectionObserver' in window)) {
    reveals.forEach((el) => el.classList.add('is-in'));
  } else {
    reveals.forEach((el) => {
      const sib = Array.from(el.parentElement.children).filter((c) => c.classList.contains('reveal'));
      const i = sib.indexOf(el);
      if (i > 0) el.style.setProperty('--d', Math.min(i, 5) * 0.09 + 's');
    });
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); } });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
    reveals.forEach((el) => io.observe(el));
  }

  /* ---------- Hero: presentación de fotos tipo video ---------- */
  const hero = $('.hero');
  const slides = $$('.hero__slide');
  const bars = $('#reel-bars');
  const capEl = $('#reel-cap');
  const toggle = $('#reel-toggle');
  if (hero && slides.length && bars) {
    const DUR = 7000;
    bars.style.setProperty('--dur', DUR + 'ms');
    slides.forEach(() => { const s = document.createElement('span'); s.append(document.createElement('i')); bars.append(s); });
    const segs = Array.from(bars.children);
    let idx = 0; let timer = null; let paused = reduceMotion; let started = 0; let remaining = DUR;

    const load = (img) => {
      if (img.dataset.src) {
        if (img.dataset.srcset) img.srcset = img.dataset.srcset;
        img.src = img.dataset.src;
        delete img.dataset.src; delete img.dataset.srcset;
      }
    };
    const paint = () => {
      slides.forEach((s, i) => s.classList.toggle('is-on', i === idx));
      segs.forEach((s, i) => {
        s.classList.toggle('done', i < idx);
        s.classList.remove('now'); void s.offsetWidth;
        if (i === idx) s.classList.add('now');
      });
      capEl.textContent = slides[idx].dataset.cap || '';
      load(slides[(idx + 1) % slides.length]);
    };
    const schedule = (ms) => {
      clearTimeout(timer); started = Date.now(); remaining = ms;
      timer = setTimeout(() => { idx = (idx + 1) % slides.length; paint(); schedule(DUR); }, ms);
    };
    const setPaused = (p) => {
      paused = p;
      hero.classList.toggle('is-paused', p);
      toggle.setAttribute('aria-label', p ? 'Reproducir presentación de fotos' : 'Pausar presentación de fotos');
      if (p) { clearTimeout(timer); remaining = Math.max(0, remaining - (Date.now() - started)); }
      else schedule(remaining || DUR);
    };
    toggle.addEventListener('click', () => setPaused(!paused));
    // Pausa cuando el hero no se ve (ahorra batería y datos)
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(([e]) => {
        if (paused) return;
        if (e.isIntersecting) schedule(remaining || DUR);
        else { clearTimeout(timer); remaining = Math.max(0, remaining - (Date.now() - started)); }
      }, { threshold: 0.05 }).observe(hero);
    }
    paint();
    if (paused) { hero.classList.add('is-paused'); toggle.setAttribute('aria-label', 'Reproducir presentación de fotos'); }
  }

  /* ---------- Galería con vista ampliada ---------- */
  const lb = $('#lightbox');
  const items = $$('.g__btn');
  if (lb && items.length && typeof lb.showModal === 'function') {
    const img = $('#lb-img'); const t = $('#lb-title'); const m = $('#lb-meta');
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

  /* ---------- Mapa: se carga solo al tocarlo (página más rápida) ---------- */
  const mapBtn = $('#map-load');
  if (mapBtn) {
    mapBtn.addEventListener('click', () => {
      const f = document.createElement('iframe');
      f.title = 'Mapa de ubicación';
      f.loading = 'lazy';
      f.referrerPolicy = 'no-referrer-when-downgrade';
      f.src = `https://maps.google.com/maps?q=${CONFIG.mapLat},${CONFIG.mapLng}&z=16&hl=es&output=embed`;
      const frame = $('#map-frame');
      frame.append(f);
      mapBtn.remove();
      const art = $('.map__art', frame); if (art) art.remove();
    });
  }

  /* ---------- Iconos del formulario ---------- */
  const ICONS = {
    cocina: '<path d="M6 22h36v18H6zM6 28h36M18 22v18M30 22v18M10 6h28v10H10zM22 32h-6M34 32h-6"/>',
    bano: '<path d="M6 24h36v5a11 11 0 0 1-11 11H17A11 11 0 0 1 6 29zM12 24V11a4 4 0 0 1 8 0v1M15 40l-2 4M33 40l2 4"/>',
    techo: '<path d="M4 22 24 8l20 14M9 19v21h30V19"/><path d="M18 28c0 2-2 3-2 5a2 2 0 0 0 4 0c0-2-2-3-2-5zM30 26c0 2-2 3-2 5a2 2 0 0 0 4 0c0-2-2-3-2-5z"/>',
    piso: '<path d="M6 6h36v36H6zM6 18h36M6 30h36M18 6v36M30 6v36"/>',
    closet: '<path d="M8 4h32v40H8zM24 4v40M19 22v6M29 22v6M8 38h32"/>',
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
      count.textContent = n <= 4 ? `Paso ${n} de 4` : 'Último paso: tus datos';
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
      if (d.length > 10 && d.startsWith('52')) d = d.slice(2);
      d = d.slice(0, 10);
      tel.value = d.replace(/^(\d{2})(\d{0,4})(\d{0,4}).*/, (m, a, b, c) => [a, b, c].filter(Boolean).join(' '));
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
        `• Teléfono: ${t.replace(/^(\d{2})(\d{4})(\d{4})$/, '$1 $2 $3')}`,
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
    const upd = () => mbar.classList.toggle('is-on', !ctaVisible && !quoteVisible);
    new IntersectionObserver(([e]) => { ctaVisible = e.isIntersecting; upd(); }, { threshold: 0 }).observe(heroCta);
    if (quote) new IntersectionObserver(([e]) => { quoteVisible = e.isIntersecting; upd(); }, { threshold: 0.2 }).observe(quote);
  } else if (mbar) {
    mbar.classList.add('is-on');
  }

  /* ---------- Guardar, compartir y contacto ---------- */
  const toast = $('#toast');
  const say = (msg) => { toast.textContent = msg; clearTimeout(say.t); say.t = setTimeout(() => { toast.textContent = ''; }, 4000); };
  const pageUrl = /^https?:/.test(location.href) ? location.href.split('#')[0] : CONFIG.siteUrl;

  let installEvt = null;
  window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); installEvt = e; });
  $('#btn-install').addEventListener('click', async () => {
    if (installEvt) {
      installEvt.prompt();
      const choice = await installEvt.userChoice.catch(() => null);
      if (choice && choice.outcome === 'accepted') say('¡Listo! Ya está en tu pantalla de inicio.');
      installEvt = null;
      return;
    }
    const help = $('#install-help');
    help.hidden = !help.hidden;
  });

  $('#btn-share').addEventListener('click', async () => {
    const data = { title: CONFIG.businessName, text: `${CONFIG.businessName}: remodelaciones con garantía.`, url: pageUrl };
    if (navigator.share) {
      try { await navigator.share(data); } catch (_) { /* cancelado */ }
      return;
    }
    try { await navigator.clipboard.writeText(pageUrl); say('Enlace copiado. Pégalo en WhatsApp para compartirlo.'); }
    catch (_) { say(pageUrl); }
  });

  $('#btn-vcard').addEventListener('click', () => {
    const wa = CONFIG.whatsapp.replace(/\D/g, '');
    const vcf = [
      'BEGIN:VCARD', 'VERSION:3.0',
      `FN:${CONFIG.businessName}`, `ORG:${CONFIG.businessName}`,
      `TEL;TYPE=CELL:+${wa}`,
      `URL:${CONFIG.siteUrl}`,
      `NOTE:Remodelación y mantenimiento en ${CONFIG.city}`,
      'END:VCARD',
    ].join('\r\n');
    const blob = new Blob([vcf], { type: 'text/vcard;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = CONFIG.businessName.replace(/[^\w\sáéíóúñ-]/gi, '').trim() + '.vcf';
    document.body.append(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
    say('Abre el archivo descargado para guardar el contacto.');
  });

})();
