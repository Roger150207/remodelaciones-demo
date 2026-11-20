// Rangos preliminares de Musee (MXN, Monterrey 2026). Fuente: PRECIOS.md del 20 nov 2026.
// Son promedios de mercado para orientar, no precios firmes. Todo es «sujeto a visita».
'use strict';

const MINIMO = 30000;

// Cocinas integrales: por metro lineal de frente (diseño + fabricación + instalación de muebles)
const COCINA = {
  melamina: [8000, 13000, 'Melamina'],
  mdf: [12000, 20000, 'MDF laqueado'],
  pino: [13000, 18000, 'Madera sólida de pino'],
  parota: [15000, 22000, 'Madera sólida de parota'],
  nogal: [15000, 22000, 'Madera sólida de nogal'],
  madera: [15000, 22000, 'Madera sólida (otra especie fina)']
};
// Cubiertas: por metro lineal, se suman al mueble
const CUBIERTA = {
  laminado: [1500, 3500, 'Laminado / formica'],
  granito: [3500, 7000, 'Granito'],
  cuarzo: [4500, 8500, 'Cuarzo']
};
// Closets: por metro lineal
const CLOSET = {
  melamina: [6000, 10000, 'Closet en melamina'],
  mdf: [8000, 15000, 'Closet en MDF enchapado o laqueado']
};
const POR_ML = {
  mueble_bano: [4500, 8000, 'Mueble de baño'],
  librero: [4000, 7500, 'Librero o mueble de TV en melamina']
};
const PROYECTO = {
  vestidor: [35000, 65000, 'Vestidor de recámara principal'],
  bano: [40000, 80000, 'Baño completo de tamaño habitual (4 a 8 m²)'],
  walkin: [70000, null, 'Walk-in amplio (desde)']
};
const NO_COTIZA = /cablead|electric|industrial|nave|fabrica|bodega industrial|instalacion electrica/;

