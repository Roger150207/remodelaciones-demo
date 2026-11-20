/* Musee · la asistente de Reforma Innovare · widget de chat */
(function () {
  'use strict';
  var root = document.getElementById('chat-root');
  if (!root) return;

  var WA = '524441107319';
  var history = [];      // {role, content}: solo para armar el resumen de WhatsApp
  var busy = false;
  var userTurns = 0;
  var M = window.MuseeRespuestas;
  var offered = false;
  var lastTrigger = null;
  /* Modo AI: intenta /api/chat; sin llave, sin cupo o con falla usa el motor fijo sin avisar del error */
  var API = '/api/chat';
  var WA_PREFIX = 'https://wa.me/' + WA + '?text=';
  var aiOn = /^https?:$/.test(location.protocol) && typeof fetch === 'function';
  var aiFails = 0;
  var conv = Math.random().toString(36).slice(2, 12) + Date.now().toString(36);

  /* ---------- DOM ---------- */
  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }
  var ICON_CHAT = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 5h16v11H9l-5 4z"/></svg>';
  var ICON_X = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>';

  var launch = document.getElementById('chat-launch');
  var fab = document.getElementById('chat-fab');
  var tip = document.getElementById('chat-tip');
  if (!launch || !fab) {   /* respaldo si el HTML no trae el lanzador */
    root.insertAdjacentHTML('afterbegin', '<div class="chat-launch" id="chat-launch"><div class="chat-launch__bob"><button type="button" class="chat-tip" id="chat-tip">¿Te ayudo?</button><button type="button" class="chat-fab" id="chat-fab" aria-label="Abrir chat con Musee, asistente de Reforma Innovare" aria-haspopup="dialog" aria-expanded="false"><img class="chat-fab__img" src="assets/img/musee-192.webp" srcset="assets/img/musee-96.webp 1x, assets/img/musee-192.webp 2x" alt="Musee, asistente de Reforma Innovare" width="72" height="72" decoding="async"></button></div></div>');
    launch = document.getElementById('chat-launch');
    fab = document.getElementById('chat-fab');
    tip = document.getElementById('chat-tip');
  }

  var panel = el('div', 'chat-panel');
  panel.id = 'chat-panel';
  panel.setAttribute('role', 'dialog');
  panel.setAttribute('aria-modal', 'false');
  panel.setAttribute('aria-label', 'Chat con Musee, asistente de Reforma Innovare');
  panel.hidden = true;

  var head = el('div', 'chat-head');
  var av = el('img', 'chat-head__av');
  av.src = 'assets/img/musee-384.webp'; av.alt = 'Musee, asistente de Reforma Innovare';
  av.width = 48; av.height = 48; av.decoding = 'async';
  var who = el('div', 'chat-head__who');
  who.appendChild(el('b', null, 'Musee'));
  who.appendChild(el('small', null, 'Asistente de Reforma Innovare'));
  var close = el('button', 'chat-close');
  close.type = 'button';
  close.setAttribute('aria-label', 'Cerrar el chat');
  close.innerHTML = ICON_X;
  head.appendChild(av); head.appendChild(who); head.appendChild(close);

  var log = el('div', 'chat-log');
  log.setAttribute('role', 'log');
  log.setAttribute('aria-live', 'polite');
  log.tabIndex = 0;

  var actions = el('div', 'chat-actions');
  var leadBtn = el('button', 'chat-link', 'Dejar mis datos y enviar por WhatsApp');
  leadBtn.type = 'button';
  actions.appendChild(leadBtn);

  var form = el('form', 'chat-form');
  form.setAttribute('autocomplete', 'off');
  var input = el('input', 'chat-input');
  input.type = 'text'; input.maxLength = 500;
  input.placeholder = 'Escribe tu duda…';
  input.setAttribute('aria-label', 'Escribe tu mensaje a Musee');
  var send = el('button', 'chat-send', 'Enviar');
  send.type = 'submit';
  form.appendChild(input); form.appendChild(send);

  panel.appendChild(head); panel.appendChild(log); panel.appendChild(actions); panel.appendChild(form);
  root.appendChild(panel);

  /* ---------- Mensajes ---------- */
  function scroll() { log.scrollTop = log.scrollHeight; }
  function addMsg(role, text) {
    if (role === 'user') {
      var m = el('div', 'chat-msg chat-msg--me');
      m.textContent = text;
      log.appendChild(m); scroll();
      return m;
    }
    var row = el('div', 'chat-row');
    var a = el('img', 'chat-row__av');
    a.src = 'assets/img/musee-192.webp'; a.srcset = 'assets/img/musee-96.webp 1x, assets/img/musee-192.webp 2x';
    a.alt = ''; a.width = 32; a.height = 32; a.decoding = 'async';
    var b = el('div', 'chat-msg chat-msg--musee');
    b.textContent = text;
    row.appendChild(a); row.appendChild(b);
    log.appendChild(row); scroll();
    return row;
  }
  function addChips(list, more) {
    Array.prototype.forEach.call(log.querySelectorAll('.chat-chips'), function (x) { x.remove(); });
    var box = el('div', 'chat-chips');
    list.forEach(function (t) {
      var b = el('button', 'chat-chip', t); b.type = 'button';
      b.addEventListener('click', function () { box.remove(); submit(t); });
      box.appendChild(b);
    });
    if (more && more.length) {
      var m = el('button', 'chat-chip chat-chip--more', 'Más preguntas'); m.type = 'button';
      m.setAttribute('aria-expanded', 'false');
      m.addEventListener('click', function () {
        m.remove();
        more.forEach(function (t) {
          var b = el('button', 'chat-chip', t); b.type = 'button';
          b.addEventListener('click', function () { box.remove(); submit(t); });
          box.appendChild(b);
        });
        scroll();
      });
      box.appendChild(m);
    }
    log.appendChild(box); scroll();
  }
  var FIRST = M.CHIPS_INICIO;
  var MORE = M.CHIPS_MAS;
  function ctaButtons(opts) {
    var box = el('div', 'chat-cta');
    var a = el('a', 'chat-btn chat-btn--wa', opts.waLabel || 'Escribir por WhatsApp');
    a.href = opts.waHref || waLink('Hola, vengo de la página de Reforma Innovare y quiero cotizar.');
    a.target = '_blank'; a.rel = 'noopener';
    box.appendChild(a);
    if (opts.cotizador !== false) {
      var c = el('a', 'chat-btn chat-btn--ghost', 'Ir al cotizador');
      c.href = '#filtro';
      c.addEventListener('click', function () { closePanel(false); });
      box.appendChild(c);
    }
    log.appendChild(box); scroll();
  }
  function waLink(text) { return 'https://wa.me/' + WA + '?text=' + encodeURIComponent(text); }

  var LEAD_NOW = { visita: 1, contacto: 1, afirmar: 1, precio: 1, gracias: 1 };
  function maybeOffer(r) {
    if (offered || !r.lead) return;
    if (LEAD_NOW[r.tema] || userTurns >= 3) { offered = true; openLeadForm(); }
  }

  function submit(text) {
    text = String(text || '').trim();
    if (!text || busy) return;
    userTurns++;
    addMsg('user', text);
    history.push({ role: 'user', content: text });
    input.value = '';
    busy = true;
    if (aiOn) askAI(text); else answerFixed(text);
  }

  /* Respuestas fijas: el motor de siempre */
  function answerFixed(text, aviso) {
    if (aviso) {
      addMsg('musee', aviso);
      history.push({ role: 'assistant', content: aviso });
    }
    var r = M.responder(text);
    addMsg('musee', r.a);
    history.push({ role: 'assistant', content: r.a });
    history = history.slice(-10);
    busy = false;
    if (r.cta) ctaButtons({});
    if (r.chips && r.chips.length) addChips(r.chips.slice(0, 4));
    maybeOffer(r);
    scroll();
    input.focus();
  }

  function askAI(text) {
    var typing = addMsg('musee', 'Escribiendo…');
    typing.classList.add('chat-row--typing');
    var done = false;
    var ctrl = typeof AbortController === 'function' ? new AbortController() : null;
    var timer = setTimeout(function () { if (ctrl) ctrl.abort(); finish(null, 0); }, 14000);
    function finish(data, status) {
      if (done) return;
      done = true;
      clearTimeout(timer);
      typing.remove();
      if (data && data.ok && typeof data.texto === 'string' && data.texto) {
        aiFails = 0;
        addMsg('musee', data.texto);
        history.push({ role: 'assistant', content: data.texto });
        history = history.slice(-12);
        busy = false;
        var wa = data.wa && typeof data.wa.url === 'string' && data.wa.url.indexOf(WA_PREFIX) === 0 ? data.wa.url : null;
        if (wa) { offered = true; ctaButtons({ waLabel: 'Enviar mi resumen por WhatsApp', waHref: wa, cotizador: false }); }
        if (data.chips && data.chips.length) addChips(data.chips.slice(0, 4));
        scroll();
        input.focus();
        return;
      }
      /* Respaldo: sin llave o sin cupo se queda en fijo el resto de la visita; ante fallas, tras 2 */
      var motivo = data && data.motivo;
      var aviso = null;
      if (status === 429 || motivo === 'cupo') { aiOn = false; aviso = (data && data.aviso) || 'Hoy tuve muchas consultas; te puedo orientar con lo esencial o te armo el WhatsApp.'; }
      else if (motivo === 'sin_llave' || status === 404 || status === 405 || status === 501) aiOn = false;
      else if (++aiFails >= 2) aiOn = false;
      answerFixed(text, aviso);
    }
    try {
      fetch(API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ conv: conv, messages: history.slice(-12) }),
        signal: ctrl ? ctrl.signal : undefined
      }).then(function (res) {
        var st = res.status;
        return res.json().then(function (d) { finish(d, st); }, function () { finish(null, st); });
      }, function () { finish(null, 0); });
    } catch (e) { finish(null, 0); }
  }

  /* ---------- Captura de contacto + wa.me ---------- */
  function openLeadForm() {
    if (log.querySelector('.chat-lead')) { log.querySelector('.chat-lead input').focus(); return; }
    var f = el('form', 'chat-lead');
    f.setAttribute('aria-label', 'Tus datos para que te contactemos');
    function field(label, name, type, ph, req) {
      var l = el('label', 'chat-lead__f');
      l.appendChild(el('span', null, label));
      var i = el('input'); i.name = name; i.type = type; i.placeholder = ph; i.maxLength = 120;
      if (req) i.required = true;
      l.appendChild(i); f.appendChild(l); return i;
    }
    f.appendChild(el('p', 'chat-lead__t', 'Déjame estos datos y te armo el mensaje para enviarlo por WhatsApp:'));
    var first = field('Tu nombre', 'nombre', 'text', 'Ana López', true);
    field('WhatsApp o correo', 'contacto', 'text', '81 1234 5678', true);
    field('¿Qué necesitas?', 'necesidad', 'text', 'Cocina integral, baño…', false);
    field('Zona de la obra', 'zona', 'text', 'San Pedro, Apodaca…', false);
    field('Día y hora que te acomodan', 'cuando', 'text', 'Jueves por la tarde', false);
    var go = el('button', 'chat-btn chat-btn--primary', 'Preparar mi mensaje'); go.type = 'submit';
    f.appendChild(go);
    f.addEventListener('submit', function (e) {
      e.preventDefault();
      var d = {}; Array.prototype.forEach.call(f.elements, function (x) { if (x.name) d[x.name] = x.value.trim(); });
      if (!d.nombre || !d.contacto) return;
      var lastAsk = '';
      for (var i = history.length - 1; i >= 0; i--) if (history[i].role === 'user') { lastAsk = history[i].content; break; }
      var lines = ['Hola, soy ' + d.nombre + '. Les escribo desde la página de Reforma Innovare.',
        'Contacto: ' + d.contacto,
        'Necesito: ' + (d.necesidad || lastAsk || 'quiero que me orienten con mi proyecto'),
        'Zona: ' + (d.zona || 'por confirmar'),
        'Disponibilidad para llamada o visita: ' + (d.cuando || 'por acordar')];
      f.remove();
      addMsg('musee', 'Listo, ' + d.nombre + '. Aquí tienes tu mensaje ya escrito; solo tócalo para abrirlo en WhatsApp y enviarlo. Te responden el mismo día hábil.');
      ctaButtons({ waLabel: 'Enviar mi resumen por WhatsApp', waHref: waLink(lines.join('\n')) });
    });
    log.appendChild(f); scroll();
    first.focus();
  }
  leadBtn.addEventListener('click', function () { offered = true; openLeadForm(); });

  /* ---------- Abrir / cerrar ---------- */
  var greeted = false;
  function openPanel() {
    panel.hidden = false;
    fab.setAttribute('aria-expanded', 'true');
    document.body.classList.add('chat-open');
    lastTrigger = document.activeElement === fab ? fab : fab;
    if (!greeted) {
      greeted = true;
      var hi = addMsg('musee', '¡Hola! Soy Musee, la asistente de Reforma Innovare 💚 ¿En qué espacio estás pensando?');
      addChips(FIRST, MORE);
    }
    setTimeout(function () { input.focus(); }, 30);
  }
  function closePanel(restoreFocus) {
    panel.hidden = true;
    fab.setAttribute('aria-expanded', 'false');
    document.body.classList.remove('chat-open');
    if (restoreFocus !== false) fab.focus();
  }
  fab.addEventListener('click', openPanel);
  if (tip) tip.addEventListener('click', openPanel);
  close.addEventListener('click', function () { closePanel(true); });
  form.addEventListener('submit', function (e) { e.preventDefault(); submit(input.value); });
  document.addEventListener('keydown', function (e) {
    if (panel.hidden) return;
    if (e.key === 'Escape') { e.preventDefault(); closePanel(true); return; }
    if (e.key === 'Tab') {
      var f = panel.querySelectorAll('a[href],button:not([disabled]),input:not([disabled])');
      if (!f.length) return;
      var a = f[0], z = f[f.length - 1];
      if (e.shiftKey && document.activeElement === a) { e.preventDefault(); z.focus(); }
      else if (!e.shiftKey && document.activeElement === z) { e.preventDefault(); a.focus(); }
    }
  });

  /* Reserva espacio sobre la barra fija .mbar (respaldo para navegadores sin :has) */
  var mbar = document.getElementById('mbar');
  if (mbar && 'MutationObserver' in window) {
    var sync = function () { document.body.classList.toggle('chat-mbar-on', mbar.classList.contains('is-on')); };
    new MutationObserver(sync).observe(mbar, { attributes: true, attributeFilter: ['class'] });
    sync();
  }
})();
