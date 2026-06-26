// ─── Precios de gasoil — CSV oficial de la Secretaría de Energía ───────────────
//
// FUENTE: dataset "Precios en surtidor — Resolución 314/2016", recurso "Precios
// vigentes". La API `datastore_search` quedó deshabilitada (404), PERO el archivo
// CSV descargable sigue actualizándose A DIARIO (last_modified = hoy). Lo bajamos,
// lo parseamos y calculamos la MEDIANA real por PROVINCIA para gasoil común
// (Gas Oil Grado 2) y premium (Gas Oil Grado 3), en AR$/litro.
//
// ⚠️ El CSV "vigentes" incluye estaciones que declararon su precio hace mucho y no
// lo actualizaron (su último precio sigue "vigente"). Promediar todo da valores
// absurdos (mediana cruda Tucumán $1326 vs real ~$2395). Por eso filtramos a una
// VENTANA temporal: solo estaciones que actualizaron en los últimos N días, con
// dedupe por estación. Si una provincia tiene muestra chica, se ensancha la ventana
// y, si sigue corta, cae a la mediana de su REGIÓN y luego nacional.
//
// El base se cachea por día y por provincia en Supabase. La descarga (8.8 MB) la
// hace el cron (o el primer request que encuentre la caché vacía); las páginas
// leen caché. Si todo falla, se usa REFERENCIA × factor regional.

import type { SupabaseClient } from '@supabase/supabase-js';

const CSV_URL =
  'https://datos.energia.gob.ar/dataset/1c181390-5045-475e-94dc-410429be4b17/resource/' +
  '80ac25de-a44a-4445-9215-090cf55cfda5/download/precios-en-surtidor-resolucin-3142016.csv';

const PRODUCTO_COMUN = 'Gas Oil Grado 2';
const PRODUCTO_PREMIUM = 'Gas Oil Grado 3';

// Ventanas (en días) que se prueban en orden hasta juntar muestra suficiente.
const VENTANAS_DIAS = [120, 240, 400];
// Mínimo de estaciones para confiar en la mediana propia de una provincia. Si una
// provincia chica no llega (ej. Salta/Jujuy, con pocas estaciones y outliers que
// rompen la mediana), cae a la mediana de su REGIÓN, bien muestreada y estable.
const MIN_ESTACIONES = 8;
const PRECIO_MIN = 300;
const PRECIO_MAX = 100000;

export interface PrecioCombustible {
  empresa: string;
  tipo: string;     // 'Gasoil Común' | 'Gasoil Premium'
  precio: number;   // AR$/litro
  fecha: string;    // YYYY-MM-DD
}

export type FuentePrecios = 'oficial' | 'cache' | 'referencia';

// ─── Banderas: delta aditivo respecto del precio base de la provincia (≈ YPF) ──
// El CSV no da muestra confiable por bandera+provincia (muy ralo), así que sobre
// la mediana provincial repartimos las 4 banderas con spreads típicos.
const DELTA_MARCA: Record<string, { comun: number; premium: number }> = {
  'YPF':   { comun: 0,  premium: 0   },
  'Shell': { comun: 0,  premium: 125 },
  'Axion': { comun: 70, premium: 115 },
  'Puma':  { comun: 0,  premium: 90  },
};
const ORDEN_MARCAS = ['YPF', 'Shell', 'Axion', 'Puma'];