function n(s) {
  return String(s == null ? '' : s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim();
}
function mxn(v) { return '$' + Math.round(v).toLocaleString('en-US'); }
function miles(v) { return Math.round(v / 1000) * 1000; }

function materialDe(s) {
  s = n(s);
  if (!s) return '';
  if (/melamina|formica/.test(s)) return 'melamina';
  if (/mdf|laca|laque/.test(s)) return 'mdf';
  if (/pino/.test(s)) return 'pino';
  if (/parota/.test(s)) return 'parota';
  if (/nogal/.test(s)) return 'nogal';
  if (/madera|encino|cedro|roble|caoba|solida/.test(s)) return 'madera';
  return '';
}
function cubiertaDe(s) {
  s = n(s);
  if (!s || /ningun|sin cubierta|no aplica|^no$/.test(s)) return '';
  if (/cuarzo|silestone|caesar/.test(s)) return 'cuarzo';
  if (/granito/.test(s)) return 'granito';
  if (/lamin|formica/.test(s)) return 'laminado';
  return '';
}
function espacioDe(s) {
  s = n(s);
  if (!s) return '';
  if (NO_COTIZA.test(s)) return 'no_cotiza';
  if (/walk/.test(s)) return 'walkin';
  if (/vestidor/.test(s)) return 'vestidor';
  if (/closet|clozet|ropero/.test(s)) return 'closet';
  if (/mueble.*bano|vanity|lavabo/.test(s)) return 'mueble_bano';
  if (/bano|regadera/.test(s)) return 'bano';
  if (/cocina/.test(s)) return 'cocina';
  if (/librero|mueble de tv|tv|repisa/.test(s)) return 'librero';
  if (/integral|toda la casa|casa completa|varios/.test(s)) return 'integral';
  if (/mueble|madera|carpinter/.test(s)) return 'mueble';
  return '';
}

/**
 * Cotización preliminar con la tabla. Nunca devuelve un rango por debajo del mínimo del estudio.
 * datos: { espacio, metros, material, cubierta, alcance }
 * → { ok:true, min, max, desglose:[...], bajoMinimo, texto }  o  { ok:false, motivo, texto }
 */
function cotizar(datos) {
  datos = datos || {};
  const esp = espacioDe(datos.espacio);
  const ml = Number(datos.metros) > 0 && Number(datos.metros) < 60 ? Number(datos.metros) : 0;
  const mat = materialDe(datos.material);
  const cub = cubiertaDe(datos.cubierta);
  const alcance = n(datos.alcance);

  if (esp === 'no_cotiza' || NO_COTIZA.test(n(datos.alcance))) {
    return { ok: false, motivo: 'no_cotizamos', texto: 'Cableado y trabajo industrial no los cotizamos; nos enfocamos en cocinas, baños, closets, vestidores, muebles de madera y remodelación de hogar.' };
  }
  if (!esp) return { ok: false, motivo: 'faltan_datos', texto: 'Falta saber qué espacio es.' };
  if (esp === 'integral' || esp === 'mueble') {
    return { ok: false, motivo: 'confirmar_en_visita', texto: 'Este tipo de proyecto se cotiza con medidas en la visita, sin costo en Monterrey y área metropolitana.' };
  }

  let min = 0, max = 0;
  const desglose = [];
  if (esp === 'cocina') {
    if (!ml || !mat) return { ok: false, motivo: 'faltan_datos', texto: 'Faltan los metros lineales y el material de los frentes.' };
    const r = COCINA[mat];
    min += ml * r[0]; max += ml * r[1];
    desglose.push(`${ml} m × ${mxn(r[0])}–${mxn(r[1])} (${r[2]})`);
    if (cub) {
      const c = CUBIERTA[cub];
      min += ml * c[0]; max += ml * c[1];
      desglose.push(`${ml} m × ${mxn(c[0])}–${mxn(c[1])} (cubierta de ${c[2].toLowerCase()})`);
    }
  } else if (esp === 'closet') {
    if (!ml) return { ok: false, motivo: 'faltan_datos', texto: 'Faltan los metros lineales del closet.' };
    const key = mat === 'melamina' || !mat ? 'melamina' : (mat === 'mdf' ? 'mdf' : '');
    if (!key) return { ok: false, motivo: 'confirmar_en_visita', texto: 'Un closet en madera sólida se cotiza en la visita.' };
    const r = CLOSET[key];
    min = ml * r[0]; max = ml * r[1];
    desglose.push(`${ml} m × ${mxn(r[0])}–${mxn(r[1])} (${r[2]})`);
  } else if (esp === 'mueble_bano' || esp === 'librero') {
    if (!ml) return { ok: false, motivo: 'faltan_datos', texto: 'Faltan los metros lineales del mueble.' };
    const r = POR_ML[esp];
    min = ml * r[0]; max = ml * r[1];
    desglose.push(`${ml} m × ${mxn(r[0])}–${mxn(r[1])} (${r[2]})`);
  } else if (esp === 'bano') {
    if (/parcial|solo|chico|pequen|actualiz/.test(alcance)) {
      return { ok: false, motivo: 'confirmar_en_visita', bajoMinimo: true, texto: `Una actualización parcial puede quedar debajo del mínimo del estudio (${mxn(MINIMO)} MXN); la visita confirma si el proyecto califica.` };
    }
    const r = PROYECTO.bano; min = r[0]; max = r[1]; desglose.push(r[2]);
  } else {
    const r = PROYECTO[esp]; min = r[0]; max = r[1]; desglose.push(r[2]);
  }

  min = miles(min);
  max = max == null ? null : miles(max);
  const bajoMinimo = min < MINIMO;
  if (bajoMinimo) { min = MINIMO; if (max != null && max < MINIMO) max = MINIMO; }
  const rango = max == null ? `desde ${mxn(min)} MXN` : (max === min ? `${mxn(min)} MXN` : `${mxn(min)} a ${mxn(max)} MXN`);
  const texto = rango + ' preliminar, sujeto a visita' +
    (bajoMinimo ? ` (el cálculo quedó cerca o debajo del mínimo del estudio de ${mxn(MINIMO)} MXN; la visita confirma si califica)` : '');
  return { ok: true, espacio: esp, min, max, desglose, bajoMinimo, rango, texto };
}

function fila(r) { return `${mxn(r[0])} – ${r[1] == null ? 'en adelante' : mxn(r[1])}`; }

// Tabla en texto para el system prompt (una sola fuente de verdad)
function tablaTexto() {
  const L = [];
  L.push('COCINAS INTEGRALES (diseño + fabricación + instalación de muebles), por metro lineal de frente:');
  for (const k of ['melamina', 'mdf', 'pino', 'parota']) {
    const r = COCINA[k];
    L.push(`- ${k === 'parota' ? 'Madera sólida, parota o nogal' : r[2]}: ${fila(r)} por ml`);
  }
  L.push('- Isla o barra: sumar sus metros lineales; si no hay medidas, se cotiza en la visita.');
  L.push('- Anclas de referencia (con cautela): cocina compacta 3–4 ml en melamina con cuarzo nacional desde ~$45,000; estándar 5–7 ml ~$90,000; con isla y cuarzo importado ~$185,000.');
  L.push('CUBIERTAS (se suman), por metro lineal:');
  for (const k of ['laminado', 'granito', 'cuarzo']) L.push(`- ${CUBIERTA[k][2]}: ${fila(CUBIERTA[k])} por ml`);
  L.push('- Showrooms locales de marca premium pueden subir mucho el ml; se confirma en visita. Electrodomésticos no incluidos.');
  L.push('CLOSETS Y VESTIDORES:');
  L.push(`- Closet en melamina: ${fila(CLOSET.melamina)} por ml (un closet básico de ~2 m: $18,000 – $30,000)`);
  L.push(`- Closet en MDF enchapado o laqueado: ${fila(CLOSET.mdf)} por ml`);
  L.push(`- Vestidor de recámara principal (organizadores, a menudo LED): ${fila(PROYECTO.vestidor)} el proyecto típico`);
  L.push('- Walk-in amplio: desde $70,000, se confirma en visita (no des techo sin medidas)');
  L.push('BAÑOS (remodelación):');
  L.push(`- Baño completo de tamaño habitual (4 a 8 m²): ${fila(PROYECTO.bano)} el proyecto; con acabados premium puede subir, se confirma en visita`);
  L.push('- Baño chico o actualización parcial: puede quedar debajo del mínimo; di que el mínimo del estudio es $30,000 y que la visita confirma si califica');
  L.push(`- Mueble de baño solo: ${fila(POR_ML.mueble_bano)} por ml (aplica el mínimo de $30,000 si es el único trabajo)`);
  L.push('CARPINTERÍA Y MUEBLES DE MADERA:');
  L.push(`- Librero o mueble de TV en melamina: ${fila(POR_ML.librero)} por ml`);
  L.push('- Mueble a medida en MDF o madera: pide medidas y uso; usa los rangos por ml de closet o cocina según complejidad; sin medidas no des total, agenda visita');
  L.push('REMODELACIÓN INTEGRAL: no des un total cerrado; pregunta qué espacios entran, reúne medidas y presupuesto, y pasa a agendar la visita.');
  return L.join('\n');
}

module.exports = { MINIMO, COCINA, CUBIERTA, CLOSET, POR_ML, PROYECTO, cotizar, tablaTexto, espacioDe, materialDe, cubiertaDe, mxn };
