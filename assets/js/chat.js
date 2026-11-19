/* Musee · la asistente de Reforma Innovare · widget de chat */
(function () {
  'use strict';
  var root = document.getElementById('chat-root');
  if (!root) return;

  var WA = '524441107319';
  var LIMIT = 15;
  var API = '/api/chat';
  var TZ = 'America/Mexico_City';

  function dayKey() {
    try { return new Intl.DateTimeFormat('en-CA', { timeZone: TZ }).format(new Date()); }
    catch (e) { return new Date().toISOString().slice(0, 10); }
  }
  var LS_KEY = 'musee_msgs_' + dayKey();
  function getCount() { try { return parseInt(localStorage.getItem(LS_KEY), 10) || 0; } catch (e) { return 0; } }
  function setCount(n) { try { localStorage.setItem(LS_KEY, String(n)); } catch (e) {} }

  var history = [];      // {role, content} para el servidor
  var apiOff = false;    // true cuando el servidor pide modo fijo
  var busy = false;
  var limited = false;
  var userTurns = 0;
  var offered = false;
  var lastTrigger = null;

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
  var FIRST = ['¿Cuánto tarda una cocina?', '¿La visita tiene costo?', 'Estilos de cocina', 'Cubiertas: cuarzo, granito…', 'Closets y vestidores', 'Baños', 'Garantía', 'Quiero cotizar'];
  var MORE = ['¿Cuánto tarda un baño?', 'Herrajes y acabados', '¿En qué zonas trabajan?', '¿Cómo es el proceso?', 'Mantenimiento', 'Ideas para espacios pequeños', '¿Qué servicios hacen?'];
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

  /* ---------- Respuestas fijas ---------- */
  function norm(s) { return String(s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, ''); }
  var FAQ = [
    { k: ['garantia', 'garantizan'], a: 'Damos garantía por escrito en mano de obra e instalación, y los materiales tienen la garantía del fabricante. Todo queda en tu presupuesto. ¿Qué espacio estás pensando remodelar?' },
    { k: ['cuanto tarda un bano', 'cuanto tarda el bano', 'tarda un bano', 'tiempo del bano'], a: 'Un baño normalmente tarda de 1 a 2 semanas. La fecha exacta va en tu presupuesto por escrito. ¿Es un baño completo o solo algunos cambios?' },
    { k: ['cuanto tarda', 'cuanto tiempo', 'tiempo', 'tardan', 'tarda', 'semanas', 'dias', 'entrega', 'plazo'], a: 'De forma orientativa: una cocina integral normalmente tarda de 3 a 4 semanas desde que apruebas el diseño; un baño, de 1 a 2 semanas. La fecha exacta va en tu presupuesto por escrito. ¿Tienes alguna fecha en mente?' },
    { k: ['minimo', '30,000', '30000', '30 mil', 'desde cuanto'], a: 'Tomamos proyectos desde $30,000 MXN. Para saber cuánto sería el tuyo, lo mejor es el cotizador o una visita sin costo para tomar medidas.' },
    { k: ['visita', 'medidas', 'medir', 'agendar', 'cita', 'ir a mi casa', 'domicilio'], a: 'La visita y la toma de medidas no tienen costo en Monterrey y su área metropolitana. Déjame tu nombre, tu WhatsApp y el día y la hora que te acomodan, y lo coordinamos. Respondemos el mismo día hábil.', lead: true },
    { k: ['precio', 'costo', 'cuesta', 'cuanto sale', 'cuanto cobran', 'presupuesto', 'cotiza', 'cotizar', 'cotizacion', 'tarifa'], a: 'El precio depende de las medidas, los materiales y los acabados, así que prefiero no darte una cifra al aire. Puedes cotizar en un minuto en la página, o agendar una visita sin costo y te entregamos un presupuesto por escrito con precio cerrado.', cta: true },
    { k: ['pago', 'pagar', 'anticipo', 'factura', 'transferencia', 'efectivo', 'meses'], a: 'Se paga un anticipo para materiales y el resto conforme avanza la obra, por transferencia o efectivo, todo por escrito. Si necesitas factura, la emitimos.' },
    { k: ['escombro', 'polvo', 'limpieza', 'desorden', 'retiran', 'proteg'], a: 'Sí. Retiramos lo viejo y el escombro, y protegemos tu casa durante la obra.' },
    { k: ['zona', 'donde', 'ubicados', 'san pedro', 'san nicolas', 'guadalupe', 'apodaca', 'santa catarina', 'escobedo', 'monterrey', 'cobertura'], a: 'Trabajamos en Monterrey y su área metropolitana: San Pedro, San Nicolás, Guadalupe, Apodaca y otras zonas. ¿En qué zona está tu casa? Te lo confirmamos en la visita.' },
    { k: ['estilo', 'moderna', 'moderno', 'clasica', 'clasico', 'madera clara', 'minimalista', 'diseno de cocina'], a: 'Hay para todos los gustos: cocinas modernas, más clásicas, o con madera clara y nogal. No manejamos un catálogo cerrado; el diseño se arma a tu medida y lo ves antes de aprobar. ¿Qué estilo te late más?' },
    { k: ['cubierta', 'cuarzo', 'granito', 'laminado', 'encimera', 'barra'], a: 'Para la cubierta manejamos cuarzo, granito o laminado. Los eliges con las muestras en mano, en tu casa. ¿Qué tanto uso le das a tu cocina?' },
    { k: ['herraje', 'bisagra', 'cierre suave', 'acabado', 'iluminacion', 'luces'], a: 'Los herrajes son de cierre suave, y la iluminación y los acabados se definen al aprobar el diseño. ¿Quieres que lo veamos con muestras en una visita sin costo?' },
    { k: ['material', 'madera', 'chapa', 'color', 'nogal'], a: 'Manejamos maderas y chapas en tonos claros y nogal, cubiertas de cuarzo, granito o laminado, y herrajes con cierre suave. Los eliges con las muestras en mano, en tu casa.' },
    { k: ['closet', 'vestidor', 'ropero', 'guardarropa'], a: 'Sí, hacemos closets y vestidores a la medida del cuarto. ¿Es para una recámara o un espacio más grande?' },
    { k: ['proceso', 'como trabajan', 'forma de trabajo', 'formas de trabajo', 'como funciona', 'pasos'], a: 'Diseñamos, fabricamos e instalamos con un solo equipo. Todo va en un presupuesto por escrito con precio cerrado: no sube a mitad de obra sin tu autorización y los cambios se cotizan por escrito. ¿Quieres empezar con una visita sin costo?', lead: true },
    { k: ['mantenimiento', 'cuidar', 'limpiar', 'cuidado'], a: 'Con una limpieza suave y secando derrames, tu cocina se conserva muy bien. Si quieres, te orientamos con el cuidado de cada material al elegirlo. ¿Qué material te interesa?' },
    { k: ['pequeno', 'pequena', 'chico', 'chica', 'poco espacio', 'espacio reducido', 'departamento', 'depa'], a: 'En espacios pequeños ayuda aprovechar bien la altura y dejar todo a la medida. Con las medidas reales te propondremos algo concreto. ¿Cómo es tu espacio, departamento o casa?' },
    { k: ['bano', 'regadera', 'cancel'], a: 'Remodelamos baños completos: regadera, cancel, muebles y azulejo. Normalmente tardan de 1 a 2 semanas; la fecha exacta va en el presupuesto. ¿Qué es lo que más te urge cambiar?' },
    { k: ['cocina'], a: 'Las cocinas integrales son lo nuestro: las diseñamos, fabricamos e instalamos con un solo equipo. ¿Cómo es tu cocina hoy y qué te gustaría cambiar?' },
    { k: ['servicio', 'que hacen', 'que ofrecen', 'impermeab', 'piso', 'azulejo', 'remodel', 'reforma'], a: 'Hacemos cocinas integrales y reformas: baños, closets y vestidores, impermeabilización, pisos y azulejo, y remodelación integral. Diseñamos, fabricamos e instalamos con un solo equipo. ¿Qué te gustaría remodelar?' },
    { k: ['whatsapp', 'telefono', 'llamar', 'llamada', 'contacto', 'numero'], a: 'Con gusto. Déjame tu nombre y cómo contactarte, y el día y la hora que te acomodan, y te armo el mensaje listo para enviar por WhatsApp.', lead: true },
    { k: ['hola', 'buenas', 'buen dia', 'buenos dias', 'buenas tardes', 'que tal'], a: '¡Hola! Soy Musee. Cuéntame, ¿qué te gustaría remodelar?' },
    { k: ['gracias', 'perfecto', 'excelente', 'ok'], a: '¡Con mucho gusto! Si quieres avanzar, puedes dejarme tus datos para agendar una visita sin costo.', lead: true }
  ];
  function localReply(text) {
    var t = ' ' + norm(text) + ' ';
    for (var i = 0; i < FAQ.length; i++) {
      for (var j = 0; j < FAQ[i].k.length; j++) {
        if (t.indexOf(norm(FAQ[i].k[j])) !== -1) return FAQ[i];
      }
    }
    var len = String(text).trim().length;
    if (len > 160) return { a: 'Gracias por contarme tanto, me ayuda a entender tu proyecto. Para darte una respuesta buena y no adivinar, el equipo lo revisa contigo en una visita sin costo. ¿Qué es lo que más te urge resolver?', lead: true, cta: true };
    return { a: 'Esa duda prefiero resolvértela bien en lugar de adivinar. Cuéntame un poco más de tu espacio, o déjame tus datos para que el equipo te responda el mismo día hábil; también puedes escribirnos por WhatsApp o usar el cotizador.', lead: true, cta: true };
  }

  /* ---------- Envío ---------- */
  function showLimit() {
    limited = true;
    input.disabled = true; send.disabled = true;
    input.placeholder = 'Llegaste al límite de hoy';
    addMsg('musee', 'Hoy ya platicamos bastante y no quiero dejarte con dudas a medias. Para seguir, escríbenos por WhatsApp y te atiende el equipo, o prueba el cotizador. ¡Gracias por tu interés en Reforma Innovare!');
    ctaButtons({ waHref: waLink('Hola, estuve platicando con Musee en la página de Reforma Innovare y quiero seguir con mi proyecto.') });
  }
  function wantsLead(text) {
    return /cotiz|visita|llam|agendar|cita|whatsapp|presupuesto|precio|costo/.test(norm(text));
  }
  function maybeOffer(text, forced) {
    if (offered) return;
    if (forced || wantsLead(text) || userTurns >= 3) { offered = true; openLeadForm(); }
  }

  function submit(text) {
    text = String(text || '').trim();
    if (!text || busy || limited) return;
    if (getCount() >= LIMIT) { addMsg('user', text); showLimit(); return; }
    setCount(getCount() + 1);
    userTurns++;
    addMsg('user', text);
    history.push({ role: 'user', content: text });
    input.value = '';
    busy = true; send.disabled = true;
    var typing = addMsg('musee', 'Musee está escribiendo…');
    typing.classList.add('chat-row--typing');

    function finish(reply, faq) {
      typing.remove();
      addMsg('musee', reply);
      history.push({ role: 'assistant', content: reply });
      history = history.slice(-10);
      busy = false; send.disabled = limited;
      if (faq && faq.cta) ctaButtons({});
      maybeOffer(text, faq && faq.lead);
      if (!limited && getCount() >= LIMIT) { /* el siguiente mensaje mostrará el aviso */ }
      scroll();
      if (!limited) input.focus();
    }
    function fixed() { var f = localReply(text); finish(f.a, f); }

    if (apiOff) { fixed(); return; }
    var ctrl = typeof AbortController === 'function' ? new AbortController() : null;
    var timer = setTimeout(function () { if (ctrl) ctrl.abort(); }, 15000);
    fetch(API, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ messages: history.slice(-10) }),
      signal: ctrl ? ctrl.signal : undefined
    }).then(function (r) { return r.ok ? r.json() : null; })
      .then(function (d) {
        clearTimeout(timer);
        if (d && d.limited) { typing.remove(); busy = false; setCount(LIMIT); history.pop(); showLimit(); return; }
        if (d && d.ok && !d.fallback && d.reply) { finish(d.reply, { lead: wantsLead(text) }); return; }
        apiOff = true; fixed();
      })
      .catch(function () { clearTimeout(timer); apiOff = true; fixed(); });
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
      if (getCount() >= LIMIT) showLimit();
      else addChips(FIRST, MORE);
    }
    setTimeout(function () { (input.disabled ? close : input).focus(); }, 30);
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
