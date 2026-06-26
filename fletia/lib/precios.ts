// ─── Precios de gasoil — fuente viva + ajuste regional ─────────────────────────
//
// HISTORIA (importante): la fuente original era el dataset oficial de la Secretaría
// de Energía ("Precios en surtidor"). En jun-2026 quedó INSERVIBLE:
//   • el recurso "Precios vigentes" pasó a datastore_active=false → la API da 404.
//   • el recurso "Precios históricos" quedó congelado (último dato ~jul-2025), o sea
//     ~40% por debajo del precio real → no sirve para el precio de hoy.
// Resultado: la app caía siempre al fallback hardcodeado y mostraba ~$100 de menos.
//
// FUENTE ACTUAL: surtidores.com.ar/precios/ publica una tabla mensual NACIONAL por
// tipo de combustible (Súper / Premium / Gasoil / Euro), actualizada al mes en curso.
// De ahí sacamos el precio NACIONAL vigente de Gasoil común ("Gasoil") y premium
// ("Euro").  Como es un único valor nacional, le aplicamos:
//   1) un delta chico por bandera (YPF/Shell/Axion/Puma) para las tarjetas de la UI, y
//   2) un FACTOR REGIONAL por provincia (el NOA es ~9% más caro que el promedio país;
//      validado: nacional jun-2026 $2115 × 1.09 ≈ $2305 = precio real Tucumán).
//
// `mediana` y `medianaVigente` se conservan (utilidades puras testeadas) aunque la
// estrategia de mediana sobre el dataset oficial ya no se use.

import type { SupabaseClient } from '@supabase/supabase-js';

const SURTIDORES_URL = 'https://surtidores.com.ar/precios/';
const MESES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

// Rango sanity-check para un precio de gasoil en AR$/litro (descarta datos corruptos)
const PRECIO_MIN = 300;
const PRECIO_MAX = 100000;

export interface PrecioCombustible {
  empresa: string;
  tipo: string;     // 'Gasoil Común' | 'Gasoil Premium'
  precio: number;   // AR$/litro (ya con ajuste regional)
  fecha: string;    // YYYY-MM-DD
}

export type FuentePrecios = 'oficial' | 'cache' | 'referencia';

// ─── Banderas: delta aditivo respecto del precio nacional base (≈ YPF) ─────────
// La fuente da un solo número nacional; estos deltas reparten las 4 banderas con
// spreads realistas (tomados de precios de lista típicos). YPF = base (delta 0).
const DELTA_MARCA: Record<string, { comun: number; premium: number }> = {
  'YPF':   { comun: 0,  premium: 0   },
  'Shell': { comun: 0,  premium: 125 },
  'Axion': { comun: 70, premium: 115 },
  'Puma':  { comun: 0,  premium: 90  },
};
const ORDEN_MARCAS = ['YPF', 'Shell', 'Axion', 'Puma'];

// ─── Factor regional por provincia ────────────────────────────────────────────
// El precio de surtidor varía por región (logística, distancia a refinerías/puertos,
// combustible patagónico, etc.). NOA validado con dato oficial (~+9%). Las demás son
// estimaciones conservadoras y se pueden afinar. CENTRO/Pampeana = referencia (1.0).
export const REGIONES: Record<string, number> = {
  NOA: 1.09,        // Tucumán, Salta, Jujuy, Catamarca, Sgo. del Estero (validado)
  NEA: 1.07,        // Chaco, Corrientes, Misiones, Formosa
  CUYO: 1.04,       // Mendoza, San Juan, San Luis
  PATAGONIA: 1.06,  // Neuquén, Río Negro, Chubut, Santa Cruz, T. del Fuego, La Pampa
  CENTRO: 1.0,      // CABA, Bs As, Córdoba, Santa Fe, Entre Ríos (referencia)
};

// Provincia (normalizada) → región. La default es CENTRO (factor 1.0).
const PROVINCIA_REGION: Record<string, keyof typeof REGIONES> = {
  TUCUMAN: 'NOA', SALTA: 'NOA', JUJUY: 'NOA', CATAMARCA: 'NOA', 'SANTIAGO DEL ESTERO': 'NOA',
  CHACO: 'NEA', CORRIENTES: 'NEA', MISIONES: 'NEA', FORMOSA: 'NEA',
  MENDOZA: 'CUYO', 'SAN JUAN': 'CUYO', 'SAN LUIS': 'CUYO',
  NEUQUEN: 'PATAGONIA', 'RIO NEGRO': 'PATAGONIA', CHUBUT: 'PATAGONIA',
  'SANTA CRUZ': 'PATAGONIA', 'TIERRA DEL FUEGO': 'PATAGONIA', 'LA PAMPA': 'PATAGONIA',
  CABA: 'CENTRO', 'CIUDAD AUTONOMA DE BUENOS AIRES': 'CENTRO', 'BUENOS AIRES': 'CENTRO',
  CORDOBA: 'CENTRO', 'SANTA FE': 'CENTRO', 'ENTRE RIOS': 'CENTRO',
};

