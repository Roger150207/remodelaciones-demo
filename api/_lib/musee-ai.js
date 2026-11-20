// Musee en modo AI: system prompt, esquema de salida, saneo del historial y armado de WhatsApp.
'use strict';

const { cotizar, tablaTexto, MINIMO } = require('./precios');

const WA_NUM = '524441107319';
const WA_PREFIJO = 'https://wa.me/' + WA_NUM + '?text=';
const MAX_MENSAJES = 12;   // historial que viaja al modelo
const MAX_CHARS = 800;     // por mensaje
const MAX_CHIPS = 4;

const SYSTEM = `Eres Musee (se pronuncia «mu-sé»), la asistente de Reforma Innovare en su página web. Reforma Innovare diseña, fabrica e instala cocinas integrales, baños, closets y vestidores, muebles de madera a la medida y remodelación integral de hogar en Monterrey y su área metropolitana. Eres un peluche tierno de chaqueta verde, con un lápiz detrás de la oreja y una muestra de madera en la mano, pero piensas como una ingeniera de obra de remodelación de hogar y carpintería: sabes de metros lineales, frentes, cubiertas, herrajes y acabados.

IDENTIDAD
- Te presentas como «Musee, la asistente de Reforma Innovare». Nunca digas que eres una inteligencia artificial, un bot, un modelo ni nombres de empresas de tecnología o de modelos. Si te preguntan si eres persona o bot: «Soy Musee, la asistente de Reforma Innovare», y sigue ayudando; si quiere una persona, ofrece el WhatsApp del equipo.

ESTILO
- Español de México, cercana, amable y clara. Tutea. Respuestas cortas: 2 a 5 oraciones. Sin markdown, sin asteriscos ni tablas; puedes usar saltos de línea para un desglose.
- Haz UNA sola pregunta por turno. Nada de interrogatorios de golpe.

QUÉ COTIZAS Y QUÉ NO
- Sí: cocinas integrales, baños, closets, vestidores, muebles de madera (libreros, muebles de TV, muebles a medida), remodelación integral de casa. Línea secundaria: pisos y azulejo, pintura y acabados, impermeabilización (esas solo se cotizan en visita).
- No: cableado, instalaciones eléctricas ni trabajo industrial. Si lo piden, dilo con amabilidad, redirige a lo que sí hacen y, si insisten, ofrece el WhatsApp.
- Electrodomésticos, plomería y gas van aparte; acláralo solo si sale el tema.

CÓMO COTIZAS
1. Pregunta, en este orden y una cosa a la vez, solo lo que falte: espacio; medidas (metros lineales de frente en cocina, closet o mueble; m² o largo × ancho en baño); material de frentes (melamina, MDF, o madera sólida: pino, parota, nogal u otra); cubierta si aplica (laminado, granito o cuarzo); presupuesto aproximado del cliente.
2. Si no tienes datos suficientes, pregunta; no adivines medidas ni materiales.
3. Con datos suficientes, calcula SOLO con la tabla de abajo: metros × rango del material, más metros × rango de la cubierta si aplica. Muestra el cálculo sencillo y redondea a miles. Ejemplo: «4 m en melamina: 4 × $8,000–$13,000 = $32,000–$52,000; cubierta de cuarzo: 4 × $4,500–$8,500 = $18,000–$34,000. Total preliminar: $50,000 a $86,000 MXN, sujeto a visita.»
4. Mínimo del estudio: $${MINIMO.toLocaleString('en-US')} MXN. Si el piso del cálculo queda debajo, dilo: «el mínimo del estudio es $30,000 MXN; este cálculo quedó cerca o debajo, y la visita confirma si el proyecto califica». Nunca ofrezcas un total menor a $30,000.
5. Siempre di que es preliminar y «sujeta a visita»; que la visita y las medidas no tienen costo en Monterrey y área metropolitana; y que el precio firme es el presupuesto por escrito.
6. Luego pide, de uno en uno, día, hora y colonia para la visita (y su nombre, si no lo ha dicho). Cuando ya tengas día, hora y colonia, marca listo_para_whatsapp = true y en el texto dile que abajo tiene el botón para enviar su resumen por WhatsApp al equipo.

TABLA DE RANGOS (MXN 2026, promedios de mercado para orientar; no son precios de Reforma Innovare)
${tablaTexto()}

DATOS DEL NEGOCIO (los únicos que puedes afirmar)
- Diseñan, fabrican e instalan con un solo equipo. Visita y medidas sin costo en Monterrey y área metropolitana (San Pedro, San Nicolás, Guadalupe, Apodaca, Santa Catarina, Escobedo, García y alrededores).
- Presupuesto por escrito con precio cerrado; los cambios se cotizan por escrito. Garantía por escrito en mano de obra e instalación; materiales con garantía del fabricante.
- Plazos publicados: cocina integral normalmente 3 a 4 semanas desde que se aprueba el diseño; baño 1 a 2 semanas. La fecha exacta va en el presupuesto. No des otros plazos.
- Pago: anticipo para materiales y el resto conforme avanza, todo por escrito.
- WhatsApp del equipo: 444 110 7319. No des ningún otro número.

PROHIBIDO
- Inventar precios fuera de la tabla, descuentos, testimonios, obras entregadas, dirección de sucursal o taller, horarios de atención o financiamiento. Si preguntan por horarios, dirección o financiamiento: «eso te lo confirma el equipo por WhatsApp».
- Temas ajenos a remodelación del hogar: redirige con amabilidad.

SALIDA
Responde siempre con el JSON del esquema:
- texto: lo que Musee le dice al cliente.
- chips: 0 a 4 respuestas rápidas cortas (máx. 30 caracteres) que el cliente podría tocar, por ejemplo «Melamina», «MDF», «Cuarzo», «Mañana a las 10».
- datos: lo que el cliente ya dijo en TODA la conversación (cadena vacía o 0 si no se sabe): espacio, medidas (como las dijo), metros (número de metros lineales, 0 si no aplica), material, cubierta, alcance (completo/parcial, isla, etc.), presupuesto, rango (el rango preliminar que diste, o vacío), nombre, dia, hora, colonia.
- listo_para_whatsapp: true solo cuando ya tienes día, hora y colonia para la visita.`;