// ─── Provincias / regiones (nombres EXACTOS del CSV oficial) ───────────────────
const REGION_DE: Record<string, string> = {
  'BUENOS AIRES': 'PAMPEANA', 'CAPITAL FEDERAL': 'PAMPEANA',
  'CORDOBA': 'CENTRO', 'SANTA FE': 'CENTRO', 'ENTRE RIOS': 'CENTRO',
  'TUCUMAN': 'NOA', 'SALTA': 'NOA', 'JUJUY': 'NOA', 'CATAMARCA': 'NOA',
  'SANTIAGO DEL ESTERO': 'NOA', 'LA RIOJA': 'NOA',
  'CHACO': 'NEA', 'CORRIENTES': 'NEA', 'MISIONES': 'NEA', 'FORMOSA': 'NEA',
  'MENDOZA': 'CUYO', 'SAN JUAN': 'CUYO', 'SAN LUIS': 'CUYO',
  'NEUQUEN': 'PATAGONIA', 'RIO NEGRO': 'PATAGONIA', 'CHUBUT': 'PATAGONIA',
  'SANTA CRUZ': 'PATAGONIA', 'TIERRA DEL FUEGO': 'PATAGONIA', 'LA PAMPA': 'PATAGONIA',
};
const PROVINCIAS_CSV = Object.keys(REGION_DE);

// Provincia por defecto cuando la cuenta no la tiene seteada (base de clientes = NOA).
export const PROVINCIA_DEFAULT = 'Tucumán';

// Factor regional SOLO para el fallback REFERENCIA (cuando el CSV no responde).
const FACTOR_REGION: Record<string, number> = {
  NOA: 1.13, NEA: 1.10, CUYO: 1.06, PATAGONIA: 1.08, CENTRO: 1.02, PAMPEANA: 1.0,
};
const REFERENCIA_NACIONAL = { comun: 2240, premium: 2500 }; // mediana PAMPEANA jun-2026

function normalizar(s: string): string {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase().trim();
}

// Nombre de provincia de la UI → nombre exacto del CSV.
const ALIAS_PROVINCIA: Record<string, string> = {
  'CABA': 'CAPITAL FEDERAL',
  'CIUDAD AUTONOMA DE BUENOS AIRES': 'CAPITAL FEDERAL',
  'CIUDAD DE BUENOS AIRES': 'CAPITAL FEDERAL',
};
export function provinciaCSV(ui?: string | null): string {
  const n = normalizar(ui || PROVINCIA_DEFAULT);
  return ALIAS_PROVINCIA[n] || n;
}

// ─── Utilidades ────────────────────────────────────────────────────────────────
export function mediana(nums: number[]): number {
  if (nums.length === 0) return 0;
  const s = [...nums].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : Math.round((s[m - 1] + s[m]) / 2);
}

// Parsea un número en formato AR ("2190", "1320.721", "300,00") → número.
export function parseNumAR(raw: string): number | null {
  let s = (raw || '').replace(/\s|\$/g, '').trim();
  if (!s) return null;
  if (s.includes(',') && !s.includes('.')) s = s.replace(',', '.');
  else if (s.includes(',') && s.includes('.')) s = s.replace(/\./g, '').replace(',', '.');
  const n = parseFloat(s);
  return Number.isFinite(n) ? n : null;
}

// Parsea una línea CSV respetando comillas dobles (campo geojson trae comas).
export function splitCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = '';
  let inQ = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQ) {
      if (ch === '"') {
        if (line[i + 1] === '"') { cur += '"'; i++; }
        else inQ = false;
      } else cur += ch;
    } else if (ch === '"') inQ = true;
    else if (ch === ',') { out.push(cur); cur = ''; }
    else cur += ch;
  }
  out.push(cur);
  return out;
}

export interface RegistroSurtidor {
  provincia: string;
  producto: string;
  idempresa: string;
  precio: number;
  fecha: string;      // YYYY-MM-DD
}

// Parsea el CSV oficial → registros mínimos (solo los campos que usamos).
export function parseCsvVigentes(text: string): RegistroSurtidor[] {
  const lineas = text.split(/\r?\n/).filter(l => l.length > 0);
  if (lineas.length < 2) return [];
  const head = splitCsvLine(lineas[0]).map(h => h.trim());
  const iProv = head.indexOf('provincia');
  const iProd = head.indexOf('producto');
  const iEmp = head.indexOf('idempresa');
  const iPre = head.indexOf('precio');
  const iFec = head.indexOf('fecha_vigencia');
  if (iProv < 0 || iProd < 0 || iPre < 0 || iFec < 0) return [];

  const out: RegistroSurtidor[] = [];
  for (let i = 1; i < lineas.length; i++) {
    const c = splitCsvLine(lineas[i]);
    const precio = parseNumAR(c[iPre] || '');
    if (precio == null || precio < PRECIO_MIN || precio > PRECIO_MAX) continue;
    out.push({
      provincia: (c[iProv] || '').trim(),
      producto: (c[iProd] || '').trim(),
      idempresa: (c[iEmp] || '').trim(),
      precio,
      fecha: (c[iFec] || '').slice(0, 10),
    });
  }
  return out;
}

