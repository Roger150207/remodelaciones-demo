// POST /api/chat · Musee en modo AI (cotización preliminar y agenda de visita).
// La llave sale EXCLUSIVAMENTE de REFORMA_ANTHROPIC_API_KEY; no hay otra fuente ni respaldo de llave.
// Sin llave, sin cupo o ante cualquier falla responde ok:false y el widget usa las respuestas fijas
// (assets/js/musee-respuestas.js). Los respaldos van con HTTP 200 + ok:false para no ensuciar la
// consola del visitante; el widget también entiende 429/503/red caída. La llave nunca se imprime.
'use strict';

const { SYSTEM, ESQUEMA, sanear, interpretar } = require('./_lib/musee-ai');
const { crearCupo } = require('./_lib/cupo');

const MODELO = 'claude-haiku-5-5';
const MAX_TOKENS = 700;
const TIMEOUT_MS = 9000;
const API_URL = 'https://api.anthropic.com/v1/messages';
const AVISO_CUPO = 'Hoy tuve muchas consultas; te puedo orientar con lo esencial o te armo el WhatsApp.';

function responder(res, status, payload) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify(payload));
}
function respaldo(res, status, motivo, extra) {
  return responder(res, status, Object.assign({ ok: false, fallback: true, motivo }, extra || {}));
}

function ipDe(req) {
  const h = req.headers || {};
  const xf = h['x-forwarded-for'];
  const first = (Array.isArray(xf) ? xf[0] : xf || '').split(',')[0].trim();
  return first || h['x-real-ip'] || (req.socket && req.socket.remoteAddress) || 'desconocida';
}

async function leerCuerpo(req) {
  let b = req.body;
  if (b === undefined && typeof req.on === 'function') {
    b = await new Promise((ok) => {
      let s = '';
      req.on('data', (c) => { s += c; if (s.length > 64000) { s = ''; req.destroy && req.destroy(); } });
      req.on('end', () => ok(s));
      req.on('error', () => ok(''));
    });
  }
  if (Buffer.isBuffer(b)) b = b.toString('utf8');
  if (typeof b === 'string') { try { b = JSON.parse(b); } catch (_) { b = null; } }
  return b && typeof b === 'object' ? b : null;
}

function crearHandler(deps) {
  deps = deps || {};
  const env = deps.env || process.env;
  const fetchFn = deps.fetch || ((...a) => fetch(...a));
  const cupo = deps.cupo || crearCupo();
  const log = deps.log || ((...a) => console.error(...a));
  const timeoutMs = deps.timeoutMs || TIMEOUT_MS;

  return async function handler(req, res) {
    if (req.method !== 'POST') {
      res.setHeader('Allow', 'POST');
      return respaldo(res, 405, 'metodo');
    }
    try {
      const body = await leerCuerpo(req);
      const messages = sanear(body);
      if (!messages) return respaldo(res, 400, 'entrada');

      const llave = env.REFORMA_ANTHROPIC_API_KEY;
      if (!llave || typeof llave !== 'string' || !llave.trim()) return respaldo(res, 200, 'sin_llave');

      const c = cupo.consumir(ipDe(req), body.conv);
      if (!c.ok) return respaldo(res, 200, 'cupo', { aviso: AVISO_CUPO });

      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), timeoutMs);
      let r;
      try {
        r = await fetchFn(API_URL, {
          method: 'POST',
          signal: ctrl.signal,
          headers: {
            'content-type': 'application/json',
            'x-api-key': llave.trim(),
            'anthropic-version': '2026-10-21'
          },
          body: JSON.stringify({
            model: MODELO,
            max_tokens: MAX_TOKENS,
            thinking: { type: 'disabled' },
            output_config: { effort: 'low', format: { type: 'json_schema', schema: ESQUEMA } },
            system: SYSTEM,
            messages
          })
        });
      } finally { clearTimeout(timer); }

      if (!r || !r.ok) {
        log('musee-ai: la API respondió', r ? r.status : 'sin respuesta');
        return respaldo(res, 200, 'error');
      }
      const salida = interpretar(await r.json());
      if (!salida) {
        log('musee-ai: respuesta no utilizable');
        return respaldo(res, 200, 'error');
      }
      return responder(res, 200, { ok: true, modo: 'ai', texto: salida.texto, chips: salida.chips, wa: salida.wa });
    } catch (e) {
      log('musee-ai: error', e && e.name === 'AbortError' ? 'timeout' : (e && e.name) || 'desconocido');
      return respaldo(res, 200, 'error');
    }
  };
}

module.exports = crearHandler();
module.exports.crearHandler = crearHandler;
module.exports.MODELO = MODELO;
module.exports.AVISO_CUPO = AVISO_CUPO;
