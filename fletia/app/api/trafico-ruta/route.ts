import { NextResponse } from 'next/server';

const TOMTOM_KEY = process.env.TOMTOM_API_KEY;

// Permitir hasta 30s en Vercel (varias consultas a TomTom + geocodificación)
export const maxDuration = 30;

// fetch con timeout: evita que una consulta lenta cuelgue toda la respuesta
async function fetchConTimeout(url: string, opts: RequestInit = {}, ms = 8000): Promise<Response | null> {
  const ctrl = new AbortController();
  const id = setTimeout(() => ctrl.abort(), ms);
  try {
    return await fetch(url, { ...opts, signal: ctrl.signal });
  } catch {
    return null;
  } finally {
    clearTimeout(id);
  }
}

type NivelTrafico = 'fluido' | 'moderado' | 'lento' | 'congestionado';

interface SegmentoTrafico {
  lat: number;
  lon: number;
  nombre: string;
  velocidadActual: number;  // km/h
  velocidadLibre: number;   // km/h sin tráfico
  nivel: NivelTrafico;
  emoji: string;
  color: string;
  demora: number;           // minutos extra REALES (de TomTom) en el tramo monitoreado
  incidentes: Incidente[];
  numIncidentes: number;    // cantidad de incidentes en el tramo (para el badge de la tarjeta)
  bajaCobertua: boolean;    // true si TomTom no tiene datos de flujo del tramo
}

interface ResumenTipo {
  tipo: string;
  emoji: string;
  cantidad: number;
}

interface ZonaTrafico {
  zona: string;             // "Ciudad, Provincia" — la ruta/zona por la que pasa el camión
  totalIncidentes: number;
  tipos: ResumenTipo[];     // desglose por tipo dentro de la zona (sin detalle de calles)
}

interface CorteRuta {
  tipo: string;             // "Ruta cerrada" / "Carril cerrado"
  emoji: string;
  zona: string;             // "Ciudad, Provincia" donde está el corte
  ubicacion: string;        // tramo concreto del corte (calle/ruta → calle/ruta)
}

// Tipos de incidente que son cortes/cierres de ruta (los importantes para el chofer)
const TIPOS_CORTE = new Set(['Ruta cerrada', 'Carril cerrado']);

// Solo nos importan los cortes sobre vías RELEVANTES para el camión:
// rutas nacionales/provinciales, autopistas, autovías, accesos, circunvalaciones,
// colectoras y caminos. Descarta el ruido de calles urbanas menores que caen
// dentro del radio de búsqueda al pasar cerca de una ciudad.
const VIA_RELEVANTE = /(\bruta\s|\brn\s?\d|\brp\s?\d|autopista|autov[ií]a|\bau\s?\d|\bacceso\b|circunvalaci[oó]n|colectora|camino\s)/i;

interface Incidente {
  tipo: string;
  emoji: string;
  descripcion: string;
  gravedad: number; // 1-4 (magnitudeOfDelay de TomTom)
}

function clasificarTrafico(velocidadActual: number, velocidadLibre: number): {
  nivel: NivelTrafico;
  emoji: string;
  color: string;
} {
  const ratio = velocidadLibre > 0 ? velocidadActual / velocidadLibre : 1;

  if (ratio >= 0.75) return { nivel: 'fluido',        emoji: '🟢', color: '#1a6b3a' };
  if (ratio >= 0.50) return { nivel: 'moderado',      emoji: '🟡', color: '#c8860a' };
  if (ratio >= 0.25) return { nivel: 'lento',         emoji: '🟠', color: '#d4440c' };
  return                    { nivel: 'congestionado', emoji: '🔴', color: '#8b0000' };
}

// Extraer N puntos equidistantes de la polyline
function muestrarPuntos(polyline: [number, number][], n: number): [number, number][] {
  if (polyline.length <= n) return polyline;
  const step = Math.floor(polyline.length / n);
  const puntos: [number, number][] = [];
  for (let i = 0; i < n; i++) {
    puntos.push(polyline[Math.min(i * step, polyline.length - 1)]);
  }
  puntos[n - 1] = polyline[polyline.length - 1];
  return puntos;
}

