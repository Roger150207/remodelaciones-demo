/* =========================================================
   CONFIGURACIÓN · cambia solo esta parte para cada negocio
   ========================================================= */
const CONFIG = {
  // WhatsApp que recibe las cotizaciones: 52 + 10 dígitos, sin espacios ni signos.
  whatsapp: '524441109812',
  // Teléfono para el botón "Llamar" en celular (10 dígitos). Déjalo vacío '' para ocultarlo.
  telefono: '',

  businessName: 'Remodelaciones Tu Nombre',
  city: 'tu ciudad',

  // Presupuesto mínimo que acepta el negocio (en pesos). Debajo de esto, no deja enviar.
  minBudget: 30000,

  // Opciones de presupuesto. "max" es el tope del rango; si max <= minBudget, el rango no califica.
  budgets: [
    { label: 'Menos de $30,000', max: 30000 },
    { label: '$30,000 a $80,000', max: 80000 },
    { label: '$80,000 a $200,000', max: 200000 },
    { label: 'Más de $200,000', max: Infinity },
  ],

  services: ['Cocina integral', 'Baño', 'Impermeabilización', 'Pisos y azulejo', 'Herrería', 'Albañilería o ampliación'],
  zones: ['Centro', 'Norte', 'Sur', 'Oriente', 'Poniente', 'Zona metropolitana'],
  urgency: ['Lo antes posible', 'En 1 a 3 meses', 'Solo estoy cotizando'],

  // Enlaces de Google: ficha del negocio y enlace directo para dejar reseña.
  mapsUrl: 'https://www.google.com/maps',
  reviewsUrl: 'https://www.google.com/maps',
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
  $$('[data-cfg]').forEach((el) => {
    const v = CONFIG[el.dataset.cfg];
    if (v) el.textContent = v;
  });
  const setHref = (id, url) => { const el = document.getElementById(id); if (el && url) el.href = url; };
  setHref('map-link', CONFIG.mapsUrl);
  setHref('map-link-2', CONFIG.mapsUrl);
  setHref('review-link', CONFIG.reviewsUrl);
  const call = $('#call-link');
  if (call) {
    const digits = CONFIG.telefono.replace(/\D/g, '');
    if (digits) call.href = 'tel:+52' + digits.slice(-10);
    else call.remove();
  }

  /* ---------- Aparición al hacer scroll ---------- */
  const reveals = $$('.reveal');
  if (reduceMotion || !('IntersectionObserver' in window)) {
    reveals.forEach((el) => el.classList.add('is-in'));
  } else {
    // Escalonado suave dentro de cada grupo
    reveals.forEach((el) => {
      const sib = el.parentElement ? Array.from(el.parentElement.children).filter((c) => c.classList.contains('reveal')) : [];
      const i = sib.indexOf(el);
      if (i > 0) el.style.setProperty('--d', Math.min(i, 5) * 0.08 + 's');
    });
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); }
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
    reveals.forEach((el) => io.observe(el));
  }

  /* ---------- Comparador antes / después ---------- */
  function initBA(box) {
    const range = $('.ba__range', box);
    if (!range) return;
    const set = (v) => { box.style.setProperty('--pos', v + '%'); };
    range.addEventListener('input', () => set(range.value));
    range.addEventListener('pointerdown', () => box.classList.add('is-drag'));
    window.addEventListener('pointerup', () => box.classList.remove('is-drag'));
    set(range.value);
  }
  $$('[data-ba]').forEach(initBA);

  // Pista animada en el comparador principal (una sola vez)
  const heroBA = $('.hero [data-ba]');
  if (heroBA && !reduceMotion) {
    const r = $('.ba__range', heroBA);
    let touched = false;
    r.addEventListener('pointerdown', () => { touched = true; }, { once: true });
    const frames = [50, 32, 68, 50];
    let k = 0;
    setTimeout(function step() {
      if (touched || k >= frames.length) return;
      animateTo(heroBA, r, frames[k++], 650, () => setTimeout(step, 120));
    }, 1400);
  }
  function animateTo(box, r, to, dur, done) {
    const from = Number(r.value);
    const t0 = performance.now();
    (function tick(now) {
      const p = Math.min(1, (now - t0) / dur);
      const e = p < .5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2;
      const v = from + (to - from) * e;
      r.value = v; box.style.setProperty('--pos', v + '%');
      if (p < 1) requestAnimationFrame(tick); else if (done) done();
    })(t0);
  }

  /* ---------- Pestañas de trabajos ---------- */
  const tabs = $$('.tab');
  const panel = $('#panel-works');
  if (tabs.length && panel) {
    const pBA = $('[data-ba]', panel);
    const select = (tab, focus) => {
      tabs.forEach((t) => {
        const on = t === tab;
        t.setAttribute('aria-selected', on);
        t.tabIndex = on ? 0 : -1;
      });
      panel.setAttribute('aria-labelledby', tab.id);
      const b = $('[data-role="before"]', panel);
      const a = $('[data-role="after"]', panel);
      b.src = tab.dataset.before; b.alt = tab.dataset.altB;
      a.src = tab.dataset.after; a.alt = tab.dataset.altA;
      $('[data-role="title"]', panel).textContent = tab.dataset.title;
      $('[data-role="meta"]', panel).textContent = tab.dataset.meta;
      const r = $('.ba__range', pBA); r.value = 50; pBA.style.setProperty('--pos', '50%');
      pBA.classList.remove('is-swap'); void pBA.offsetWidth; pBA.classList.add('is-swap');
      if (focus) tab.focus();
    };
    tabs.forEach((t, i) => {
      t.addEventListener('click', () => select(t));
      t.addEventListener('keydown', (e) => {
        let n = null;
        if (e.key === 'ArrowRight') n = tabs[(i + 1) % tabs.length];
        if (e.key === 'ArrowLeft') n = tabs[(i - 1 + tabs.length) % tabs.length];
        if (e.key === 'Home') n = tabs[0];
        if (e.key === 'End') n = tabs[tabs.length - 1];
        if (n) { e.preventDefault(); select(n, true); }
      });
    });
  }

  /* ---------- Formulario de 4 pasos ---------- */
  const form = $('#wizard');
  if (form) {
    const state = { tipo: '', zona: '', urgencia: '', presupuesto: null };
    const steps = $$('.wz-step', form);
    const btnNext = $('#wz-next');
    const btnBack = $('#wz-back');
    const btnSend = $('#wz-send');
    const count = $('#wz-count');
    const bar = $('#wz-bar');
    const lowBox = $('#wz-low');
    const zonaOtra = $('#zona-otra');
    const nombre = $('#f-nombre');
    const tel = $('#f-tel');
    let current = 1;
    let pointerPick = false;

    const buildOpts = (containerId, name, items, toLabel) => {
      const c = document.getElementById(containerId);
      items.forEach((item, i) => {
        const label = document.createElement('label');
        label.className = 'opt';
        const input = document.createElement('input');
        input.type = 'radio'; input.name = name; input.value = String(i);
        const span = document.createElement('span');
        span.textContent = toLabel(item);
        label.append(input, span);
        c.append(label);
      });
    };
    buildOpts('opt-tipo', 'tipo', CONFIG.services, (s) => s);
    buildOpts('opt-zona', 'zona', CONFIG.zones, (s) => s);
    buildOpts('opt-urgencia', 'urgencia', CONFIG.urgency, (s) => s);
    buildOpts('opt-presupuesto', 'presupuesto', CONFIG.budgets, (b) => b.label);
    if (!CONFIG.zones.length) $('#opt-zona').remove();

    const qualifies = (b) => b && b.max > CONFIG.minBudget;

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

    const show = (n, focus = true) => {
      current = n;
      steps.forEach((s) => {
        const on = Number(s.dataset.step) === n;
        s.hidden = !on;
        s.classList.toggle('is-active', on);
      });
      const done = n === 6;
      form.classList.toggle('is-done', done);
      btnBack.hidden = n === 1 || done;
      btnNext.hidden = n >= 5;
      btnSend.hidden = n !== 5;
      count.textContent = n <= 4 ? `Paso ${n} de 4` : 'Último paso: tus datos';
      bar.style.width = Math.min(n, 5) * 20 + '%';
      if (n === 5) renderSummary();
      refresh();
      if (focus) {
        const target = done ? steps[5] : $('legend', steps[n - 1]);
        if (target) {
          if (!target.hasAttribute('tabindex')) target.setAttribute('tabindex', '-1');
          target.focus({ preventScroll: true });
        }
        const top = form.getBoundingClientRect().top;
        if (top < 70 || top > window.innerHeight * 0.5) {
          form.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' });
        }
      }
    };

    // Avanza solo cuando la persona toca una opción (no con flechas del teclado)
    form.addEventListener('pointerdown', (e) => { if (e.target.closest('.opt')) pointerPick = true; });

    form.addEventListener('change', (e) => {
      const t = e.target;
      if (t.type !== 'radio') return;
      const i = Number(t.value);
      if (t.name === 'tipo') state.tipo = CONFIG.services[i];
      if (t.name === 'zona') { state.zona = CONFIG.zones[i]; zonaOtra.value = ''; }
      if (t.name === 'urgencia') state.urgencia = CONFIG.urgency[i];
      if (t.name === 'presupuesto') {
        state.presupuesto = CONFIG.budgets[i];
        const ok = qualifies(state.presupuesto);
        lowBox.hidden = ok;
        if (!ok) {
          $('#wz-low-msg').textContent =
            `Por ahora tomamos obras desde ${money(CONFIG.minBudget)}. Si tu proyecto crece o quieres juntar varios trabajos, aquí estaremos para cotizarte.`;
        }
      }
      refresh();
      const auto = pointerPick && canAdvance();
      pointerPick = false;
      if (auto && current < 5) setTimeout(() => { if (canAdvance()) show(current + 1); }, reduceMotion ? 0 : 260);
    });

    zonaOtra.addEventListener('input', () => {
      const v = zonaOtra.value.trim();
      if (v) $$('input[name="zona"]', form).forEach((r) => { r.checked = false; });
      state.zona = v.length >= 3 ? v : ($('input[name="zona"]:checked', form) ? state.zona : '');
      refresh();
    });
    zonaOtra.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') { e.preventDefault(); if (canAdvance()) show(3); }
    });

    btnNext.addEventListener('click', () => { if (canAdvance()) show(current + 1); });
    btnBack.addEventListener('click', () => { if (current > 1) show(current - 1); });

    // Teléfono: deja solo dígitos y lo agrupa para leerlo fácil
    tel.addEventListener('input', () => {
      let d = tel.value.replace(/\D/g, '');
      if (d.length > 10 && d.startsWith('52')) d = d.slice(2);
      d = d.slice(0, 10);
      tel.value = d.replace(/^(\d{2})(\d{0,4})(\d{0,4}).*/, (m, a, b, c) => [a, b, c].filter(Boolean).join(' '));
      if (tel.getAttribute('aria-invalid') === 'true' && d.length === 10) setErr(tel, '#err-tel', false);
    });
    nombre.addEventListener('input', () => {
      if (nombre.value.trim().length >= 2) setErr(nombre, '#err-nombre', false);
    });

    function setErr(input, errSel, on) {
      input.setAttribute('aria-invalid', on ? 'true' : 'false');
      const err = $(errSel);
      err.hidden = !on;
      if (on) input.setAttribute('aria-describedby', err.id); else input.removeAttribute('aria-describedby');
    }

    function renderSummary() {
      const box = $('#wz-summary');
      const rows = [['Obra', state.tipo], ['Zona', state.zona], ['Para cuándo', state.urgencia], ['Presupuesto', state.presupuesto && state.presupuesto.label]];
      const dl = document.createElement('dl');
      rows.forEach(([k, v]) => {
        const dt = document.createElement('dt'); dt.textContent = k;
        const dd = document.createElement('dd'); dd.textContent = v || '—';
        dl.append(dt, dd);
      });
      box.replaceChildren(dl);
    }

    function buildMessage() {
      const n = nombre.value.trim();
      const t = tel.value.replace(/\D/g, '');
      return [
        `Hola, vi su página y quiero cotizar una obra.`,
        ``,
        `• Obra: ${state.tipo}`,
        `• Zona: ${state.zona}`,
        `• Presupuesto: ${state.presupuesto.label}`,
        `• Para cuándo: ${state.urgencia}`,
        `• Nombre: ${n}`,
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
      if (win) { try { win.opener = null; } catch (_) { /* sin acceso */ } }
      else window.location.href = url;
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
  const hero = $('.hero');
  const quote = $('#cotizar');
  if (mbar && hero && 'IntersectionObserver' in window) {
    let heroVisible = true; let quoteVisible = false;
    const upd = () => mbar.classList.toggle('is-on', !heroVisible && !quoteVisible);
    new IntersectionObserver(([e]) => { heroVisible = e.isIntersecting; upd(); }, { threshold: 0.05 }).observe(hero);
    if (quote) new IntersectionObserver(([e]) => { quoteVisible = e.isIntersecting; upd(); }, { threshold: 0.15 }).observe(quote);
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
