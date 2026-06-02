// ─── Monitoreo de salud de las APIs externas ─────────────────────────────────
//
// FletIA depende de servicios externos. Si uno se cae (como pasó con el endpoint
// SQL de la Secretaría de Energía, que murió en silencio), conviene enterarse.
// Este módulo pinguea cada dependencia con una request mínima real y reporta
// estado + latencia. Lo usa el cron diario (avisa por mail si algo falla) y el
// panel /admin (widget de estado).

export interface ApiHealth {
  nombre: string;
  ok: boolean;
  status: number | null;
  ms: number;
  critico: boolean;       // si es crítica para el negocio (combustible, rutas)
  detalle?: string;
}

export interface ResumenSalud {
  generadoEn: string;     // ISO timestamp
  todoOk: boolean;
  hayCriticoCaido: boolean;
  apis: ApiHealth[];
}

async function ping(
  nombre: string,
  critico: boolean,
  fn: (signal: AbortSignal) => Promise<{ status: number; ok: boolean; detalle?: string }>,
  timeoutMs = 8000,
): Promise<ApiHealth> {
  const t0 = Date.now();
  const ctrl = new AbortController();
  const id = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const r = await fn(ctrl.signal);
    return { nombre, critico, ok: r.ok, status: r.status, ms: Date.now() - t0, detalle: r.detalle };
  } catch (e: any) {
    const msg = e?.name === 'AbortError' ? `timeout >${timeoutMs}ms` : (e?.message || 'error').slice(0, 80);
    return { nombre, critico, ok: false, status: null, ms: Date.now() - t0, detalle: msg };
  } finally {
    clearTimeout(id);
  }
}

const UA = { 'User-Agent': 'FletIA/1.0 (fletia@gmail.com)' };
const noCache = { cache: 'no-store' as const };

// Pinguea todas las dependencias en paralelo y devuelve el resumen.
export async function checkApis(): Promise<ResumenSalud> {
  const orsKey = process.env.ORS_API_KEY;
  const tomtomKey = process.env.TOMTOM_API_KEY;
  const RID = '80ac25de-a44a-4445-9215-090cf55cfda5';

  const checks: Promise<ApiHealth>[] = [
    // Combustible — Secretaría de Energía (datastore_search). CRÍTICA.
    ping('Combustible (Sec. Energía)', true, async (signal) => {
      const u = `https://datos.energia.gob.ar/api/3/action/datastore_search?resource_id=${RID}&limit=1`;
      const r = await fetch(u, { signal, ...noCache });
      const j = await r.json().catch(() => null);
      const ok = r.ok && j?.success === true && (j?.result?.records?.length ?? 0) > 0;
      return { status: r.status, ok, detalle: ok ? undefined : 'sin registros o success=false' };
    }),

    // Rutas/km — OpenRouteService perfil camión. CRÍTICA (con fallback OSRM).
    ping('Rutas (OpenRouteService)', true, async (signal) => {
      if (!orsKey) return { status: 0, ok: false, detalle: 'sin ORS_API_KEY' };
      const r = await fetch('https://api.openrouteservice.org/v2/directions/driving-hgv/geojson', {
        method: 'POST', signal, ...noCache,
        headers: { Authorization: orsKey, 'Content-Type': 'application/json' },
        body: JSON.stringify({ coordinates: [[-64.18, -31.42], [-60.68, -32.94]], preference: 'fastest' }),
      });
      return { status: r.status, ok: r.ok };
    }),

    // Rutas fallback — OSRM (sin key).
    ping('Rutas fallback (OSRM)', false, async (signal) => {
      const r = await fetch('https://router.project-osrm.org/route/v1/driving/-64.18,-31.42;-60.68,-32.94?overview=false', {
        headers: UA, signal, ...noCache,
      });
      const j = await r.json().catch(() => null);
      return { status: r.status, ok: r.ok && j?.code === 'Ok' };
    }),

    // Tráfico — TomTom. No crítica (la app degrada sin tráfico).
    ping('Tráfico (TomTom)', false, async (signal) => {
      if (!tomtomKey) return { status: 0, ok: false, detalle: 'sin TOMTOM_API_KEY' };
      const u = `https://api.tomtom.com/traffic/services/4/flowSegmentData/absolute/10/json?point=-34.60,-58.38&unit=KMPH&key=${tomtomKey}`;
      const r = await fetch(u, { signal, ...noCache });
      return { status: r.status, ok: r.ok };
    }),

    // Clima — Open-Meteo (sin key). No crítica.
    ping('Clima (Open-Meteo)', false, async (signal) => {
      const r = await fetch('https://api.open-meteo.com/v1/forecast?latitude=-34.6&longitude=-58.38&current=temperature_2m', {
        signal, ...noCache,
      });
      return { status: r.status, ok: r.ok };
    }),

    // Geocodificación — Nominatim (sin key). No crítica (hay diccionario local).
    ping('Geocode (Nominatim)', false, async (signal) => {
      const r = await fetch('https://nominatim.openstreetmap.org/search?q=Rosario,Argentina&format=json&limit=1', {
        headers: UA, signal, ...noCache,
      });
      return { status: r.status, ok: r.ok };
    }),
  ];

  const apis = await Promise.all(checks);
  const todoOk = apis.every(a => a.ok);
  const hayCriticoCaido = apis.some(a => a.critico && !a.ok);

  return {
    generadoEn: new Date().toISOString(),
    todoOk,
    hayCriticoCaido,
    apis,
  };
}