// Caché en memoria de nombres geocodificados (L1, por instancia caliente).
const cacheNombres = new Map<string, string>();

// Geocodificación inversa simple para nombrar los segmentos
async function reversGeocode(lat: number, lon: number): Promise<string> {
  // Redondeo a ~100m: más aciertos de caché, el nombre no cambia a esa escala.
  const rlat = lat.toFixed(3), rlon = lon.toFixed(3);
  const key = `${rlat},${rlon}`;
  const cached = cacheNombres.get(key);
  if (cached !== undefined) return cached;
  try {
    const url = `https://nominatim.openstreetmap.org/reverse?lat=${rlat}&lon=${rlon}&format=json&zoom=8&addressdetails=1`;
    const res = await fetchConTimeout(url, {
      headers: { 'User-Agent': 'FletIA/1.0 (fletia@gmail.com)' },
      next: { revalidate: 60 * 60 * 24 * 30 }, // L2: data-cache de Next (30 días)
    }, 6000);
    if (!res || !res.ok) return 'En ruta';
    const data = await res.json();
    const addr = data.address;
    let ciudad = addr?.city || addr?.town || addr?.county || addr?.state_district;
    const provincia = addr?.state;
    // Nominatim devuelve "Comuna N" en CABA (poco útil y engañoso al aplicarlo a
    // toda la zona): lo descartamos y usamos solo la provincia.
    if (ciudad && /^comuna\s/i.test(ciudad)) ciudad = null;
    const resultado = (ciudad && provincia && ciudad !== provincia)
      ? `${ciudad}, ${provincia}`
      : (provincia || ciudad || 'En ruta');
    if (resultado !== 'En ruta') cacheNombres.set(key, resultado);
    return resultado;
  } catch {
    return 'En ruta';
  }
}

// Consultar TomTom Traffic Flow para un punto (velocidades y tiempos REALES)
async function consultarFlow(lat: number, lon: number, apiKey: string): Promise<{
  velocidadActual: number;
  velocidadLibre: number;
  demoraSeg: number; // segundos extra reales en el segmento monitoreado
} | null> {
  try {
    const url = `https://api.tomtom.com/traffic/services/4/flowSegmentData/absolute/10/json?point=${lat},${lon}&unit=KMPH&key=${apiKey}`;
    const res = await fetchConTimeout(url, { next: { revalidate: 180 } }, 8000); // cache 3 min
    if (!res || !res.ok) return null;
    const data = await res.json();
    const flow = data.flowSegmentData;
    if (!flow) return null;
    const current = Math.round(flow.currentSpeed ?? 0);
    const libre = Math.round(flow.freeFlowSpeed ?? flow.currentSpeed ?? 80);
    const demoraSeg = Math.max(0, (flow.currentTravelTime ?? 0) - (flow.freeFlowTravelTime ?? 0));
    return { velocidadActual: current, velocidadLibre: libre, demoraSeg };
  } catch {
    return null;
  }
}