function isoMenosDias(dias: number): string {
  return new Date(Date.now() - dias * 86_400_000).toISOString().slice(0, 10);
}

// Mediana del precio reciente por estación, sobre los registros que cumplen `pred`.
// Dedupe por idempresa (primer match = más reciente si vienen ordenados; el orden
// no importa para la mediana mientras tomemos un precio por estación).
export function medianaFiltrada(
  records: RegistroSurtidor[],
  pred: (r: RegistroSurtidor) => boolean,
  desdeISO: string,
): { med: number; n: number } | null {
  const porEstacion = new Map<string, number>();
  for (const r of records) {
    if (r.fecha < desdeISO || !pred(r)) continue;
    if (!porEstacion.has(r.idempresa)) porEstacion.set(r.idempresa, r.precio);
  }
  if (porEstacion.size < MIN_ESTACIONES) return null;
  return { med: mediana([...porEstacion.values()]), n: porEstacion.size };
}

// Base común+premium de una provincia: ventana adaptativa → región → nacional.
export function baseProvincia(
  records: RegistroSurtidor[],
  provCSV: string,
): { comun: number; premium: number } | null {
  const region = REGION_DE[provCSV];

  // Ventana reciente: clave para no mezclar precios de meses viejos (inflación).
  const reciente = isoMenosDias(VENTANAS_DIAS[0]);
  const medConFallback = (producto: string): number | null => {
    // 1) provincia exacta, ventana reciente
    let m = medianaFiltrada(records, r => r.provincia === provCSV && r.producto === producto, reciente);
    if (m) return m.med;
    // 2) región, ventana reciente — un precio REGIONAL ACTUAL es mejor que uno
    //    provincial viejo (provincias ralas como Salta/Jujuy caen acá).
    if (region) {
      m = medianaFiltrada(records, r => REGION_DE[r.provincia] === region && r.producto === producto, reciente);
      if (m) return m.med;
    }
    // 3) nacional, ventana reciente
    m = medianaFiltrada(records, r => r.producto === producto, reciente);
    if (m) return m.med;
    // 4) extremo: la propia provincia ensanchando la ventana (datos viejos, último recurso)
    for (const dias of VENTANAS_DIAS.slice(1)) {
      m = medianaFiltrada(records, r => r.provincia === provCSV && r.producto === producto, isoMenosDias(dias));
      if (m) return m.med;
    }
    return null;
  };

  const comun = medConFallback(PRODUCTO_COMUN);
  if (comun == null) return null;
  const premium = medConFallback(PRODUCTO_PREMIUM) ?? Math.round(comun * 1.11);
  return { comun, premium };
}

// Arma las 8 filas (4 banderas × común/premium) para una provincia a partir del base.
type FilaBase = Omit<PrecioCombustible, 'fecha'> & { provincia: string };
function filasDesdeBase(provCSV: string, base: { comun: number; premium: number }): FilaBase[] {
  return ORDEN_MARCAS.flatMap(empresa => {
    const d = DELTA_MARCA[empresa];
    return [
      { empresa, tipo: 'Gasoil Común',   precio: Math.round(base.comun + d.comun),   provincia: provCSV },
      { empresa, tipo: 'Gasoil Premium', precio: Math.round(base.premium + d.premium), provincia: provCSV },
    ];
  });
}