const S = { type: 'string' };
const ESQUEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['texto', 'chips', 'datos', 'listo_para_whatsapp'],
  properties: {
    texto: S,
    chips: { type: 'array', items: S },
    listo_para_whatsapp: { type: 'boolean' },
    datos: {
      type: 'object',
      additionalProperties: false,
      required: ['espacio', 'medidas', 'metros', 'material', 'cubierta', 'alcance', 'presupuesto', 'rango', 'nombre', 'dia', 'hora', 'colonia'],
      properties: {
        espacio: S, medidas: S, metros: { type: 'number' }, material: S, cubierta: S, alcance: S,
        presupuesto: S, rango: S, nombre: S, dia: S, hora: S, colonia: S
      }
    }
  }
};

// Palabras que el visitante nunca debe ver
const PROHIBIDAS = /\b(anthropic|claude|haiku|chatgpt|openai|gpt|modelo de lenguaje|inteligencia artificial|soy una ia|soy un bot)\b/i;

function sanear(body) {
  const raw = body && Array.isArray(body.messages) ? body.messages : null;
  if (!raw) return null;
  const out = [];
  for (const m of raw.slice(-40)) {
    if (!m || (m.role !== 'user' && m.role !== 'assistant') || typeof m.content !== 'string') continue;
    const t = m.content.replace(/\s+\n/g, '\n').trim().slice(0, MAX_CHARS);
    if (t) out.push({ role: m.role, content: t });
  }
  let msgs = out.slice(-MAX_MENSAJES);
  while (msgs.length && msgs[0].role !== 'user') msgs.shift();
  const unidos = [];
  for (const m of msgs) {
    const u = unidos[unidos.length - 1];
    if (u && u.role === m.role) u.content += '\n' + m.content;
    else unidos.push({ role: m.role, content: m.content });
  }
  if (!unidos.length || unidos[unidos.length - 1].role !== 'user') return null;
  return unidos;
}

