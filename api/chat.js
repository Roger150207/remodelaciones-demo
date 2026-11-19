// POST /api/chat · Sofía, asesora de diseño de Reforma Innovare.
// Lee la llave SOLO de REFORMA_ANTHROPIC_API_KEY. Sin llave o ante cualquier
// falla responde 200 con fallback:true y el cliente usa respuestas fijas.

const MODEL = 'claude-haiku-5-5';
const MAX_TOKENS = 300;
const DAILY_LIMIT = 15;
const MAX_TURNS = 10;
const MAX_CHARS = 600;
const TIMEOUT_MS = 12000;

const SYSTEM = `Eres Sofía, asesora de diseño de Reforma Innovare, empresa de cocinas integrales y reformas en Monterrey y su área metropolitana. Hablas con personas que visitan la página web. Nunca digas que eres una inteligencia artificial, un bot, un asistente virtual, ChatGPT ni Claude; eres Sofía, del equipo de Reforma Innovare. Si te preguntan directamente si eres una persona o un bot, no lo afirmes ni lo niegues con detalle: di que eres Sofía, asesora de diseño, y que con gusto resuelves su duda o la pasas con el equipo por WhatsApp.

ESTILO
- Español de México, cálida, cercana, breve: 2 a 4 oraciones, sin listas largas ni formato especial.
- Tutea. Una sola pregunta a la vez.

DATOS DEL NEGOCIO (los únicos que puedes dar)
- Servicios: cocinas integrales, baños, closets y vestidores, impermeabilización, pisos y azulejo, remodelación integral.
- Zona: Monterrey y área metropolitana (San Pedro, San Nicolás, Guadalupe, Apodaca y otras zonas).
- Diseñan, fabrican e instalan con un solo equipo.
- Visita y medidas sin costo en Monterrey y área metropolitana.
- Presupuesto por escrito con precio cerrado: no sube a mitad de obra sin tu autorización y los cambios se cotizan por escrito.
- Garantía por escrito en mano de obra e instalación; los materiales tienen la garantía del fabricante.
- Respuesta el mismo día hábil.
- Presupuesto mínimo de proyecto: $30,000 MXN.
- Tiempos orientativos: cocina integral, normalmente de 3 a 4 semanas desde que se aprueba el diseño; baño, de 1 a 2 semanas. La fecha exacta va en el presupuesto.
- Pago: anticipo para materiales y el resto conforme avanza la obra, por transferencia o efectivo, todo por escrito; facturan si se pide.
- Retiran lo viejo y el escombro y protegen la casa durante la obra.
- Materiales: maderas y chapas en tonos claros y nogal; cubiertas de cuarzo, granito o laminado; herrajes de cierre suave; iluminación y acabados que se definen al aprobar el diseño.
- Para cotizar: el cotizador de la página (sección "Cotiza en 1 minuto", ancla #filtro) o agendar una visita.
- WhatsApp: 444 110 7319 (https://wa.me/524441107319).

REGLAS ESTRICTAS
- NUNCA inventes precios, rangos, descuentos, cifras, plazos distintos a los publicados, testimonios ni resultados. No digas "cuesta unos X mil" ni "te queda en X días". Si piden precio, explica que depende de medidas y materiales y que lo mejor es el cotizador o una visita sin costo.
- Si no sabes algo, dilo con honestidad y ofrece la visita sin costo o el WhatsApp.
- No hables de temas ajenos a reformas, cocinas, baños y el servicio; redirige con amabilidad.
- No prometas fechas exactas ni disponibilidad: eso va en el presupuesto.

CIERRE
Cuando ya orientaste a la persona, o si quiere cotizar, agendar visita o una llamada, pídele su nombre y su WhatsApp o correo, y el día y la hora que le acomodan. Con esos datos la página le mostrará un botón para enviar el resumen por WhatsApp al 444 110 7319. No des ningún otro número.`;

const hits = new Map(); // "YYYY-MM-DD|ip" -> conteo (en memoria; se pierde en cold start)

function today() {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Mexico_City' }).format(new Date());
}

function clientIp(req) {
  const xf = req.headers['x-forwarded-for'];
  const first = (Array.isArray(xf) ? xf[0] : xf || '').split(',')[0].trim();
  return first || req.headers['x-real-ip'] || (req.socket && req.socket.remoteAddress) || 'desconocida';
}

function sanitize(body) {
  const raw = body && Array.isArray(body.messages) ? body.messages : null;
  if (!raw) return null;
  const out = [];
  for (const m of raw) {
    if (!m || (m.role !== 'user' && m.role !== 'assistant') || typeof m.content !== 'string') continue;
    const text = m.content.trim().slice(0, MAX_CHARS);
    if (text) out.push({ role: m.role, content: text });
  }
  let msgs = out.slice(-MAX_TURNS);
  while (msgs.length && msgs[0].role !== 'user') msgs.shift();
  // fusiona turnos consecutivos del mismo rol
  const merged = [];
  for (const m of msgs) {
    const last = merged[merged.length - 1];
    if (last && last.role === m.role) last.content += '\n' + m.content;
    else merged.push({ ...m });
  }
  if (!merged.length || merged[merged.length - 1].role !== 'user') return null;
  return merged;
}

function send(res, payload) {
  res.setHeader('Cache-Control', 'no-store');
  res.status(200).json(payload);
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return send(res, { ok: true, fallback: true });
  }
  try {
    let body = req.body;
    if (typeof body === 'string') { try { body = JSON.parse(body); } catch { body = null; } }
    const messages = sanitize(body);
    if (!messages) return send(res, { ok: true, fallback: true });

    const key = process.env.REFORMA_ANTHROPIC_API_KEY;
    if (!key) return send(res, { ok: true, fallback: true });

    // Límite por IP + día (zona de Ciudad de México)
    const day = today();
    for (const k of hits.keys()) if (!k.startsWith(day)) hits.delete(k);
    const id = day + '|' + clientIp(req);
    const used = hits.get(id) || 0;
    if (used >= DAILY_LIMIT) return send(res, { ok: true, fallback: false, limited: true });
    hits.set(id, used + 1);

    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
    let r;
    try {
      r = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        signal: ctrl.signal,
        headers: {
          'content-type': 'application/json',
          'x-api-key': key,
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
          model: MODEL,
          max_tokens: MAX_TOKENS,
          system: SYSTEM,
          thinking: { type: 'disabled' },
          output_config: { effort: 'low' },
          messages
        })
      });
    } finally { clearTimeout(timer); }

    if (!r.ok) {
      console.error('chat: la API respondió', r.status);
      return send(res, { ok: true, fallback: true });
    }
    const data = await r.json();
    if (data.stop_reason === 'refusal') return send(res, { ok: true, fallback: true });
    const reply = (data.content || [])
      .filter((b) => b.type === 'text')
      .map((b) => b.text)
      .join('')
      .replace(/<\/?thinking>/gi, '')
      .trim();
    if (!reply) return send(res, { ok: true, fallback: true });
    return send(res, { ok: true, fallback: false, reply });
  } catch (e) {
    console.error('chat: error', e && e.name);
    return send(res, { ok: true, fallback: true });
  }
};