// Fallback de referencia (cuando el CSV no responde): nacional × factor regional.
function filasReferencia(provCSV: string): Array<Omit<PrecioCombustible, 'fecha'> & { provincia: string }> {
  const factor = FACTOR_REGION[REGION_DE[provCSV]] ?? 1.0;
  return filasDesdeBase(provCSV, {
    comun: Math.round(REFERENCIA_NACIONAL.comun * factor),
    premium: Math.round(REFERENCIA_NACIONAL.premium * factor),
  });
}

async function fetchCsv(): Promise<string | null> {
  try {
    const res = await fetch(CSV_URL, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; FletIA/1.0)' },
      signal: AbortSignal.timeout(20000),
      next: { revalidate: 60 * 60 * 6 },
    });
    if (!res.ok) return null;
    const txt = await res.text();
    return txt.length > 1000 ? txt : null;
  } catch {
    return null;
  }
}

// Calcula las filas de TODAS las provincias a partir del CSV (1 sola descarga).
function computarTodas(records: RegistroSurtidor[], hoy: string): Array<PrecioCombustible & { provincia: string }> {
  const filas: Array<PrecioCombustible & { provincia: string }> = [];
  for (const provCSV of PROVINCIAS_CSV) {
    const base = baseProvincia(records, provCSV);
    if (!base) continue;
    for (const f of filasDesdeBase(provCSV, base)) {
      filas.push({ ...f, fecha: hoy });
    }
  }
  return filas;
}

function dedupePorEmpresaTipo<T extends { empresa: string; tipo: string }>(rows: T[]): T[] {
  const vistos = new Set<string>();
  return rows.filter(r => {
    const k = `${r.empresa}|${r.tipo}`;
    if (vistos.has(k)) return false;
    vistos.add(k);
    return true;
  });
}

// Devuelve los precios de hoy para una provincia. Estrategia:
//   1) caché del día para esa provincia → la usa (rápido)
//   2) si no, y `fetchSiFalta`, descarga el CSV oficial UNA vez, calcula TODAS las
//      provincias, cachea todo y devuelve la pedida
//   3) si la descarga falla o `fetchSiFalta=false`, usa REFERENCIA × factor regional
//
// Las páginas pasan `fetchSiFalta:false` (leen caché, no bloquean en la descarga de
// 8.8 MB); el cron y la API de cambio de provincia la dejan en `true`.
export async function getPreciosDeHoy(
  db: SupabaseClient,
  provincia?: string | null,
  opts: { fetchSiFalta?: boolean } = {},
): Promise<{ precios: PrecioCombustible[]; fuente: FuentePrecios; provincia: string }> {
  const { fetchSiFalta = true } = opts;
  const hoy = new Date().toISOString().split('T')[0];
  const provNom = provinciaCSV(provincia);

  // 1) caché del día para esta provincia
  const { data: cache } = await db
    .from('precio_combustible')
    .select('empresa, tipo, precio')
    .eq('fecha', hoy)
    .eq('provincia', provNom);

  if (cache && cache.length > 0) {
    const precios = dedupePorEmpresaTipo(cache as any).map((r: any) => ({ ...r, fecha: hoy }));
    return { precios, fuente: 'cache', provincia: provNom };
  }

  // 2) descarga + cálculo de todas las provincias
  if (fetchSiFalta) {
    const text = await fetchCsv();
    if (text) {
      const records = parseCsvVigentes(text);
      const todas = computarTodas(records, hoy);
      if (todas.length > 0) {
        // Reescribe el día completo (evita mezclar con filas viejas/parciales).
        await db.from('precio_combustible').delete().eq('fecha', hoy);
        await db.from('precio_combustible').insert(todas).select().then(() => {}, () => {});
        const rows = todas.filter(r => r.provincia === provNom);
        if (rows.length > 0) {
          return { precios: rows.map(({ provincia: _p, ...r }) => r), fuente: 'oficial', provincia: provNom };
        }
      }
    }
  }

  // 3) referencia
  const ref = filasReferencia(provNom).map(({ provincia: _p, ...r }) => ({ ...r, fecha: hoy }));
  return { precios: ref, fuente: 'referencia', provincia: provNom };
}