// Consultar TomTom Traffic Incidents en un bbox alrededor del punto (datos REALES)
async function consultarIncidentes(lat: number, lon: number, apiKey: string): Promise<Incidente[]> {
  try {
    const delta = 0.15; // ~15km alrededor
    const bbox = `${lon - delta},${lat - delta},${lon + delta},${lat + delta}`;
    const fields = '{incidents{type,properties{iconCategory,magnitudeOfDelay,events{description,code},from,to,delay}}}';
    const url = `https://api.tomtom.com/traffic/services/5/incidentDetails?bbox=${bbox}` +
      `&fields=${encodeURIComponent(fields)}&language=es-ES` +
      `&categoryFilter=0,1,2,3,4,5,6,7,8,9,10,11&timeValidityFilter=present&key=${apiKey}`;
    const res = await fetchConTimeout(url, { next: { revalidate: 180 } }, 8000);
    if (!res || !res.ok) return [];
    const data = await res.json();
    const incidents = data.incidents ?? [];

    const TIPO_MAP: Record<number, { tipo: string; emoji: string }> = {
      0:  { tipo: 'Desconocido',    emoji: '⚠️' },
      1:  { tipo: 'Accidente',      emoji: '🚨' },
      2:  { tipo: 'Niebla',         emoji: '🌫️' },
      3:  { tipo: 'Condición peligrosa', emoji: '⚠️' },
      4:  { tipo: 'Lluvia',         emoji: '🌧️' },
      5:  { tipo: 'Hielo',          emoji: '🧊' },
      6:  { tipo: 'Congestión',     emoji: '🔴' },
      7:  { tipo: 'Carril cerrado', emoji: '🚧' },
      8:  { tipo: 'Ruta cerrada',   emoji: '🚫' },
      9:  { tipo: 'Obras viales',   emoji: '🚧' },
      10: { tipo: 'Clima adverso',  emoji: '⛈️' },
      11: { tipo: 'Vehículo detenido', emoji: '🚙' },
      14: { tipo: 'Accidente',      emoji: '🚨' },
    };

    return incidents.map((inc: any) => {
      const cat = inc.properties?.iconCategory ?? 0;
      const mapped = TIPO_MAP[cat] ?? { tipo: 'Incidente', emoji: '⚠️' };
      const evento = inc.properties?.events?.[0]?.description;
      const from = inc.properties?.from;
      const to = inc.properties?.to;
      // Descripción real con ubicación: "Cerrado — Calle X → Calle Y"
      let descripcion = evento || mapped.tipo;
      if (from && to && from !== to) descripcion += ` — ${from} → ${to}`;
      else if (from) descripcion += ` — ${from}`;
      return {
        tipo: mapped.tipo,
        emoji: mapped.emoji,
        descripcion,
        gravedad: inc.properties?.magnitudeOfDelay ?? 1,
      };
    });
  } catch {
    return [];
  }
}

