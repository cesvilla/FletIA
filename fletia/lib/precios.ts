// ─── Precios de gasoil — fuente oficial (Secretaría de Energía AR) ─────────────
//
// Dataset público "Precios en surtidor — Resolución 314/2016". Las estaciones
// declaran sus precios y el Estado los publica vía API (CKAN datastore).
// Consultamos el precio VIGENTE por bandera para gasoil común (Grado 2) y
// premium (Grado 3), en AR$/litro.
//
// ⚠️ IMPORTANTE (jun 2026): el endpoint `datastore_search_sql` quedó deshabilitado
// (responde "Falta el valor" a cualquier SQL, incluso `SELECT 1`). Además el dataset
// es un HISTÓRICO 2017→hoy: cada fila es un precio que entró en vigencia en una fecha.
// Promediar TODAS las filas mezclaba precios de 2017 con 2026 y daba valores absurdos
// (ej. YPF gasoil "promedio" $1269 cuando el real ronda $2200).
//
// Estrategia correcta, usando `datastore_search` (sin SQL, no bloqueado):
//   1) traer las filas de cada bandera/producto ordenadas por fecha desc
//   2) quedarnos con el precio MÁS RECIENTE de cada estación (su precio vigente)
//   3) descartar estaciones que no actualizan hace > VENTANA_MESES (fantasma/cerradas)
//   4) tomar la MEDIANA (robusta a outliers) como precio nacional de la bandera

import type { SupabaseClient } from '@supabase/supabase-js';

// Recurso "Precios vigentes en surtidor" (datastore_active = true)
const RESOURCE_ID = '80ac25de-a44a-4445-9215-090cf55cfda5';
const ENERGIA_SEARCH_URL = 'https://datos.energia.gob.ar/api/3/action/datastore_search';

// Solo consideramos precios declarados en los últimos N meses (precio realmente vigente)
const VENTANA_MESES = 9;
// Mínimo de estaciones para confiar en la mediana de una bandera/producto
const MIN_ESTACIONES = 5;
// Rango sanity-check para un precio de gasoil en AR$/litro (descarta datos corruptos)
const PRECIO_MIN = 300;
const PRECIO_MAX = 100000;

// Banderas oficiales (nombre en el dataset → nombre lindo para la UI)
const BANDERAS: Record<string, string> = {
  'YPF': 'YPF',
  'SHELL C.A.P.S.A.': 'Shell',
  'AXION': 'Axion',
  'PUMA': 'Puma',
};

// Productos oficiales (nombre en el dataset → tipo lindo para la UI)
const PRODUCTOS: Record<string, string> = {
  'Gas Oil Grado 2': 'Gasoil Común',
  'Gas Oil Grado 3': 'Gasoil Premium',
};

export interface PrecioCombustible {
  empresa: string;
  tipo: string;     // 'Gasoil Común' | 'Gasoil Premium'
  precio: number;   // AR$/litro
  fecha: string;    // YYYY-MM-DD
}

export type FuentePrecios = 'oficial' | 'cache' | 'referencia';

// Valores de referencia (último promedio nacional conocido — mediana vigente jun-2026).
// Solo se usan si la API oficial no responde, o por bandera/producto con muestra
// insuficiente. Se etiquetan como "referencia" en la UI cuando se usan en bloque.
const REFERENCIA: Omit<PrecioCombustible, 'fecha'>[] = [
  { empresa: 'YPF',   tipo: 'Gasoil Común',   precio: 2199 },
  { empresa: 'YPF',   tipo: 'Gasoil Premium', precio: 2364 },
  { empresa: 'Shell', tipo: 'Gasoil Común',   precio: 2199 },
  { empresa: 'Shell', tipo: 'Gasoil Premium', precio: 2489 },
  { empresa: 'Axion', tipo: 'Gasoil Común',   precio: 2269 },
  { empresa: 'Axion', tipo: 'Gasoil Premium', precio: 2479 },
  { empresa: 'Puma',  tipo: 'Gasoil Común',   precio: 2200 },
  { empresa: 'Puma',  tipo: 'Gasoil Premium', precio: 2455 },
];