// Provincia por defecto cuando la cuenta no la tiene seteada (base de clientes = NOA).
export const PROVINCIA_DEFAULT = 'Tucumán';

// Lista de provincias para el selector de la UI (orden alfabético).
export const PROVINCIAS_AR = [
  'Buenos Aires', 'CABA', 'Catamarca', 'Chaco', 'Chubut', 'Córdoba', 'Corrientes',
  'Entre Ríos', 'Formosa', 'Jujuy', 'La Pampa', 'La Rioja', 'Mendoza', 'Misiones',
  'Neuquén', 'Río Negro', 'Salta', 'San Juan', 'San Luis', 'Santa Cruz', 'Santa Fe',
  'Santiago del Estero', 'Tierra del Fuego', 'Tucumán',
];

function normalizar(s: string): string {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase().trim();
}

// Factor regional para una provincia (default 1.0 si no se reconoce).
export function factorRegion(provincia?: string | null): number {
  if (!provincia) return REGIONES.NOA; // sin provincia → asumimos NOA (base de clientes)
  const region = PROVINCIA_REGION[normalizar(provincia)];
  return region ? REGIONES[region] : 1.0;
}

// ─── Utilidades puras (conservadas; testeadas en precios.test.ts) ──────────────
export function mediana(nums: number[]): number {
  if (nums.length === 0) return 0;
  const s = [...nums].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : Math.round((s[m - 1] + s[m]) / 2);
}

export interface RegistroPrecio {
  precio: number | string;
  fecha_vigencia?: string;
  idempresa?: string | number;
}

// LEGACY: mediana del precio vigente por estación (estrategia del viejo dataset SE).
// Sin uso en runtime; se conserva por los tests y por si vuelve una fuente con detalle.
const VENTANA_MESES = 9;
const MIN_ESTACIONES = 5;
export function medianaVigente(records: RegistroPrecio[], desdeISO: string): number | null {
  const porEstacion = new Map<string, number>();
  for (const r of records) {
    const fecha = String(r.fecha_vigencia || '');
    if (fecha < desdeISO) continue;
    const id = String(r.idempresa ?? '');
    if (porEstacion.has(id)) continue;
    const precio = Number(r.precio);
    if (Number.isFinite(precio) && precio >= PRECIO_MIN && precio <= PRECIO_MAX) {
      porEstacion.set(id, precio);
    }
  }
  if (porEstacion.size < MIN_ESTACIONES) return null;
  const med = mediana([...porEstacion.values()]);
  return med >= PRECIO_MIN && med <= PRECIO_MAX ? med : null;
}
void VENTANA_MESES;

// ─── Parseo de surtidores.com.ar ──────────────────────────────────────────────

// Parsea un número en formato AR ("2115", "300,00", "168.40", "20,79") → número.
export function parseNumAR(raw: string): number | null {
  let s = (raw || '').replace(/\s|&nbsp;|\$/g, '').trim();
  if (!s) return null;
  // Si tiene coma decimal (ej "300,00" / "20,79"), tratarla como punto decimal.
  if (s.includes(',')) s = s.replace(/\./g, '').replace(',', '.');
  const n = parseFloat(s);
  return Number.isFinite(n) ? n : null;
}

// Extrae de la tabla del AÑO `anio` el precio del mes `mesIdx0` (0=Enero) para
// "Gasoil" (común) y "Euro" (premium). Si el mes en curso está vacío (todavía no
// publicado), retrocede mes a mes hasta encontrar el último valor cargado.
// PURA (sin red) para poder testearla.
export function parsePreciosSurtidores(
  html: string,
  anio: number,
  mesIdx0: number,
): { comun: number; premium: number } | null {
  const tablas = html.match(/<table[\s\S]*?<\/table>/gi) || [];
  const limpiar = (c: string) => c.replace(/<[^>]+>/g, '').trim();

  for (const tabla of tablas) {
    const filas = [...tabla.matchAll(/<tr>([\s\S]*?)<\/tr>/gi)].map(m => m[1]);
    if (filas.length < 2) continue;
    const celdasDe = (fila: string) =>
      [...fila.matchAll(/<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi)].map(m => limpiar(m[1]));

    const header = celdasDe(filas[0]);
    if (header[0] !== String(anio)) continue; // no es la tabla de este año

    const valorEnFila = (etiqueta: RegExp): number | null => {
      const fila = filas.find(f => etiqueta.test(celdasDe(f)[0] || ''));
      if (!fila) return null;
      const celdas = celdasDe(fila); // celdas[0] = nombre, celdas[1..12] = meses
      for (let m = mesIdx0; m >= 0; m--) {
        const v = parseNumAR(celdas[m + 1] || '');
        if (v && v >= PRECIO_MIN && v <= PRECIO_MAX) return v;
      }
      return null;
    };

    const comun = valorEnFila(/^gasoil$/i);
    const premium = valorEnFila(/^euro$/i);
    if (comun && premium) return { comun, premium };
    if (comun) return { comun, premium: Math.round(comun * 1.10) }; // premium ≈ +10% si falta
  }
  return null;
}