export async function POST(request: Request) {
  try {
    const { polyline } = await request.json();

    if (!polyline || !Array.isArray(polyline) || polyline.length < 2) {
      return NextResponse.json({ error: 'Polyline inválida' }, { status: 400 });
    }

    // Sin key → NO inventamos nada: informamos que no hay datos en tiempo real
    if (!TOMTOM_KEY) {
      return NextResponse.json({
        disponible: false,
        segmentos: [],
        totalIncidentes: 0,
        demoraTotal: 0,
        tramosConBajaCobertura: 0,
      });
    }

    const PUNTOS = Math.min(8, polyline.length);
    const muestras = muestrarPuntos(polyline, PUNTOS);

    // Geocodificar nombres de los tramos
    const nombres = await Promise.all(
      muestras.map(([lat, lon]) => reversGeocode(lat, lon))
    );

    // Consultar TomTom (flujo + incidentes) en paralelo — todo dato REAL
    const segmentos: SegmentoTrafico[] = await Promise.all(
      muestras.map(async ([lat, lon], i) => {
        const [flow, incidentes] = await Promise.all([
          consultarFlow(lat, lon, TOMTOM_KEY),
          consultarIncidentes(lat, lon, TOMTOM_KEY),
        ]);

        const sinDatos = flow === null;
        const vel = flow?.velocidadActual ?? 0;
        const libre = flow?.velocidadLibre ?? 0;
        const { nivel, emoji, color } = sinDatos
          ? { nivel: 'fluido' as NivelTrafico, emoji: '⚪', color: '#8a8278' }
          : clasificarTrafico(vel, libre);
        const demora = flow ? Math.round(flow.demoraSeg / 60) : 0;

        return {
          lat, lon,
          nombre: nombres[i],
          velocidadActual: vel,
          velocidadLibre: libre,
          nivel,
          emoji,
          color,
          demora,
          incidentes,
          numIncidentes: 0,
          bajaCobertua: sinDatos,
        };
      })
    );

    // Deduplicar incidentes repetidos entre bboxes solapados
    const vistos = new Set<string>();
    for (const seg of segmentos) {
      seg.incidentes = seg.incidentes.filter(inc => {
        const clave = `${inc.tipo}|${inc.descripcion}`;
        if (vistos.has(clave)) return false;
        vistos.add(clave);
        return true;
      });
    }

    // ── Agregación: por TIPO (global) y por ZONA (provincia/ruta) ───────────────
    // Solo contamos incidentes sobre vías RELEVANTES para el camión (rutas,
    // autopistas, accesos, etc.). Los incidentes en calles urbanas menores de las
    // ciudades del corredor se cuentan aparte (incidentesUrbanos) para no alarmar
    // al chofer con ruido que no afecta su ruta principal.
    const tiposGlobal = new Map<string, ResumenTipo>();
    const zonasMap = new Map<string, { zona: string; totalIncidentes: number; tipos: Map<string, ResumenTipo> }>();
    const cortesRaw: CorteRuta[] = [];
    let totalIncidentes = 0;     // incidentes sobre la ruta del camión
    let incidentesUrbanos = 0;   // incidentes en calles urbanas del corredor

    for (const seg of segmentos) {
      let relevantesSeg = 0;
      const zonaNombre = seg.nombre || 'En ruta';
      for (const inc of seg.incidentes) {
        // Ubicación concreta (sin el prefijo del tipo) para evaluar la relevancia
        const ubic = inc.descripcion && inc.descripcion !== inc.tipo
          ? inc.descripcion.replace(inc.tipo, '').replace(/^[\s—:]+/, '').trim()
          : '';

        // Incidente en calle urbana (no sobre ruta/autopista): se cuenta aparte
        if (!VIA_RELEVANTE.test(ubic)) {
          incidentesUrbanos++;
          continue;
        }

        relevantesSeg++;
        totalIncidentes++;

        if (!zonasMap.has(zonaNombre)) {
          zonasMap.set(zonaNombre, { zona: zonaNombre, totalIncidentes: 0, tipos: new Map() });
        }
        const zona = zonasMap.get(zonaNombre)!;

        const g = tiposGlobal.get(inc.tipo) ?? { tipo: inc.tipo, emoji: inc.emoji, cantidad: 0 };
        g.cantidad++;
        tiposGlobal.set(inc.tipo, g);

        zona.totalIncidentes++;
        const z = zona.tipos.get(inc.tipo) ?? { tipo: inc.tipo, emoji: inc.emoji, cantidad: 0 };
        z.cantidad++;
        zona.tipos.set(inc.tipo, z);

        // Cortes de ruta: guardamos la ubicación concreta para que el chofer sepa dónde
        if (TIPOS_CORTE.has(inc.tipo)) {
          cortesRaw.push({
            tipo: inc.tipo,
            emoji: inc.emoji,
            zona: zonaNombre,
            ubicacion: ubic || zonaNombre,
          });
        }
      }
      seg.numIncidentes = relevantesSeg;
    }

    // Deduplicar cortes por ubicación (un mismo cierre puede caer en bboxes solapados)
    const vistosCortes = new Set<string>();
    const cortes: CorteRuta[] = cortesRaw.filter(c => {
      const clave = c.ubicacion.toLowerCase();
      if (vistosCortes.has(clave)) return false;
      vistosCortes.add(clave);
      return true;
    });

    const resumenTipos: ResumenTipo[] = [...tiposGlobal.values()].sort((a, b) => b.cantidad - a.cantidad);
    const zonas: ZonaTrafico[] = [...zonasMap.values()]
      .map(z => ({
        zona: z.zona,
        totalIncidentes: z.totalIncidentes,
        tipos: [...z.tipos.values()].sort((a, b) => b.cantidad - a.cantidad),
      }))
      .sort((a, b) => b.totalIncidentes - a.totalIncidentes);

    // Aligeramos el payload: las tarjetas ya no listan calles (solo el conteo).
    for (const seg of segmentos) {
      seg.incidentes = [];
    }

    return NextResponse.json({
      disponible: true,
      segmentos,
      totalIncidentes,
      demoraTotal: segmentos.reduce((n, s) => n + s.demora, 0),
      tramosConBajaCobertura: segmentos.filter(s => s.bajaCobertua).length,
      resumenTipos,
      zonas,
      cortes,
      incidentesUrbanos,
    });

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
