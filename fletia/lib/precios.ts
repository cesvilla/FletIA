// ─── Precios de gasoil — fuente oficial (Secretaría de Energía AR) ─────────────
//
// Dataset público "Precios en surtidor — Resolución 314/2016". Las estaciones
// declaran sus precios y el Estado los publica vía API (CKAN datastore).
// Consultamos el PROMEDIO NACIONAL por bandera para gasoil común (Grado 2) y
// premium (Grado 3), en AR$/litro.
//
// Detalle importante: el endpoint SQL se consulta por POST. Por GET, un WAF
// delante del servidor corta la conexión al detectar patrones tipo SQL en la
// URL (LIKE, paréntesis, etc.). Por POST funciona sin problemas.

import type { SupabaseClient } from '@supabase/supabase-js';

// Recurso "Precios vigentes en surtidor" (datastore_active = true)
const RESOURCE_ID = '80ac25de-a44a-4445-9215-090cf55cfda5';
const ENERGIA_SQL_URL = 'https://datos.energia.gob.ar/api/3/action/datastore_search_sql';

// Banderas que mostramos (nombre oficial → nombre lindo para la UI)
const BANDERAS: Record<string, string> = {
  'YPF': 'YPF',
  'SHELL C.A.P.S.A.': 'Shell',
  'AXION': 'Axion',
  'PUMA': 'Puma',
};

export interface PrecioCombustible {
  empresa: string;
  tipo: string;     // 'Gasoil Común' | 'Gasoil Premium'
  precio: number;   // AR$/litro
  fecha: string;    // YYYY-MM-DD
}

export type FuentePrecios = 'oficial' | 'cache' | 'referencia';

// Valores de referencia (último promedio nacional conocido). Solo se usan si la
// API oficial no responde. Se etiquetan como "referencia" en la UI para no
// mentirle al usuario sobre la frescura del dato.
const REFERENCIA: Omit<PrecioCombustible, 'fecha'>[] = [
  { empresa: 'YPF',   tipo: 'Gasoil Común',   precio: 1269 },
  { empresa: 'YPF',   tipo: 'Gasoil Premium', precio: 1443 },
  { empresa: 'Shell', tipo: 'Gasoil Común',   precio: 1734 },
  { empresa: 'Shell', tipo: 'Gasoil Premium', precio: 1947 },
  { empresa: 'Axion', tipo: 'Gasoil Común',   precio: 1757 },
  { empresa: 'Axion', tipo: 'Gasoil Premium', precio: 1947 },
  { empresa: 'Puma',  tipo: 'Gasoil Común',   precio: 1643 },
  { empresa: 'Puma',  tipo: 'Gasoil Premium', precio: 1843 },
];

// Consulta el promedio nacional real por bandera. Devuelve null si falla.
export async function fetchPreciosOficiales(): Promise<Omit<PrecioCombustible, 'fecha'>[] | null> {
  const banderas = Object.keys(BANDERAS).map(b => `'${b}'`).join(', ');
  const sql =
    `SELECT empresabandera, producto, round(avg(precio)::numeric, 0) AS precio ` +
    `FROM "${RESOURCE_ID}" ` +
    `WHERE producto IN ('Gas Oil Grado 2', 'Gas Oil Grado 3') ` +
    `AND empresabandera IN (${banderas}) ` +
    `GROUP BY empresabandera, producto`;

  try {
    const res = await fetch(ENERGIA_SQL_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sql }),
      signal: AbortSignal.timeout(12000),
      // El dato cambia a lo sumo una vez al día: cacheamos a nivel fetch también.
      next: { revalidate: 60 * 60 * 6 },
    });
    if (!res.ok) return null;

    const data = await res.json();
    const records: any[] = data?.result?.records;
    if (!Array.isArray(records) || records.length === 0) return null;

    const rows = records
      .map(r => ({
        empresa: BANDERAS[r.empresabandera] ?? r.empresabandera,
        tipo: String(r.producto).includes('Grado 3') ? 'Gasoil Premium' : 'Gasoil Común',
        precio: Math.round(Number(r.precio)),
      }))
      .filter(r => Number.isFinite(r.precio) && r.precio > 0)
      // Orden estable: por empresa y con común antes que premium
      .sort((a, b) => a.empresa.localeCompare(b.empresa) || a.tipo.localeCompare(b.tipo));

    return rows.length > 0 ? rows : null;
  } catch {
    return null;
  }
}

// Devuelve los precios de hoy. Estrategia:
//   1) si ya hay caché en Supabase para hoy → la usa (rápido, sin red externa)
//   2) si no, consulta la API oficial y cachea el resultado del día
//   3) si la API falla, devuelve valores de referencia (sin cachear, para reintentar)
//
// `db` debe ser un cliente con permiso de escritura sobre `precio_combustible`
// (admin / service-role). Si se pasa uno sin permiso, igual devuelve datos.
export async function getPreciosDeHoy(
  db: SupabaseClient,
): Promise<{ precios: PrecioCombustible[]; fuente: FuentePrecios }> {
  const hoy = new Date().toISOString().split('T')[0];

  const { data: cache } = await db
    .from('precio_combustible')
    .select('empresa, tipo, precio, fecha')
    .eq('fecha', hoy);

  if (cache && cache.length > 0) {
    return { precios: cache as PrecioCombustible[], fuente: 'cache' };
  }

  const oficiales = await fetchPreciosOficiales();
  if (oficiales) {
    const rows = oficiales.map(p => ({ ...p, fecha: hoy }));
    // upsert defensivo: si dos requests entran a la vez, no duplicamos el día.
    await db.from('precio_combustible').insert(rows).select().then(
      () => {},
      () => {}, // si falla la escritura (RLS, carrera), devolvemos igual los datos
    );
    return { precios: rows, fuente: 'oficial' };
  }

  const rows = REFERENCIA.map(p => ({ ...p, fecha: hoy }));
  return { precios: rows, fuente: 'referencia' };
}