// Trae el precio nacional vigente (común + premium) de surtidores.com.ar.
// Devuelve null si la página no responde o no se puede parsear.
async function fetchBaseNacional(): Promise<{ comun: number; premium: number } | null> {
  try {
    const res = await fetch(SURTIDORES_URL, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; FletIA/1.0)' },
      signal: AbortSignal.timeout(12000),
      next: { revalidate: 60 * 60 * 6 }, // el dato cambia, a lo sumo, una vez al día
    });
    if (!res.ok) return null;
    const html = await res.text();
    const hoy = new Date();
    // Intentar mes/año actual; si la tabla del año aún no existe, probar año anterior.
    return (
      parsePreciosSurtidores(html, hoy.getFullYear(), hoy.getMonth()) ||
      parsePreciosSurtidores(html, hoy.getFullYear() - 1, 11)
    );
  } catch {
    return null;
  }
}

// Valor de referencia nacional si la fuente cae (mediana nacional jun-2026).
const REFERENCIA_NACIONAL = { comun: 2115, premium: 2323 };

// Arma las 8 filas (4 banderas × común/premium) a partir del precio nacional base.
function filasDesdeBase(base: { comun: number; premium: number }): Omit<PrecioCombustible, 'fecha'>[] {
  return ORDEN_MARCAS.flatMap(empresa => {
    const d = DELTA_MARCA[empresa];
    return [
      { empresa, tipo: 'Gasoil Común',   precio: Math.round(base.comun + d.comun) },
      { empresa, tipo: 'Gasoil Premium', precio: Math.round(base.premium + d.premium) },
    ];
  });
}

// Devuelve los precios de hoy para una provincia. Estrategia:
//   1) si hay caché NACIONAL en Supabase para hoy → la usa (rápido, sin red externa)
//   2) si no, scrapea surtidores.com.ar y cachea el base nacional del día
//   3) si la fuente falla, usa el valor de referencia (sin cachear, para reintentar)
//   4) sobre el base nacional aplica el FACTOR REGIONAL de la provincia
//
// La caché guarda el base NACIONAL (factor 1.0); el ajuste regional se aplica en
// memoria al leer → no requiere columna nueva ni migración.
export async function getPreciosDeHoy(
  db: SupabaseClient,
  provincia?: string | null,
): Promise<{ precios: PrecioCombustible[]; fuente: FuentePrecios; provincia: string; factor: number }> {
  const hoy = new Date().toISOString().split('T')[0];
  const factor = factorRegion(provincia);
  const provNom = provincia || PROVINCIA_DEFAULT;

  const aplicarRegion = (rows: Omit<PrecioCombustible, 'fecha'>[]): PrecioCombustible[] =>
    rows.map(r => ({ ...r, precio: Math.round(r.precio * factor), fecha: hoy }));

  // 1) caché nacional del día
  const { data: cache } = await db
    .from('precio_combustible')
    .select('empresa, tipo, precio')
    .eq('fecha', hoy);

  if (cache && cache.length > 0) {
    // Dedupe defensivo por empresa+tipo (la tabla no tiene unique; corridas viejas
    // pudieron dejar filas repetidas).
    const vistos = new Set<string>();
    const base = (cache as Omit<PrecioCombustible, 'fecha'>[]).filter(r => {
      const k = `${r.empresa}|${r.tipo}`;
      if (vistos.has(k)) return false;
      vistos.add(k);
      return true;
    });
    return { precios: aplicarRegion(base), fuente: 'cache', provincia: provNom, factor };
  }

  // 2) fuente viva
  const base = await fetchBaseNacional();
  if (base) {
    const rows = filasDesdeBase(base);
    await db.from('precio_combustible')
      .insert(rows.map(r => ({ ...r, fecha: hoy })))
      .select()
      .then(() => {}, () => {}); // si falla la escritura (RLS/carrera), devolvemos igual
    return { precios: aplicarRegion(rows), fuente: 'oficial', provincia: provNom, factor };
  }

  // 3) referencia
  return {
    precios: aplicarRegion(filasDesdeBase(REFERENCIA_NACIONAL)),
    fuente: 'referencia',
    provincia: provNom,
    factor,
  };
}
