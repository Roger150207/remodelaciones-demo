// Tope mensual de gasto de Musee en Haiku (USD). El tope duro es $3.
// Persiste el acumulado del mes (calendario America/Mexico_City) en Vercel Blob
// cuando el store está conectado (OIDC o BLOB_READ_WRITE_TOKEN). Si no hay store,
// usa memoria + /tmp (se puede perder en un cold start).
// Nunca imprime llaves ni tokens. Las cuentas van en nanos de dólar (1 USD = 1e9).
'use strict';

const fs = require('fs');

const TOPE_NANOS = 3 * 1e9;          // $3.00
const RESERVA_NANOS = 0.05 * 1e9;    // $0.05 de colchón por carreras entre instancias
const CORTE_NANOS = TOPE_NANOS - RESERVA_NANOS; // se deja de llamar al llegar a $2.95
const ZONA = 'America/Mexico_City';
const ARCHIVO = '/tmp/reforma-musee-gasto.json';
const BLOB_PATH = 'musee-gasto'; // musee-gasto/YYYY-MM.json

// Haiku 5.5, prompts ≤100K: $0.10 / MTok in, $0.50 / MTok out, cache read 10%, cache write 1.25×.
const NANO_IN = 100;
const NANO_OUT = 500;
const NANO_CACHE_READ = 10;
const NANO_CACHE_WRITE = 125;
// Si la API no trae usage, cobramos de más a propósito para no quedarnos cortos.
const ESTIMACION_NANOS = 0.005 * 1e9; // $0.005

function mesDe(fecha) {
  const p = new Intl.DateTimeFormat('en-CA', { timeZone: ZONA, year: 'numeric', month: '2-digit' }).formatToParts(fecha || new Date());
  const y = p.find((x) => x.type === 'year').value;
  const m = p.find((x) => x.type === 'month').value;
  return y + '-' + m;
}
function num(n) {
  n = Number(n);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 0;
}
function costoNanos(usage) {
  if (!usage || typeof usage !== 'object') return ESTIMACION_NANOS;
  const cwObj = usage.cache_creation && typeof usage.cache_creation === 'object' ? usage.cache_creation : {};
  const inT = num(usage.input_tokens);
  const outT = num(usage.output_tokens);
  const cr = num(usage.cache_read_input_tokens);
  const cw = num(usage.cache_creation_input_tokens) + num(cwObj.ephemeral_5m_input_tokens) + num(cwObj.ephemeral_1h_input_tokens);
  const n = inT * NANO_IN + outT * NANO_OUT + cr * NANO_CACHE_READ + cw * NANO_CACHE_WRITE;
  return n > 0 ? n : ESTIMACION_NANOS;
}

function crearGasto(opts) {
  opts = opts || {};
  const archivo = opts.archivo === undefined ? ARCHIVO : opts.archivo; // null = solo memoria
  const reloj = opts.reloj || (() => new Date());
  const tope = opts.topeNanos || TOPE_NANOS;
  const corte = opts.corteNanos || (tope - RESERVA_NANOS);
  const blobPut = opts.blobPut; // async (mes, estado) => void
  const blobGet = opts.blobGet; // async (mes) => estado|null
  const env = opts.env || process.env;
  let estado = null;
  let cargando = null;

  function vacio(mes) { return { mes, nanos: 0, llamadas: 0 }; }

  async function blobNativo() {
    if (blobGet || blobPut) return { get: blobGet, put: blobPut };
    if (!env.BLOB_READ_WRITE_TOKEN && !env.VERCEL_OIDC_TOKEN && !env.VERCEL) return null;
    try {
      const blob = require('@vercel/blob');
      return {
        get: async (mes) => {
          try {
            const r = await blob.get(BLOB_PATH + '/' + mes + '.json', { access: 'private' });
            if (!r) return null;
            const txt = typeof r === 'string' ? r
              : (r && typeof r.text === 'function' ? await r.text()
                : (r && r.stream ? await new Response(r.stream).text() : JSON.stringify(r)));
            const d = typeof txt === 'string' ? JSON.parse(txt) : txt;
            if (d && d.mes === mes && typeof d.nanos === 'number') return d;
          } catch (_) { /* no existe todavía */ }
          return null;
        },
        put: async (mes, st) => {
          await blob.put(BLOB_PATH + '/' + mes + '.json', JSON.stringify(st), {
            access: 'private',
            addRandomSuffix: false,
            allowOverwrite: true,
            cacheControlMaxAge: 0,
            contentType: 'application/json'
          });
        }
      };
    } catch (_) { return null; }
  }

  async function cargar() {
    const mes = mesDe(reloj());
    if (estado && estado.mes === mes) return estado;
    estado = vacio(mes);
    if (archivo) {
      try {
        const d = JSON.parse(fs.readFileSync(archivo, 'utf8'));
        if (d && d.mes === mes && typeof d.nanos === 'number') estado = { mes, nanos: d.nanos, llamadas: d.llamadas || 0 };
      } catch (_) { /* sin archivo */ }
    }
    const b = await blobNativo();
    if (b && b.get) {
      const remoto = await b.get(mes);
      if (remoto && remoto.nanos > estado.nanos) estado = { mes, nanos: remoto.nanos, llamadas: remoto.llamadas || 0 };
    }
    return estado;
  }

  function guardarLocal() {
    if (!archivo) return;
    try { fs.writeFileSync(archivo, JSON.stringify(estado)); } catch (_) { /* /tmp no disponible */ }
  }

  async function persistir() {
    guardarLocal();
    const b = await blobNativo();
    if (b && b.put) {
      try { await b.put(estado.mes, estado); } catch (_) { /* el /tmp queda como respaldo */ }
    }
  }

  async function asegurar() {
    if (cargando) await cargando;
    cargando = cargar();
    try { return await cargando; } finally { cargando = null; }
  }

  // ¿Hay margen para una llamada más? No cuenta todavía.
  async function puede() {
    const e = await asegurar();
    if (e.nanos >= corte) return { ok: false, motivo: 'cupo_mes', usd: +(e.nanos / 1e9).toFixed(4) };
    return { ok: true, usd: +(e.nanos / 1e9).toFixed(4) };
  }

  async function registrar(usage) {
    const e = await asegurar();
    e.nanos += costoNanos(usage);
    e.llamadas = (e.llamadas || 0) + 1;
    await persistir();
    return { nanos: e.nanos, usd: +(e.nanos / 1e9).toFixed(4) };
  }

  function _fijar(parcial) {
    const mes = mesDe(reloj());
    estado = Object.assign(vacio(mes), estado && estado.mes === mes ? estado : {}, parcial, { mes });
    guardarLocal();
  }
  function _estado() { return estado || vacio(mesDe(reloj())); }

  return { puede, registrar, costoNanos, _fijar, _estado, tope: tope, corte };
}

module.exports = {
  crearGasto, costoNanos, mesDe, TOPE_NANOS, CORTE_NANOS, RESERVA_NANOS,
  ESTIMACION_NANOS, ZONA
};
