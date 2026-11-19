/* Musee · motor de respuestas preparadas (sin DOM: sirve en navegador y en Node) */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.MuseeRespuestas = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  /* ---------- Normalización ---------- */
  var TYPOS = [
    [/\bco[sz]inas?\b/g, 'cocina'], [/\bkocina\b/g, 'cocina'],
    [/\bgra[np]i?t+os?\b/g, 'granito'], [/\bgranitto\b/g, 'granito'], [/\bgrapito\b/g, 'granito'],
    [/\bvest[uo]dor(es)?\b/g, 'vestidor'], [/\bvestidore?s?\b/g, 'vestidor'],
    [/\bcl[oa]z+[ae]t(s|es)?\b/g, 'closet'], [/\bclo[sz]et(s|es)?\b/g, 'closet'], [/\bclose[rt]s?\b/g, 'closet'],
    [/\bquanto\b/g, 'cuanto'], [/\bcuanro\b/g, 'cuanto'], [/\bcuanot\b/g, 'cuanto'],
    [/\bbanio\b/g, 'bano'], [/\bvano\b/g, 'bano'],
    [/\bxq\b/g, 'por que'], [/\bpq\b/g, 'por que'], [/\bq\b/g, 'que'], [/\bk\b/g, 'que'],
    [/\bcotisar\b/g, 'cotizar'], [/\bcotisacion\b/g, 'cotizacion'], [/\bpresio\b/g, 'precio'],
    [/\bgarantia\b/g, 'garantia'], [/\bwhats(app)?\b/g, 'whatsapp'], [/\bwasa(p|pp)?\b/g, 'whatsapp'],
    [/\bdepa(rtamento)?s?\b/g, 'depa'], [/\bq tal\b/g, 'que tal']
  ];
  function stem(w) {
    return (w.length > 3 && /[^s]s$/.test(w)) ? w.slice(0, -1) : w;
  }
  function norm(s) {
    s = String(s == null ? '' : s).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    s = s.replace(/(\d)[,.](\d{3})\b/g, '$1$2');       /* 30,000 -> 30000 */
    s = s.replace(/[^a-z0-9$]+/g, ' ');
    s = s.replace(/([a-z])\1{2,}/g, '$1');             /* holaaa -> hola */
    s = ' ' + s.replace(/\s+/g, ' ').trim() + ' ';
    TYPOS.forEach(function (t) { s = s.replace(t[0], t[1]); });
    return s.replace(/\s+/g, ' ').trim().split(' ').filter(Boolean).map(stem).join(' ');
  }
  function padded(s) { return ' ' + norm(s) + ' '; }

  /* ---------- Hechos fijos ---------- */
  var WA = '524441107319';
  var MIN = '$30,000 MXN';

  var CHIPS_BASE = ['Quiero cotizar', '¿La visita tiene costo?', '¿Cuánto tarda una cocina?', 'Baños', 'Closets y vestidores'];

  /* ---------- Temas ----------
     k: frases (peso = 10 por palabra, o "frase|N" para fijarlo)
     c: combinaciones [[grupo A],[grupo B]] que valen 35 si aparece algo de cada grupo
     a: respuesta · lead: abre el formulario · cta: botones WhatsApp/cotizador · chips: seguimiento */
  var T = [
    { id: 'insulto', pri: 100,
      k: ['idiota|60', 'estupid|60', 'estupido|60', 'pendej|60', 'pendejo|60', 'pendeja|60', 'imbecil|60', 'mierda|60', 'puto|60', 'puta|60', 'chinga|60', 'chingada|60', 'chingar|60', 'cabron|60', 'verga|60', 'culero|60', 'mamon|60', 'maldito|60', 'inutil|60', 'basura|60', 'te odio|60', 'callate|60', 'lacra|60', 'pinche bot|60', 'no sirves|60', 'tonto|45', 'tonta|45'],
      a: 'Prefiero que platiquemos con calma. Si quieres ayuda con tu cocina, baño o closet, aquí estoy; y si algo no te gustó, el equipo te atiende por WhatsApp y responde el mismo día hábil.',
      cta: true, chips: ['Quiero cotizar', '¿La visita tiene costo?'] },
    { id: 'spam', pri: 90,
      k: ['http|60', 'https|60', 'www|60', 'bitcoin|60', 'cripto|60', 'criptomoneda|60', 'casino|60', 'viagra|60', 'gana dinero|60', 'dinero facil|60', 'forex|60', 'inversion|40', 'prestamo|40', 'seo|40', 'posicionamiento web|60', 'compra seguidores|60', 'ofrecemos servicios|40', 'promocion exclusiva|60'],
      a: 'Por aquí solo atiendo dudas sobre cocinas integrales, baños y closets de Reforma Innovare. Si es sobre eso, con gusto; si no, puedes escribirle al equipo por WhatsApp.',
      cta: true, chips: ['Quiero cotizar', '¿La visita tiene costo?'] },
    { id: 'identidad', pri: 60,
      k: ['eres bot|50', 'eres un bot|50', 'eres robot|50', 'eres una maquina|50', 'eres humano|50', 'eres persona|50', 'eres una persona|50', 'eres real|50', 'eres de verdad|50', 'eres automatico|50', 'eres una ia|50', 'inteligencia artificial|50', 'hablo con una maquina|50', 'quien eres|50', 'como te llamas|50', 'cual es tu nombre|50', 'tu nombre|35', 'persona real|50', 'es automatico|40', 'quien me atiende|40', 'quien contesta|40'],
      a: 'Soy Musee, la asistente de Reforma Innovare en esta página. Respondo las dudas más comunes al momento. Si prefieres hablar con una persona del equipo, te paso por WhatsApp y responden el mismo día hábil.',
      cta: true, chips: ['Quiero cotizar', '¿La visita tiene costo?', 'Hablar con un asesor'] },
    { id: 'visita_costo', pri: 50,
      k: ['visita tiene costo|50', 'visita cuesta|50', 'visita es gratis|50', 'visita es gratuita|50', 'visita gratis|50', 'visita sin costo|50', 'cobran la visita|55', 'cobran por la visita|55', 'cobran por visita|55', 'cuesta la visita|55', 'cuesta visita|50', 'tiene costo la visita|55', 'tiene costo la cita|55', 'costo de la visita|55', 'precio de la visita|55', 'cuanto cobran por ir|55', 'cuanto cobran por medir|55', 'cobran por medir|55', 'medidas tienen costo|55', 'medir tiene costo|55', 'cobran por ir|50', 'es gratis ir|45', 'la visita es gratis|50', 'visita pagada|45', 'cobran por cotizar|50', 'cobran la cotizacion|50', 'cotizacion tiene costo|50', 'cotizacion es gratis|50', 'cotizacion gratis|50', 'cuesta cotizar|50'],
      c: [[['visita', 'cita', 'medir', 'medicion', 'ir a mi casa', 'ir a casa', 'venir', 'vienen'], ['costo', 'cobran', 'cobra', 'cuesta', 'gratis', 'gratuit', 'precio', 'cargo', 'pagar', 'tiene costo', 'sin costo', 'compromiso']]],
      a: 'No, la visita y la toma de medidas no tienen costo en Monterrey y su área metropolitana. Vamos a tu casa, medimos y después te entregamos un presupuesto por escrito con precio cerrado. ¿Te la agendo?',
      lead: true, chips: ['Agendar visita', '¿Cuánto tarda una cocina?', 'Quiero cotizar'] },
    { id: 'minimo', pri: 45,
      k: ['minimo|35', 'precio minimo|55', 'cuanto es el minimo|55', 'desde cuanto|25', 'desde cuanto es|30', 'monto minimo|30', 'presupuesto minimo|30', 'proyecto minimo|30', 'obra minima|30', 'pedido minimo|30', 'lo minimo|25', 'a partir de cuanto|35', 'a partir de|15', '30000|40', '30 mil|40', 'cuanto es lo minimo|45', 'cuanto minimo|35', 'trabajos chico|25', 'trabajan obra chica|25', 'proyecto chico|25', 'proyectos chico|25', 'arreglo chico|25', 'tengo poco presupuesto|35', 'poco presupuesto|35', 'presupuesto bajo|35', 'barato|25', 'economico|25', 'mas barato|30', 'algo sencillo|20', 'cuanto necesito|30', 'cuanto debo tener|30', 'con cuanto|20', 'minimo de inversion|40', 'cuanto minimo cuesta|45'],
      a: 'Tomamos proyectos desde ' + MIN + '. Para saber cuánto costaría el tuyo, lo mejor es el cotizador o una visita sin costo para tomar medidas; el presupuesto va por escrito con precio cerrado.',
      cta: true, chips: ['Quiero cotizar', '¿La visita tiene costo?', '¿Cuánto tarda una cocina?'] },
    { id: 'precio', pri: 40,
      k: ['precio|30', 'costo|28', 'cuesta|30', 'cuesta mucho|25', 'cuanto sale|30', 'cuanto me sale|35', 'cuanto salen|30', 'cuanto sale una|35', 'cuanto cuesta|35', 'cuanto me cuesta|35', 'cuanto me costaria|35', 'cuanto costaria|35', 'cuanto cobran|30', 'cuanto me cobran|35', 'cuanto cobras|30', 'cuanto vale|30', 'cuanto valen|30', 'cuanto es|20', 'cuanto serian|25', 'cuanto seria|25', 'cuanto saldria|30', 'a como|25', 'a como sale|35', 'que precio|35', 'que costo|35', 'que precio tiene|40', 'cotiza|25', 'cotizar|30', 'cotizan|30', 'cotizacion|30', 'cotizo|25', 'cotizame|30', 'presupuesto|25', 'presu|20', 'tarifa|25', 'me pasan precio|35', 'me dan precio|35', 'rango de precio|35', 'precio aproximado|40', 'precio aproximado|40', 'costo aproximado|40', 'cuanto cobran por|35', 'cuanto|12', 'quiero cotizar|45', 'me pueden cotizar|45', 'pueden cotizar|40', 'es caro|25', 'caro|20', 'cuanto me va a costar|40', 'me va a costar|30', 'salen caro|30', 'cuanto gasto|25', 'cuanto de presupuesto|25', 'precios|30', 'costos|28'],
      a: 'El precio depende de las medidas, los materiales y los acabados, así que prefiero no darte una cifra al aire. Puedes cotizar en un minuto en la página, o agendar una visita sin costo y te entregamos un presupuesto por escrito con precio cerrado. Tomamos proyectos desde ' + MIN + '.',
      lead: true, cta: true, chips: ['¿La visita tiene costo?', '¿Cuánto tarda una cocina?', 'Cubiertas: cuarzo, granito…'] },
    { id: 'tiempo_bano', pri: 40,
      k: ['cuanto tarda un bano|45', 'cuanto tarda el bano|45', 'cuanto tarda bano|45', 'tarda un bano|40', 'tiempo del bano|40', 'tiempo de un bano|40', 'tiempo de bano|40', 'cuanto se tardan en un bano|50', 'cuantas semanas un bano|50', 'cuanto dura un bano|45', 'cuanto dura el bano|45', 'cuanto tardan en un bano|50', 'bano en cuanto tiempo|45'],
      c: [[['tarda', 'tardan', 'tardas', 'tiempo', 'semana', 'dura', 'duran', 'entrega', 'entregan', 'plazo', 'rapido', 'urgente', 'cuando queda', 'queda listo', 'cuando termin', 'cuanto dura'], ['bano', 'regadera', 'cancel']]],
      a: 'Un baño normalmente tarda de 1 a 2 semanas. La fecha exacta va en tu presupuesto por escrito. ¿Es un baño completo o solo algunos cambios?',
      chips: ['¿Cuánto tarda una cocina?', 'Quiero cotizar', '¿La visita tiene costo?'] },
    { id: 'tiempo_cocina', pri: 40,
      k: ['cuanto tarda una cocina|45', 'cuanto tarda la cocina|45', 'tarda una cocina|40', 'tiempo de una cocina|40', 'tiempo de la cocina|40', 'cuanto se tardan en una cocina|50', 'cuanto dura una cocina|45', 'cuantas semanas una cocina|50', 'cocina en cuanto tiempo|45'],
      c: [[['tarda', 'tardan', 'tardas', 'tiempo', 'semana', 'dura', 'duran', 'entrega', 'entregan', 'plazo', 'rapido', 'urgente', 'cuando queda', 'queda listo', 'cuando termin'], ['cocina', 'isla', 'alacena']]],
      a: 'Una cocina integral normalmente tarda de 3 a 4 semanas desde que apruebas el diseño. La fecha exacta va en tu presupuesto por escrito. ¿Tienes alguna fecha en mente?',
      chips: ['¿Cuánto tarda un baño?', 'Quiero cotizar', '¿La visita tiene costo?'] },
    { id: 'tiempo', pri: 38,
      k: ['cuanto tarda|25', 'cuanto tardan|25', 'cuanto tiempo|25', 'cuanto se tardan|30', 'cuanto se tarda|30', 'en cuanto tiempo|30', 'en cuanto tiempo queda|40', 'cuanto dura|25', 'cuanto duran|25', 'tiempo|15', 'tardan|15', 'tarda|15', 'tardas|15', 'semana|15', 'dia|8', 'entrega|15', 'entregan|15', 'plazo|15', 'fecha de entrega|25', 'cuando queda|25', 'cuando terminan|30', 'cuando entregan|30', 'queda listo|25', 'rapido|12', 'urgente|20', 'tengo prisa|25', 'para cuando|25', 'cuanto demoran|30', 'demoran|15', 'cuanto se demoran|30', 'cuanto dura la obra|35', 'cuanto dura la reforma|35', 'cuanto tiempo lleva|35', 'cuantas semanas|35', 'cuantos dia|30', 'para navidad|25', 'para diciembre|25', 'para fin de ano|25'],
      a: 'De forma orientativa: una cocina integral normalmente tarda de 3 a 4 semanas desde que apruebas el diseño; un baño, de 1 a 2 semanas. La fecha exacta va en tu presupuesto por escrito. ¿Tienes alguna fecha en mente?',
      lead: true, chips: ['¿Cuánto tarda un baño?', 'Quiero cotizar', '¿La visita tiene costo?'] },
    { id: 'visita', pri: 35,
      k: ['visita|15', 'visitan|15', 'visitar|15', 'visitarme|25', 'agendar|25', 'agendar visita|40', 'agendar una visita|40', 'agenda una visita|40', 'agendame|30', 'cita|20', 'quiero una cita|35', 'quiero una cita para medir|50', 'una cita|25', 'para medir|30', 'medir|20', 'medidas|20', 'tomar medidas|35', 'toman medidas|35', 'medicion|20', 'ir a mi casa|35', 'vengan a mi casa|35', 'vienen a mi casa|35', 'pueden venir|30', 'puedes venir|30', 'venir a medir|40', 'domicilio|25', 'a domicilio|30', 'pasan a ver|30', 'pasar a ver|30', 'ver mi cocina|30', 'ver el espacio|30', 'cuando pueden venir|40', 'cuando pueden ir|40', 'quiero que vayan|35', 'que vayan a ver|35', 'quiero que me visiten|40', 'como es la visita|45', 'en que consiste la visita|50', 'que hacen en la visita|50', 'cuanto dura la visita|50', 'quiero agendar|35', 'agendar cita|35', 'quiero medir|30', 'apartar fecha|25', 'agendo|25', 'me agendan|35', 'coordinar visita|40', 'coordinar|20'],
      a: 'La visita y la toma de medidas no tienen costo en Monterrey y su área metropolitana. Déjame tu nombre, tu WhatsApp y el día y la hora que te acomodan, y lo coordinamos. Respondemos el mismo día hábil.',
      lead: true, chips: ['¿La visita tiene costo?', '¿En qué zonas trabajan?', 'Quiero cotizar'] },
    { id: 'garantia', pri: 35,
      k: ['garantia|30', 'garantizan|30', 'garantizado|25', 'garantiza|25', 'tienen garantia|40', 'dan garantia|40', 'incluye garantia|40', 'cuanto dura la garantia|45', 'si falla|30', 'si algo falla|35', 'si se descompone|35', 'si sale mal|35', 'defecto|25', 'defectos|25', 'devolucion|25', 'reclamo|25', 'reclamar|25', 'respaldo|25', 'posventa|30', 'post venta|30', 'despues de la obra|30', 'despues de instalar|30', 'si se danan|30', 'si se dana|30'],
      a: 'Damos garantía en mano de obra e instalación, y los materiales tienen la garantía del fabricante. Los detalles van en tu presupuesto por escrito. ¿Qué espacio estás pensando remodelar?',
      chips: ['¿Cómo es el proceso?', 'Quiero cotizar', '¿La visita tiene costo?'] },
    { id: 'pago', pri: 36,
      k: ['pago|20', 'pagar|20', 'pagos|20', 'se paga|30', 'como se paga|40', 'como pago|40', 'como pagar|40', 'formas de pago|45', 'forma de pago|45', 'metodos de pago|45', 'metodo de pago|45', 'anticipo|40', 'enganche|40', 'adelanto|35', 'apartado|20', 'factura|40', 'facturan|40', 'facturar|40', 'recibo|20', 'financiamiento|45', 'financian|45', 'financiar|45', 'financiado|40', 'dan financiamiento|50', 'credito|35', 'a credito|40', 'a meses|35', 'meses sin intereses|50', 'msi|40', 'mensualidades|40', 'mensualidad|40', 'abonos|40', 'a plazos|35', 'parcialidades|40', 'tarjeta|30', 'transferencia|30', 'efectivo|30', 'deposito|25', 'cheque|30', 'liquidar|30', 'liquidacion|30', 'cuando se paga|45', 'cuanto de anticipo|55', 'iva|30', 'cfdi|40', 'rfc|40', 'paypal|30', 'plan de pagos|50', 'pagar a meses|50'],
      a: 'Las formas de pago, anticipos, facturas y cualquier opción de financiamiento las confirma directamente un asesor, para darte la información correcta. Escríbele por WhatsApp o déjame tus datos y te contactan el mismo día hábil.',
      lead: true, cta: true, chips: ['¿Cómo es el proceso?', 'Quiero cotizar', '¿La visita tiene costo?'] },
    { id: 'horario', pri: 36,
      k: ['horario|40', 'horarios|40', 'a que hora|35', 'que hora abren|45', 'a que hora abren|50', 'a que hora cierran|50', 'a que hora atienden|50', 'cuando abren|45', 'cuando cierran|45', 'abren sabado|50', 'abren domingo|50', 'abren hoy|45', 'abren|25', 'cierran|25', 'atienden|30', 'atienden sabado|50', 'atienden domingo|50', 'dias de atencion|45', 'hora de atencion|45', 'horas de atencion|45', 'trabajan sabado|45', 'trabajan domingo|45', 'trabajan fin de semana|50', 'hasta que hora|45', 'estan abiertos|45', 'estan disponibles|35', 'disponibles ahorita|40', 'abiertos|25'],
      a: 'El horario de atención te lo confirma un asesor por WhatsApp, para no decirte algo equivocado. Lo que sí te puedo decir es que respondemos el mismo día hábil.',
      cta: true, chips: ['Hablar con un asesor', 'Quiero cotizar', '¿La visita tiene costo?'] },
    { id: 'direccion', pri: 37,
      k: ['donde estan|40', 'donde estan ubicado|50', 'donde se ubican|50', 'donde queda|45', 'donde quedan|45', 'donde es|30', 'donde los encuentro|50', 'donde los encontramos|50', 'donde los encuentro|50', 'donde los localizo|50', 'donde estan|40', 'donde hay|30', 'direccion|40', 'ubicacion|35', 'ubicados|30', 'ubicadas|30', 'domicilio fiscal|50', 'oficina|35', 'oficinas|35', 'showroom|40', 'sala de exhibicion|50', 'tienda|30', 'taller|30', 'fabrica|25', 'local|20', 'sucursal|35', 'sucursales|35', 'mapa|30', 'google maps|40', 'como llego|40', 'como llegar|40', 'dan la direccion|50', 'cual es su direccion|50', 'su direccion|45', 'pueden ir a la tienda|50', 'puedo ir|30', 'puedo visitarlos|40', 'puedo ir a verlos|45', 'conocerlos en persona|45', 'estacionamiento|30', 'calle|20', 'colonia|20'],
      a: 'Atendemos en Monterrey y su área metropolitana, y la visita a tu casa no tiene costo. La dirección exacta y cómo llegar te los confirma un asesor por WhatsApp, para no darte un dato equivocado.',
      cta: true, chips: ['¿En qué zonas trabajan?', '¿La visita tiene costo?', 'Hablar con un asesor'] },
    { id: 'zona', pri: 34,
      k: ['zona|25', 'zonas|25', 'en que zona|40', 'en que zonas|40', 'en que zonas trabajan|50', 'zonas de trabajo|45', 'zona de cobertura|50', 'cobertura|35', 'cubren|30', 'cubren la zona|40', 'llegan a|40', 'llegan hasta|40', 'llegan|20', 'hasta donde llegan|50', 'trabajan en|35', 'trabajan en mi zona|50', 'atienden en|35', 'atienden mi zona|45', 'atienden en mi colonia|50', 'hacen obras en|40', 'hacen trabajos en|40', 'van a|20', 'van hasta|30', 'monterrey|30', 'area metropolitana|40', 'san pedro|40', 'garza garcia|40', 'san nicolas|40', 'guadalupe|35', 'apodaca|40', 'santa catarina|40', 'escobedo|40', 'general escobedo|40', 'juarez|25', 'garcia|25', 'cumbres|30', 'del valle|30', 'valle oriente|30', 'contry|30', 'tecnologico|20', 'mitras|30', 'san jeronimo|30', 'santiago|25', 'nuevo leon|35', 'nl|20', 'mty|30', 'regio|20', 'fuera de monterrey|40', 'otra ciudad|40', 'foraneo|35', 'foraneos|35', 'saltillo|35', 'cdmx|35', 'guadalajara|35', 'reynosa|35', 'tampico|35', 'queretaro|35', 'otro estado|40', 'vivo en|25', 'vivo por|25', 'mi casa esta en|35', 'estoy en|25'],
      a: 'Trabajamos en Monterrey y su área metropolitana: San Pedro, San Nicolás, Guadalupe, Apodaca, Santa Catarina, Escobedo y otras zonas. ¿En qué colonia o municipio está tu casa? Si no estás seguro de que lleguemos, un asesor te lo confirma por WhatsApp.',
      lead: true, chips: ['¿La visita tiene costo?', 'Quiero cotizar', '¿Cuánto tarda una cocina?'] },
    { id: 'isla_barra', pri: 33,
      k: ['isla|35', 'una isla|40', 'con isla|40', 'quiero una isla|50', 'isla central|45', 'peninsula|35', 'barra|30', 'una barra|35', 'barra de desayuno|50', 'barra para desayunar|55', 'barra de bar|45', 'desayunador|40', 'desayunar|30', 'comedor integrado|40', 'comedor en la cocina|45', 'cocina abierta|35', 'cocina con barra|50', 'cocina con isla|50', 'bar|15', 'banquetas|25', 'bancos|20', 'mesa integrada|40'],
      a: 'Sí, se puede pensar en una isla o una barra para desayunar. Que funcione depende del espacio y de cómo uses la cocina, y con las medidas reales te proponemos algo concreto. El diseño se arma a tu medida y lo ves antes de aprobar. ¿Qué tan grande es tu cocina?',
      lead: true, chips: ['Ideas para espacios pequeños', 'Cubiertas: cuarzo, granito…', '¿La visita tiene costo?'] },
    { id: 'alacena', pri: 33,
      k: ['alacena|35', 'alacenas|35', 'despensa|35', 'gabinete|35', 'gabinetes|35', 'gaveta|35', 'gavetas|35', 'cajon|30', 'cajones|30', 'cajonera|30', 'entrepano|30', 'entrepanos|30', 'almacenaje|35', 'almacenamiento|35', 'guardar|20', 'guardar cosas|30', 'mas espacio|25', 'mas lugar|25', 'muebles altos|35', 'muebles bajos|35', 'muebles de cocina|40', 'mueble|20', 'torre|20', 'esquinero|30', 'esquineros|30', 'carrusel|30', 'organizar|25', 'organizador|25', 'organizadores|25', 'especiero|30', 'cacerolero|30', 'trastero|30'],
      a: 'Todo se hace a la medida: alacena, muebles altos y bajos, cajones y los esquineros que tu espacio necesite. Los herrajes son de cierre suave. Con tus medidas reales te proponemos la distribución. ¿Qué es lo que más te falta guardar?',
      lead: true, chips: ['Herrajes y acabados', 'Ideas para espacios pequeños', 'Quiero cotizar'] },
    { id: 'puertas', pri: 32,
      k: ['puerta|30', 'puertas|30', 'puertas de cocina|40', 'las puertas|35', 'frente|20', 'frentes|20', 'frentes de cocina|40', 'acabado de puertas|45', 'puertas de madera|45', 'puertas blancas|40', 'puertas lisas|40', 'puertas de vidrio|40', 'vidrio|20', 'cristal|20', 'puertas con vidrio|45', 'sin jaladera|40', 'jaladera|30', 'jaladeras|30', 'tiradores|30', 'tirador|30', 'push|20', 'apertura|20'],
      a: 'Las puertas del mueble van en maderas y chapas en tonos claros y nogal, con herrajes de cierre suave. El acabado se define al aprobar el diseño y lo ves antes con muestras en tu casa. ¿Qué tono te gusta más?',
      chips: ['Estilos de cocina', 'Herrajes y acabados', 'Quiero cotizar'] },
    { id: 'material_dudoso', pri: 44,
      k: ['mdf|55', 'melamina|55', 'melaminico|55', 'aglomerado|55', 'triplay|55', 'multiplay|55', 'pino|45', 'madera solida|55', 'madera maciza|55', 'madera de verdad|55', 'madera real|50', 'madera natural|50', 'tropicalizado|55', 'hdf|55', 'formaica|55', 'formica|55', 'pvc|45', 'acero inoxidable|55', 'aluminio|45', 'encino|45', 'parota|45', 'cedro|45', 'caoba|45', 'roble|45', 'tipo de madera|55', 'que madera|50', 'que material de madera|55', 'de que estan hechos|55', 'de que es el mueble|50', 'de que material|45', 'que tipo de material|50', 'que calidad|40', 'de que calidad|40', 'calidad de los materiales|50', 'marca de|35', 'que marcas|45', 'que marca|45', 'blum|55', 'hettich|55', 'grass|50', 'cuarzo silestone|55', 'silestone|55', 'dekton|55', 'corian|55', 'neolith|55'],
      a: 'Sobre ese material o marca en específico, prefiero que te lo confirme un asesor por WhatsApp para no darte un dato equivocado. Lo que sí manejamos: maderas y chapas en tonos claros y nogal, cubiertas de cuarzo, granito o laminado, y herrajes de cierre suave. Los eliges con muestras en tu casa.',
      cta: true, chips: ['Cubiertas: cuarzo, granito…', 'Herrajes y acabados', 'Hablar con un asesor'] },
    { id: 'cubierta', pri: 32,
      k: ['cubierta|35', 'cubiertas|35', 'cuarzo|35', 'granito|35', 'laminado|35', 'laminados|35', 'encimera|35', 'encimeras|35', 'meson|35', 'mesón|35', 'tarja|20', 'cuarzo granito|45', 'granito o laminado|55', 'cubierta de cuarzo|50', 'cubierta de granito|50', 'cubierta laminada|50', 'cual es mejor|30', 'cual me recomiendan|35', 'mesa de trabajo|25', 'marmol|30', 'piedra|20', 'piedra natural|30', 'porcelanato|20', 'resiste|20', 'se mancha|30', 'se raya|30', 'cuarzo o granito|55', 'diferencia entre cuarzo|55', 'diferencia entre granito|55', 'topes|25'],
      a: 'Para la cubierta manejamos cuarzo, granito o laminado. Los eliges con muestras en mano, en tu casa. Si quieres comparar cuál te conviene más, cuéntame qué tanto uso le das a tu cocina.',
      chips: ['Herrajes y acabados', 'Estilos de cocina', 'Quiero cotizar'] },
    { id: 'colores', pri: 31,
      k: ['color|30', 'colores|30', 'de que colores|45', 'que colores|40', 'que colores manejan|50', 'colores de cocina|45', 'tonos|30', 'tono|30', 'tonos claros|40', 'nogal|35', 'chapa|30', 'chapas|30', 'madera|25', 'maderas|25', 'madera clara|40', 'acabado|20', 'acabados|20', 'material|15', 'materiales|15', 'que materiales usan|45', 'que materiales manejan|50', 'catalogo|30', 'muestras|30', 'muestrario|30', 'blanco|25', 'negro|25', 'gris|25', 'oscuro|25', 'claro|20', 'beige|25', 'verde|20', 'azul|20', 'combinar|25', 'combinacion|25', 'textura|25', 'veta|25'],
      a: 'Manejamos maderas y chapas en tonos claros y nogal, cubiertas de cuarzo, granito o laminado, y herrajes con cierre suave. Los eliges con las muestras en mano, en tu casa, antes de aprobar el diseño. ¿Qué tono te late más?',
      chips: ['Cubiertas: cuarzo, granito…', 'Herrajes y acabados', 'Estilos de cocina'] },
    { id: 'estilos', pri: 30,
      k: ['estilo|30', 'estilos|30', 'estilos de cocina|45', 'moderna|30', 'moderno|30', 'clasica|30', 'clasico|30', 'minimalista|35', 'rustica|30', 'rustico|30', 'industrial|30', 'contemporanea|30', 'contemporaneo|30', 'diseno|20', 'disenos|20', 'diseno de cocina|40', 'disenan|25', 'disenar|25', 'ideas|25', 'inspiracion|30', 'tendencia|25', 'tendencias|25', 'que se usa|25', 'que me recomiendan|30', 'recomendacion|25', 'recomiendan|25', 'que opciones|30', 'opciones|20', 'cocina bonita|35', 'cocina elegante|35', 'cocina de revista|35', 'cocina como|20', 'quiero algo moderno|45', 'a mi gusto|25', 'a mi medida|25', 'a la medida|25', 'personalizada|30', 'personalizado|30'],
      a: 'Hay para todos los gustos: cocinas modernas, más clásicas, o con madera clara y nogal. No manejamos un catálogo cerrado; el diseño se arma a tu medida y lo ves antes de aprobar. ¿Qué estilo te late más?',
      lead: true, chips: ['Cubiertas: cuarzo, granito…', 'Ideas para espacios pequeños', '¿La visita tiene costo?'] },
    { id: 'herrajes', pri: 31,
      k: ['herraje|35', 'herrajes|35', 'herrajes y acabados|55', 'bisagra|35', 'bisagras|35', 'cierre suave|40', 'cierre lento|40', 'cierre amortiguado|40', 'amortiguado|30', 'corredera|30', 'correderas|30', 'riel|25', 'rieles|25', 'iluminacion|35', 'luces|30', 'luz led|35', 'led|25', 'lamparas|25', 'focos|25', 'iluminar|30'],
      a: 'Los herrajes son de cierre suave, y la iluminación y los acabados se definen al aprobar el diseño. ¿Quieres verlos con muestras en una visita sin costo?',
      lead: true, chips: ['Cubiertas: cuarzo, granito…', 'Estilos de cocina', '¿La visita tiene costo?'] },
    { id: 'pequeno', pri: 33,
      k: ['pequeno|30', 'pequena|30', 'chico|25', 'chica|25', 'chiquita|40', 'chiquito|40', 'cocina chiquita|55', 'cocina chica|55', 'cocina pequena|55', 'cocina muy chica|55', 'bano chico|50', 'bano pequeno|50', 'poco espacio|40', 'espacio reducido|45', 'espacio chico|45', 'espacios pequeno|50', 'espacios chico|50', 'espacio pequeno|50', 'ideas para espacios pequeno|60', 'minidepa|40', 'depa|35', 'depa pequeno|55', 'es un depa|50', 'es un depa pequeno|60', 'departamento|35', 'depas|35', 'estudio|20', 'loft|30', 'apretado|35', 'apretada|35', 'angosta|35', 'angosto|35', 'estrecha|35', 'estrecho|35', 'cuartito|35', 'casita|25', 'metros cuadrados|30', 'metros|20', 'm2|25', 'mini cocina|50', 'minicocina|50', 'no cabe|30', 'no me cabe|35', 'aprovechar espacio|45', 'aprovechar el espacio|45', 'optimizar|30'],
      a: 'En espacios pequeños ayuda aprovechar bien la altura y dejar todo a la medida, sin huecos perdidos. Con las medidas reales te proponemos algo concreto. Cuéntame, ¿es departamento o casa, y qué tan chico es el espacio?',
      lead: true, chips: ['¿La visita tiene costo?', 'Estilos de cocina', 'Quiero cotizar'] },
    { id: 'bano', pri: 28,
      k: ['bano|30', 'banos|30', 'bano completo|45', 'remodelar bano|50', 'remodelacion de bano|50', 'remodelar mi bano|55', 'regadera|35', 'la regadera|35', 'cancel|35', 'cancel de cristal|45', 'tina|30', 'jacuzzi|30', 'lavabo|30', 'wc|25', 'excusado|30', 'inodoro|30', 'sanitario|25', 'mueble de bano|45', 'azulejo de bano|45', 'baneras|25', 'banera|25', 'ducha|35', 'fea|20', 'viejo|15', 'vieja|15', 'feo|15', 'esta feo|30', 'esta fea|30', 'esta viejo|35', 'esta vieja|35', 'se filtra|35', 'humedad|35', 'moho|35', 'baño|30'],
      a: 'Remodelamos baños: regadera, cancel, muebles y azulejo. Normalmente tardan de 1 a 2 semanas; la fecha exacta va en el presupuesto. ¿Qué es lo que más te urge cambiar?',
      lead: true, chips: ['¿Cuánto tarda un baño?', '¿La visita tiene costo?', 'Quiero cotizar'] },
    { id: 'closet', pri: 28,
      k: ['closet|40', 'closets|40', 'vestidor|40', 'vestidores|40', 'closet y vestidor|55', 'closets y vestidores|55', 'ropero|35', 'roperos|35', 'guardarropa|35', 'walk in|45', 'walk in closet|55', 'zapatera|35', 'zapatero|35', 'armario|35', 'armarios|35', 'cuarto de ropa|40', 'cuarto de vestir|40', 'puertas corredizas|35', 'closet a la medida|55', 'recamara|25', 'cuarto|15', 'habitacion|20', 'cajonera de closet|45', 'libreria|25', 'librero|25', 'escritorio|25', 'carpinteria|35', 'carpintero|35', 'muebles a la medida|45', 'tv|15', 'cuarto de lavado|30', 'lavanderia|30'],
      a: 'Sí, hacemos closets y vestidores a la medida del cuarto, con carpintería e iluminación. ¿Es para una recámara o un espacio más grande?',
      lead: true, chips: ['¿La visita tiene costo?', 'Quiero cotizar', '¿Cómo es el proceso?'] },
    { id: 'mantenimiento', pri: 28,
      k: ['mantenimiento|35', 'cuidar|30', 'cuidado|30', 'cuidados|30', 'como cuido|45', 'como se cuida|45', 'como se limpia|45', 'limpiar|30', 'limpieza de la cocina|45', 'limpiar la cubierta|50', 'se limpia|30', 'se limpia facil|45', 'dura mucho|30', 'durabilidad|35', 'resistente|30', 'cuanto dura|20', 'se hincha|35', 'humedad en cocina|40', 'desgaste|30'],
      a: 'Cada material tiene su forma de cuidarse, y te orientamos con el cuidado de cada uno cuando lo eliges. Para detalles técnicos o de garantía, un asesor te los confirma por WhatsApp. ¿Qué material te interesa?',
      cta: true, chips: ['Cubiertas: cuarzo, granito…', 'Garantía', 'Hablar con un asesor'] },
    { id: 'escombro', pri: 30,
      k: ['escombro|40', 'polvo|35', 'limpieza|25', 'desorden|30', 'desmantelar|30', 'desmontar|30', 'retiran|35', 'retiran lo viejo|50', 'retiran el escombro|50', 'tiran lo viejo|45', 'quitan lo viejo|45', 'se llevan|30', 'se llevan el escombro|50', 'ensucian|35', 'ensucia|35', 'dejan limpio|45', 'dejan sucio|45', 'proteg|30', 'protegen|35', 'protegen mi casa|50', 'cuidan mi casa|45', 'cuidan los pisos|50', 'basura|25', 'tiradero|25', 'molestia|25', 'ruido|25', 'vivir en la casa|35', 'vivir ahi|35', 'mientras vivo|40', 'mientras estoy|35', 'cocina vieja|25', 'quitar la cocina|45', 'quitan la cocina|45', 'demolicion|35', 'demoler|30'],
      a: 'Sí. Retiramos lo que se va a sustituir y el escombro, protegemos tus pisos y muebles, y limpiamos al cerrar cada jornada. Si tienes una duda específica de tu caso, un asesor te la responde por WhatsApp.',
      cta: true, chips: ['¿Cómo es el proceso?', '¿Cuánto tarda una cocina?', 'Quiero cotizar'] },
    { id: 'proceso', pri: 30,
      k: ['proceso|35', 'como trabajan|45', 'como funciona|45', 'como es el proceso|55', 'como son los pasos|50', 'pasos|30', 'forma de trabajo|45', 'formas de trabajo|45', 'metodologia|35', 'que pasos|45', 'como empezamos|45', 'como empiezo|45', 'como empezar|45', 'por donde empiezo|45', 'quiero empezar|40', 'primer paso|45', 'siguiente paso|45', 'que sigue|40', 'que necesito|40', 'que necesito para empezar|55', 'que ocupo|40', 'como contrato|45', 'como los contrato|50', 'como funciona el servicio|55', 'como es el servicio|50', 'explicame|30', 'explicame como|45', 'diseno fabricacion|45', 'un solo equipo|40', 'quien lo instala|45', 'quien instala|45', 'ustedes instalan|45', 'ustedes fabrican|45', 'fabrican|35', 'instalan|35', 'instalacion|30', 'fabricacion|30', 'contrato|30', 'por escrito|35', 'precio cerrado|40', 'sube el precio|45', 'cobran extra|45', 'costos extra|45', 'costos ocultos|50', 'cambios|25', 'cambiar el diseno|40', 'subcontratan|40'],
      a: 'Diseñamos, fabricamos e instalamos con un solo equipo. Todo va en un presupuesto por escrito con precio cerrado: no sube a mitad de obra sin tu autorización y los cambios se cotizan por escrito. ¿Quieres empezar con una visita sin costo?',
      lead: true, chips: ['¿La visita tiene costo?', '¿Cuánto tarda una cocina?', 'Garantía'] },
    { id: 'cocina', pri: 20,
      k: ['cocina|15', 'cocinas|15', 'cocina integral|35', 'cocinas integrales|35', 'cocina nueva|35', 'remodelar cocina|45', 'remodelar mi cocina|50', 'remodelacion de cocina|50', 'mi cocina|25', 'la cocina|20', 'una cocina|25', 'quiero una cocina|45', 'ocupo una cocina|45', 'necesito una cocina|45', 'cambiar mi cocina|50', 'cambiar la cocina|50', 'integral|20', 'cocineta|25', 'estufa|20', 'campana|20', 'fregadero|20', 'parrilla|20', 'refrigerador|20', 'refri|20', 'horno|20', 'cocina de|25', 'cocinar|15'],
      a: 'Las cocinas integrales son lo nuestro: las diseñamos, fabricamos e instalamos con un solo equipo. ¿Cómo es tu cocina hoy y qué te gustaría cambiar?',
      lead: true, chips: ['Estilos de cocina', 'Cubiertas: cuarzo, granito…', 'Quiero cotizar', '¿Cuánto tarda una cocina?'] },
    { id: 'servicios', pri: 24,
      k: ['servicio|25', 'servicios|25', 'que servicios|45', 'que servicios hacen|55', 'que hacen|40', 'que ofrecen|45', 'que manejan|40', 'a que se dedican|50', 'en que trabajan|45', 'que trabajos hacen|50', 'que tipo de trabajos|50', 'que remodelaciones|45', 'remodelacion|30', 'remodelaciones|30', 'remodelar|30', 'reforma|30', 'reformas|30', 'obra|25', 'obras|25', 'remodelacion integral|45', 'pisos|30', 'piso|30', 'azulejo|30', 'impermeabilizacion|35', 'impermeabilizar|35', 'azotea|35', 'pintura|30', 'pintar|30', 'ceramica|25', 'vinilico|25', 'porcelanato|25', 'techo|20', 'puertas y ventanas|30', 'ventanas|25', 'electricidad|30', 'plomeria|30', 'albanil|35', 'albanileria|35', 'tablaroca|35', 'yeso|25', 'sala|20', 'patio|25', 'jardin|25', 'terraza|25', 'fachada|25', 'ampliacion|30', 'construccion|30', 'construir|30', 'casa completa|40', 'toda la casa|40', 'departamento completo|45', 'hacen|15', 'hacen cocinas|35', 'hacen banos|40', 'hacen closets|40'],
      a: 'Hacemos cocinas integrales y reformas: baños, closets y vestidores, pisos y azulejo, impermeabilización de azoteas, pintura y acabados. Diseñamos, fabricamos e instalamos con un solo equipo. Si lo que buscas es otra cosa, un asesor te confirma por WhatsApp si lo hacemos. ¿Qué te gustaría remodelar?',
      lead: true, chips: ['Baños', 'Closets y vestidores', 'Quiero cotizar'] },
    { id: 'empresa', pri: 32,
      k: ['quienes son|50', 'quien son|45', 'quienes sois|45', 'que es reforma innovare|55', 'quien es reforma innovare|55', 'reforma innovare|45', 'innovare|40', 'la empresa|35', 'su empresa|35', 'de que empresa|40', 'cuentame de ustedes|55', 'hablame de ustedes|55', 'cuentame de la empresa|55', 'sobre ustedes|45', 'sobre la empresa|45', 'nosotros|20', 'ustedes quienes|50', 'quien eres|20', 'son de confianza|50', 'son confiables|50', 'confianza|30', 'confiable|30', 'serios|25', 'es seguro|35', 'son serios|50', 'estafa|40', 'fraude|40', 'los conocen|40', 'experiencia|40', 'cuantos anos|45', 'anos de experiencia|55', 'desde cuando|40', 'trayectoria|40', 'cuanto tiempo llevan|50', 'llevan mucho|40', 'portafolio|40', 'trabajos anteriores|50', 'trabajos realizados|50', 'proyectos realizados|50', 'ejemplos|35', 'ejemplos de trabajos|50', 'fotos|30', 'fotos de trabajos|50', 'galeria|35', 'referencias|40', 'recomendaciones de clientes|50', 'opiniones|40', 'resenas|40', 'testimonios|40', 'clientes|25', 'clientes anteriores|45', 'han hecho|30', 'certificados|35', 'certificacion|35', 'equipo|20', 'maestros|25', 'trabajadores|25', 'empleados|25'],
      a: 'Somos Reforma Innovare: cocinas integrales y reformas —baños, closets y más— en Monterrey y su área metropolitana. Diseñamos, fabricamos e instalamos con un solo equipo. Si quieres ver ejemplos de trabajos o referencias, un asesor te las comparte por WhatsApp.',
      cta: true, chips: ['¿Cómo es el proceso?', 'Garantía', 'Quiero cotizar'] },
    { id: 'contacto', pri: 32,
      k: ['whatsapp|40', 'telefono|40', 'llamar|40', 'llamada|40', 'llamen|40', 'llamenme|45', 'llamarme|40', 'hablar|25', 'hablar con alguien|55', 'hablar con una persona|55', 'hablar con un asesor|60', 'hablar con un humano|55', 'hablar con un vendedor|55', 'hablar con ventas|55', 'hablar con el equipo|55', 'hablar con ustedes|50', 'quiero hablar|40', 'quiero hablar con alguien|60', 'quiero hablar con un asesor|65', 'platicar con alguien|55', 'pasame con alguien|55', 'comunicarme|40', 'comunicar|35', 'contactar|40', 'contactarlos|45', 'contacto|35', 'su contacto|45', 'numero|25', 'su numero|40', 'dame su numero|50', 'asesor|35', 'un asesor|40', 'asesora|35', 'vendedor|35', 'ejecutivo|35', 'ventas|30', 'atencion a clientes|45', 'persona|20', 'una persona|30', 'alguien|20', 'alguien real|45', 'humano|30', 'correo|30', 'email|30', 'mail|30', 'mandar mensaje|40', 'mandarles mensaje|45', 'escribirles|40', 'escribir|25', 'mensaje|20', 'me contacten|50', 'me contactan|50', 'pueden llamarme|55', 'me marcan|45', 'marcar|30', 'telefonica|30', 'hablemos|35', 'redes|25', 'instagram|30', 'facebook|30', 'tiktok|30'],
      a: 'Con gusto. Déjame tu nombre y cómo contactarte, y el día y la hora que te acomodan, y te armo el mensaje listo para enviar por WhatsApp. Respondemos el mismo día hábil.',
      lead: true, cta: true, chips: ['Quiero cotizar', '¿La visita tiene costo?'] },
    { id: 'saludo', pri: 10,
      k: ['hola|20', 'holi|20', 'holis|20', 'hello|20', 'hey|20', 'ola|15', 'buenas|20', 'buena|10', 'buen dia|30', 'buenos dias|30', 'buenas tardes|30', 'buenas noches|30', 'buen dia a todos|40', 'que tal|30', 'como estas|30', 'como esta|30', 'como andas|30', 'como te va|30', 'que onda|30', 'que hubo|30', 'que pasa|25', 'saludos|25', 'un saludo|25', 'que gusto|20', 'hi|15', 'quiubo|25', 'quihubo|25', 'epa|15', 'bienvenid|10', 'hola buenas|35', 'hola buenas tardes|45', 'hola buenos dias|45', 'hola buenas noches|45', 'hola que tal|45', 'orale|15', 'hola musee|40', 'musee|25', 'hola como estas|45'],
      a: '¡Hola! Soy Musee, la asistente de Reforma Innovare. Cuéntame, ¿qué te gustaría remodelar?',
      chips: ['Quiero cotizar', '¿La visita tiene costo?', '¿Cuánto tarda una cocina?', 'Baños', 'Closets y vestidores'] },
    { id: 'gracias', pri: 10,
      k: ['gracias|30', 'muchas gracias|40', 'mil gracias|40', 'gracias musee|45', 'te lo agradezco|40', 'agradezco|30', 'se agradece|35', 'muy amable|30', 'perfecto|25', 'excelente|25', 'genial|25', 'chido|25', 'padre|15', 'super|20', 'muy bien|25', 'de acuerdo|25', 'entendido|25', 'enterado|25', 'listo|20', 'esta bien|25', 'vale|20', 'va|10', 'sale|15', 'ok|20', 'okey|20', 'okay|20', 'oki|20', 'bueno|15', 'buenisimo|25', 'me sirve|35', 'me ayudo|35', 'me ayudaste|40', 'eso queria saber|45'],
      a: '¡Con mucho gusto! Si quieres avanzar, puedes dejarme tus datos y te armo el mensaje para agendar una visita sin costo.',
      lead: true, chips: ['Quiero cotizar', '¿La visita tiene costo?'] },
    { id: 'despedida', pri: 12,
      k: ['adios|40', 'adio|40', 'bye|40', 'chao|40', 'chau|40', 'hasta luego|45', 'hasta pronto|45', 'hasta manana|45', 'nos vemos|45', 'nos vemos luego|50', 'nos vemos pronto|50', 'me despido|45', 'me voy|35', 'ya me voy|45', 'cuidate|40', 'que descanses|40', 'buen fin de semana|45', 'buena tarde|30', 'eso es todo|40', 'es todo|30', 'ya no necesito|40', 'no gracias|45', 'no por ahora|45', 'luego les escribo|55', 'luego te escribo|55', 'despues veo|40', 'lo pienso|40', 'lo voy a pensar|50', 'voy a pensarlo|50', 'lo consulto|40', 'lo checo|40', 'ahorita no|40'],
      a: '¡Gracias por pasar por aquí! Cuando quieras retomar tu proyecto, aquí estaré. Si prefieres, déjame tus datos o escríbenos por WhatsApp y te respondemos el mismo día hábil.',
      cta: true, chips: ['Quiero cotizar', '¿La visita tiene costo?'] },
    { id: 'afirmar', pri: 11,
      k: ['si|15', 'sip|15', 'sii|15', 'claro|20', 'claro que si|30', 'dale|20', 'simon|20', 'aja|15', 'por favor|15', 'si por favor|30', 'si quiero|30', 'si me interesa|40', 'me interesa|35', 'me late|30', 'si gracias|30', 'quiero|10', 'quisiera|10', 'adelante|20', 'hagale|25', 'andale|25', 'asi es|20', 'correcto|20', 'eso|8', 'exacto|20', 'afirmativo|20'],
      a: 'Perfecto. Déjame tu nombre y cómo contactarte, y el día y la hora que te acomodan, y te armo el mensaje listo para enviar por WhatsApp.',
      lead: true, chips: ['¿La visita tiene costo?', 'Quiero cotizar'] },
    { id: 'negar', pri: 11,
      k: ['no|12', 'nel|15', 'nop|15', 'nope|15', 'para nada|20', 'no quiero|30', 'no me interesa|40', 'no gracias|40', 'no creo|25', 'tampoco|20', 'nada|12'],
      a: 'Sin problema, aquí sigo por si surge otra duda. Si quieres, te cuento cuánto tarda una cocina o cómo es la visita sin costo.',
      chips: ['¿Cuánto tarda una cocina?', '¿La visita tiene costo?', 'Quiero cotizar'] },
    { id: 'fuera_tema', pri: 8,
      k: ['futbol|30', 'soccer|30', 'liga mx|35', 'rayados|35', 'tigres|35', 'partido|25', 'mundial|30', 'nfl|30', 'basquet|30', 'beisbol|30', 'politica|30', 'presidente|25', 'elecciones|30', 'gobierno|25', 'clima|30', 'va a llover|35', 'llueve|25', 'temperatura|25', 'chiste|30', 'cuentame un chiste|50', 'cuentame algo|35', 'cancion|30', 'musica|30', 'pelicula|30', 'serie|20', 'netflix|30', 'receta|35', 'recetas|35', 'que cocino|40', 'que como|35', 'horoscopo|35', 'signo|20', 'religion|30', 'dios|25', 'matematicas|30', 'tarea|30', 'ayudame con mi tarea|55', 'traduce|35', 'traducir|35', 'programar|35', 'codigo|30', 'python|30', 'capital de|40', 'quien gano|40', 'quien es el|25', 'que piensas|40', 'que opinas|40', 'que piensas del|50', 'opinion sobre|40', 'cuanto es 2|30', 'quien invento|40', 'que dia es hoy|40', 'que hora es|40', 'cuantos anos tienes|50', 'cuantos anos tienes|50', 'tienes novio|50', 'tienes novia|50', 'estas casada|50', 'te gusta|30', 'cual es tu color|45', 'cual es tu comida|45', 'tienes hijos|45', 'donde vives|45', 'eres feliz|45', 'novio|25', 'novia|25', 'amor|20', 'amigos|20', 'bitcoin|40', 'carro|20', 'auto|20', 'coche|20', 'vacaciones|25', 'viaje|25', 'trabajo|10', 'empleo|20', 'vacante|30', 'vacantes|30', 'bolsa de trabajo|45', 'busco trabajo|50', 'quiero trabajar|45'],
      a: 'Eso se me sale un poco de mi terreno 😊 Yo me dedico a cocinas integrales, baños y closets de Reforma Innovare. Si tienes un proyecto en mente, con gusto te oriento.',
      cta: true, chips: ['Quiero cotizar', '¿La visita tiene costo?', '¿Cuánto tarda una cocina?', 'Baños'] }
  ];

  var FALLBACK = {
    id: 'no_entendi',
    a: 'No te entendí del todo, perdona. Puedes elegir una de estas opciones, escribirnos por WhatsApp, usar el cotizador o dejarme tus datos para que el equipo te responda el mismo día hábil.',
    lead: true, cta: true,
    chips: ['Quiero cotizar', '¿La visita tiene costo?', '¿Cuánto tarda una cocina?', '¿En qué zonas trabajan?', 'Hablar con un asesor']
  };
  var LARGO = {
    id: 'largo',
    a: 'Gracias por contarme tanto, me ayuda a entender tu proyecto. Para darte una respuesta buena y no adivinar, el equipo lo revisa contigo en una visita sin costo, con medidas reales. ¿Qué es lo que más te urge resolver?',
    lead: true, cta: true,
    chips: ['¿La visita tiene costo?', 'Quiero cotizar', '¿Cuánto tarda una cocina?', 'Hablar con un asesor']
  };

  /* ---------- Compilación ---------- */
  var COMPILED = T.map(function (t, idx) {
    var ph = [];
    (t.k || []).forEach(function (raw) {
      var parts = String(raw).split('|');
      var p = norm(parts[0]);
      if (!p) return;
      var words = p.split(' ').length;
      ph.push({ p: ' ' + p + ' ', w: parts[1] ? parseFloat(parts[1]) : words * 10 });
    });
    var cs = (t.c || []).map(function (pair) {
      return pair.map(function (grp) { return grp.map(function (x) { return ' ' + norm(x) + ' '; }); });
    });
    return { t: t, ph: ph, cs: cs, idx: idx };
  });

  function has(txt, p) {
    return txt.indexOf(p) !== -1;
  }
  /* para raíces cortas dentro de una palabra (p. ej. 'gratuit', 'proteg') */
  function hasStem(txt, p) {
    var q = p.slice(0, -1);   /* quita el espacio final */
    return txt.indexOf(q) !== -1;
  }

  function score(c, txt) {
    var hits = [];
    c.ph.forEach(function (x) { if (has(txt, x.p)) hits.push(x); });
    var best = 0, rest = 0;
    hits.forEach(function (x) { if (x.w > best) best = x.w; });
    hits.forEach(function (x) { if (x.w < best || (x.w === best && best >= 0)) rest += x.w; });
    rest -= best;
    c.cs.forEach(function (pair) {
      var a = pair[0].some(function (p) { return has(txt, p) || hasStem(txt, p); });
      var b = pair[1].some(function (p) { return has(txt, p) || hasStem(txt, p); });
      if (a && b && 35 > best) best = 35;
    });
    return best ? best + Math.min(rest * 0.05, 4) + c.t.pri / 100 : 0;
  }

  /* temas «objeto»: cedan ante una intención clara (precio, tiempo, visita…) */
  var OBJETO = { cocina: 1, servicios: 1, bano: 1, closet: 1, pequeno: 1, alacena: 1, isla_barra: 1, puertas: 1, cubierta: 1, colores: 1, estilos: 1, herrajes: 1 };
  var SOCIAL = { saludo: 1, gracias: 1, despedida: 1, afirmar: 1, negar: 1, fuera_tema: 1 };

  /* ---------- API ---------- */
  function responder(text, ctx) {
    ctx = ctx || {};
    var raw = String(text == null ? '' : text).trim();
    var txt = padded(raw);
    var best = null, bestS = 0, second = 0;
    var scored = COMPILED.map(function (c) { return { c: c, s: score(c, txt) }; }).filter(function (x) { return x.s > 0; });
    var fuerte = scored.some(function (x) { return !OBJETO[x.c.t.id] && !SOCIAL[x.c.t.id] && x.s >= 25; });
    scored.forEach(function (x) {
      if (fuerte && OBJETO[x.c.t.id]) return;
      if (x.s > bestS) { second = bestS; bestS = x.s; best = x.c; }
      else if (x.s > second) second = x.s;
    });
    var chosen;
    if (best && bestS >= 10) chosen = best.t;
    else if (raw.length > 160) chosen = LARGO;
    else chosen = FALLBACK;

    /* un texto largo que apenas toca un tema débil: mejor orientar a visita */
    if (raw.length > 220 && best && bestS < 35 && chosen.id !== 'insulto') chosen = LARGO;

    return {
      tema: chosen.id,
      a: chosen.a,
      lead: !!chosen.lead,
      cta: !!chosen.cta,
      chips: (chosen.chips || CHIPS_BASE).slice(),
      score: Math.round(bestS * 10) / 10
    };
  }

  return {
    responder: responder,
    norm: norm,
    WA: WA,
    TEMAS: T.map(function (t) { return t.id; }).concat(['largo', 'no_entendi']),
    CHIPS_INICIO: ['Quiero cotizar', '¿La visita tiene costo?', '¿Cuánto tarda una cocina?', 'Baños', 'Closets y vestidores', 'Cubiertas: cuarzo, granito…', 'Ideas para espacios pequeños', '¿En qué zonas trabajan?'],
    CHIPS_MAS: ['Garantía', '¿Cómo es el proceso?', 'Herrajes y acabados', 'Estilos de cocina', 'Isla o barra', '¿Cuánto tarda un baño?', 'Mantenimiento', 'Hablar con un asesor']
  };
});