function refDe(empresa: string, tipo: string): number | null {
  return REFERENCIA.find(r => r.empresa === empresa && r.tipo === tipo)?.precio ?? null;
}

function mediana(nums: number[]): number {
  if (nums.length === 0) return 0;
  const s = [...nums].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : Math.round((s[m - 1] + s[m]) / 2);
}

// Trae el precio vigente (mediana nacional) de una bandera/producto.
// Devuelve null si no hay muestra suficiente o la API falla.
async function precioVigente(
  banderaOficial: string,
  productoOficial: string,
  desdeISO: string,
): Promise<number | null> {
  const filters = encodeURIComponent(JSON.stringify({
    producto: productoOficial,
    empresabandera: banderaOficial,
  }));
  // Orden por índice de tiempo desc → las filas más nuevas primero, así el primer
  // registro de cada estación es su precio vigente. Pedimos solo los campos necesarios.
  const url =
    `${ENERGIA_SEARCH_URL}?resource_id=${RESOURCE_ID}` +
    `&filters=${filters}` +
    `&fields=precio,fecha_vigencia,idempresa` +
    `&sort=indice_tiempo desc` +
    `&limit=10000`;

  try {
    const res = await fetch(url, {
      signal: AbortSignal.timeout(12000),
      // El dato cambia a lo sumo una vez al día.
      next: { revalidate: 60 * 60 * 6 },
    });
    if (!res.ok) return null;
    const data = await res.json();
    const records: any[] = data?.result?.records;
    if (!Array.isArray(records) || records.length === 0) return null;

    // Precio vigente por estación: primer registro (más reciente) dentro de la ventana.
    const porEstacion = new Map<string, number>();
    for (const r of records) {
      const fecha = String(r.fecha_vigencia || '');
      if (fecha < desdeISO) continue;                 // fuera de ventana → estación inactiva
      const id = String(r.idempresa ?? '');
      if (porEstacion.has(id)) continue;              // ya tomamos su precio más reciente
      const precio = Number(r.precio);
      if (Number.isFinite(precio) && precio >= PRECIO_MIN && precio <= PRECIO_MAX) {
        porEstacion.set(id, precio);
      }
    }

    if (porEstacion.size < MIN_ESTACIONES) return null;
    const med = mediana([...porEstacion.values()]);
    return med >= PRECIO_MIN && med <= PRECIO_MAX ? med : null;
  } catch {
    return null;
  }
}

// Consulta el precio nacional vigente real por bandera. Devuelve null si TODO falla.
// Para banderas/productos con muestra insuficiente, completa con el valor de referencia
// (así el usuario nunca ve un precio en $0 o ausente).
export async function fetchPreciosOficiales(): Promise<Omit<PrecioCombustible, 'fecha'>[] | null> {
  const desde = new Date();
  desde.setMonth(desde.getMonth() - VENTANA_MESES);
  const desdeISO = desde.toISOString().slice(0, 10);

  const combos = Object.entries(BANDERAS).flatMap(([banderaOf, banderaUI]) =>
    Object.entries(PRODUCTOS).map(([prodOf, tipoUI]) => ({ banderaOf, banderaUI, prodOf, tipoUI })),
  );

  const resultados = await Promise.all(
    combos.map(async (c) => {
      const precio = await precioVigente(c.banderaOf, c.prodOf, desdeISO);
      return { empresa: c.banderaUI, tipo: c.tipoUI, precio };
    }),
  );

  // Si NINGUNA bandera/producto trajo dato real, consideramos caída la API.
  const conDatoReal = resultados.filter(r => r.precio != null).length;
  if (conDatoReal === 0) return null;

  // Completar huecos con referencia y ordenar de forma estable.
  const rows = resultados
    .map(r => ({
      empresa: r.empresa,
      tipo: r.tipo,
      precio: r.precio ?? refDe(r.empresa, r.tipo) ?? 0,
    }))
    .filter(r => r.precio > 0)
    .sort((a, b) => a.empresa.localeCompare(b.empresa) || a.tipo.localeCompare(b.tipo));

  return rows.length > 0 ? rows : null;
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
