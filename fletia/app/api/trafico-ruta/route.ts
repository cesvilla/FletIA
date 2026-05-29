import { NextResponse } from 'next/server';

const TOMTOM_KEY = process.env.TOMTOM_API_KEY;

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
  bajaCobertua: boolean;    // true si TomTom no tiene datos de flujo del tramo
}

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

// Geocodificación inversa simple para nombrar los segmentos
async function reversGeocode(lat: number, lon: number): Promise<string> {
  try {
    const url = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json&zoom=8&addressdetails=1`;
    const res = await fetch(url, {
      headers: { 'User-Agent': 'FletIA/1.0 (fletia@gmail.com)' },
    });
    if (!res.ok) return 'En ruta';
    const data = await res.json();
    const addr = data.address;
    const ciudad = addr?.city || addr?.town || addr?.county || addr?.state_district;
    const provincia = addr?.state;
    if (ciudad && provincia && ciudad !== provincia) return `${ciudad}, ${provincia}`;
    return provincia || ciudad || 'En ruta';
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
    const res = await fetch(url, { next: { revalidate: 180 } }); // cache 3 min
    if (!res.ok) return null;
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
    const res = await fetch(url, { next: { revalidate: 180 } });
    if (!res.ok) return [];
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

    const PUNTOS = Math.min(6, polyline.length);
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
          bajaCobertua: sinDatos,
        };
      })
    );

    // Deduplicar incidentes repetidos entre bboxes solapados
    const vistos = new Set<string>();
    let totalIncidentes = 0;
    for (const seg of segmentos) {
      seg.incidentes = seg.incidentes.filter(inc => {
        const clave = `${inc.tipo}|${inc.descripcion}`;
        if (vistos.has(clave)) return false;
        vistos.add(clave);
        return true;
      });
      totalIncidentes += seg.incidentes.length;
    }

    return NextResponse.json({
      disponible: true,
      segmentos,
      totalIncidentes,
      demoraTotal: segmentos.reduce((n, s) => n + s.demora, 0),
      tramosConBajaCobertura: segmentos.filter(s => s.bajaCobertua).length,
    });

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