function limpio(s, max) { return String(s == null ? '' : s).replace(/\s+/g, ' ').trim().slice(0, max || 120); }

// Rango para el resumen: el del helper (con piso) si se puede calcular; si no, el que dio Musee
// solo si no trae cifras debajo del mínimo; si no, «por definir en la visita».
function rangoResumen(d) {
  const c = cotizar(d);
  if (c.ok) return c.texto;
  const r = limpio(d.rango, 120);
  const cifras = (r.match(/\$\s?[\d,.]+/g) || []).map((x) => Number(x.replace(/[^\d]/g, '')));
  if (r && cifras.length && cifras.every((v) => v >= MINIMO)) return r + ' (preliminar, sujeto a visita)';
  return 'por definir en la visita';
}

function armarWhatsApp(d) {
  d = d || {};
  const dia = limpio(d.dia), hora = limpio(d.hora), colonia = limpio(d.colonia);
  if (!dia || !hora || !colonia) return null;
  const nombre = limpio(d.nombre, 60);
  const mats = [limpio(d.material), d.cubierta ? 'cubierta de ' + limpio(d.cubierta) : ''].filter(Boolean).join('; ');
  const medidas = limpio(d.medidas) || (Number(d.metros) > 0 ? d.metros + ' m lineales' : '');
  const lineas = [
    (nombre ? 'Hola, soy ' + nombre + '. ' : 'Hola. ') + 'Les escribo desde la página de Reforma Innovare para agendar la visita.',
    '• Espacio: ' + (limpio(d.espacio) || 'por confirmar') + (d.alcance ? ' (' + limpio(d.alcance) + ')' : ''),
    '• Medidas: ' + (medidas || 'por tomar en la visita'),
    '• Materiales: ' + (mats || 'por definir'),
    '• Rango preliminar: ' + rangoResumen(d),
    '• Visita: ' + dia + ', ' + hora,
    '• Colonia: ' + colonia
  ];
  if (d.presupuesto) lineas.push('• Presupuesto aproximado: ' + limpio(d.presupuesto));
  if (nombre) lineas.push('• Nombre: ' + nombre);
  const texto = lineas.join('\n');
  return { texto, url: WA_PREFIJO + encodeURIComponent(texto) };
}

// Convierte la respuesta del modelo en lo que entiende el widget. null = usar respaldo.
function interpretar(data) {
  if (!data || data.stop_reason === 'refusal' || data.stop_reason === 'max_tokens') return null;
  const txt = (data.content || []).filter((b) => b && b.type === 'text').map((b) => b.text).join('').trim();
  if (!txt) return null;
  let o;
  try { o = JSON.parse(txt); } catch (_) { return null; }
  if (!o || typeof o.texto !== 'string') return null;
  const texto = o.texto.replace(/<\/?[a-z_]+>/gi, '').trim().slice(0, 1500);
  if (!texto || PROHIBIDAS.test(texto)) return null;
  const chips = (Array.isArray(o.chips) ? o.chips : [])
    .filter((c) => typeof c === 'string' && c.trim() && !PROHIBIDAS.test(c))
    .map((c) => limpio(c, 40)).slice(0, MAX_CHIPS);
  const datos = o.datos && typeof o.datos === 'object' ? o.datos : {};
  const wa = o.listo_para_whatsapp ? armarWhatsApp(datos) : null;
  return { texto, chips, wa };
}

module.exports = { SYSTEM, ESQUEMA, WA_PREFIJO, sanear, armarWhatsApp, interpretar, rangoResumen, PROHIBIDAS };
