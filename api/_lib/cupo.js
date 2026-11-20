// Cupo diario de Musee en modo AI (control de gasto y abuso).
// Día = calendario de America/Mexico_City (se reinicia a medianoche de Monterrey).
// Persistencia sin base de datos: memoria del proceso + copia en /tmp. En Vercel cada
// instancia tiene su propio /tmp y se pierde en cold start; es un tope «mejor esfuerzo».
'use strict';

const fs = require('fs');
const crypto = require('crypto');

const LIMITES = { convPorIp: 20, msgsPorIp: 80, msgsGlobal: 200 };
const ZONA = 'America/Mexico_City';
const ARCHIVO = '/tmp/reforma-musee-cupo.json';

function hoy(fecha) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: ZONA }).format(fecha || new Date());
}
// La IP no se guarda en claro
function huella(ip) {
  return crypto.createHash('sha256').update('reforma-musee|' + String(ip || '')).digest('hex').slice(0, 16);
}

function crearCupo(opts) {
  opts = opts || {};
  const limites = Object.assign({}, LIMITES, opts.limites || {});
  const archivo = opts.archivo === undefined ? ARCHIVO : opts.archivo; // null = solo memoria
  const reloj = opts.reloj || (() => new Date());
  let estado = null;

  function vacio(dia) { return { dia, global: 0, ips: {} }; }
  function leer() {
    const dia = hoy(reloj());
    if (estado && estado.dia === dia) return estado;
    estado = vacio(dia);
    if (archivo) {
      try {
        const d = JSON.parse(fs.readFileSync(archivo, 'utf8'));
        if (d && d.dia === dia && typeof d.global === 'number' && d.ips) estado = d;
      } catch (_) { /* sin archivo todavía */ }
    }
    return estado;
  }
  function guardar() {
    if (!archivo) return;
    try { fs.writeFileSync(archivo, JSON.stringify(estado)); } catch (_) { /* /tmp no disponible: queda en memoria */ }
  }

  // Revisa y, si cabe, cuenta el mensaje. → { ok:true } | { ok:false, motivo }
  function consumir(ip, conv) {
    const e = leer();
    const id = huella(ip);
    const reg = e.ips[id] || { msgs: 0, convs: [] };
    const c = String(conv || 'sin-id').slice(0, 40);
    const nueva = reg.convs.indexOf(c) === -1;
    if (e.global >= limites.msgsGlobal) return { ok: false, motivo: 'global' };
    if (reg.msgs >= limites.msgsPorIp) return { ok: false, motivo: 'ip_mensajes' };
    if (nueva && reg.convs.length >= limites.convPorIp) return { ok: false, motivo: 'ip_conversaciones' };
    if (nueva) reg.convs.push(c);
    reg.msgs++;
    e.global++;
    e.ips[id] = reg;
    guardar();
    return { ok: true };
  }

  // Para pruebas: inyectar contadores
  function _fijar(parcial) { const e = leer(); Object.assign(e, parcial); guardar(); }
  function _estado() { return leer(); }

  return { consumir, limites, _fijar, _estado, huella };
}

module.exports = { crearCupo, LIMITES, ZONA, hoy, huella };
