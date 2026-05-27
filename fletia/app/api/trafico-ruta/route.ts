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
  demora: number;           // minutos extra estimados
  incidentes: Incidente[];
  bajaCobertua: boolean;    // true si TomTom no tiene datos reales del tramo
}

interface Incidente {
  tipo: string;
  emoji: string;
  descripcion: string;
  gravedad: number; // 1-4
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

// Consultar TomTom Traffic Flow para un punto
async function consultarFlow(lat: number, lon: number, apiKey: string): Promise<{
  velocidadActual: number;
  velocidadLibre: number;
} | null> {
  try {
    const url = `https://api.tomtom.com/traffic/services/4/flowSegmentData/absolute/10/json?point=${lat},${lon}&unit=KMPH&key=${apiKey}`;
    const res = await fetch(url, { next: { revalidate: 300 } }); // cache 5 min
    if (!res.ok) return null;
    const data = await res.json();
    const flow = data.flowSegmentData;
    if (!flow) return null;
    return {
      velocidadActual: Math.round(flow.currentSpeed ?? 0),
      velocidadLibre: Math.round(flow.freeFlowSpeed ?? flow.currentSpeed ?? 80),
    };
  } catch {
    return null;
  }
}

// Consultar TomTom Traffic Incidents en un bbox alrededor del punto
async function consultarIncidentes(lat: number, lon: number, apiKey: string): Promise<Incidente[]> {
  try {
    const delta = 0.15; // ~15km alrededor
    const bbox = `${lon - delta},${lat - delta},${lon + delta},${lat + delta}`;
    const url = `https://api.tomtom.com/traffic/services/5/incidentDetails?bbox=${bbox}&fields={incidents{type,geometry{type,coordinates},properties{id,iconCategory,magnitudeOfDelay,events{description,code,iconCategory},startTime,endTime,from,to,length,delay,roadNumbers,timeValidity}}}&language=es-419&t=1111&categoryFilter=0,1,2,3,4,5,6,7,8,9,10,11&timeValidityFilter=present&key=${apiKey}`;
    const res = await fetch(url, { next: { revalidate: 300 } });
    if (!res.ok) return [];
    const data = await res.json();
    const incidents = data.incidents ?? [];

    const TIPO_MAP: Record<number, { tipo: string; emoji: string }> = {
      0:  { tipo: 'Desconocido',    emoji: '⚠️' },
      1:  { tipo: 'Accidente',      emoji: '🚨' },
      2:  { tipo: 'Niebla',         emoji: '🌫️' },
      3:  { tipo: 'Hielo',          emoji: '🧊' },
      4:  { tipo: 'Lluvia',         emoji: '🌧️' },
      5:  { tipo: 'Viento',         emoji: '💨' },
      6:  { tipo: 'Congestión',     emoji: '🔴' },
      7:  { tipo: 'Obras viales',   emoji: '🚧' },
      8:  { tipo: 'Ruta cortada',   emoji: '🚫' },
      9:  { tipo: 'Peligro',        emoji: '⚠️' },
      10: { tipo: 'Clima adverso',  emoji: '⛈️' },
      11: { tipo: 'Congestión',     emoji: '🔴' },
    };

    return incidents.slice(0, 3).map((inc: any) => {
      const cat = inc.properties?.iconCategory ?? 0;
      const mapped = TIPO_MAP[cat] ?? { tipo: 'Incidente', emoji: '⚠️' };
      const desc = inc.properties?.events?.[0]?.description
        || inc.properties?.from
        || mapped.tipo;
      return {
        tipo: mapped.tipo,
        emoji: mapped.emoji,
        descripcion: desc,
        gravedad: inc.properties?.magnitudeOfDelay ?? 1,
      };
    });
  } catch {
    return [];
  }
}

// Datos de demostración cuando no hay key activa
function datosDemo(puntos: [number, number][], nombres: string[]): SegmentoTrafico[] {
  const escenarios: { vel: number; libre: number; incidentes: Incidente[] }[] = [
    { vel: 95, libre: 110, incidentes: [] },
    { vel: 70, libre: 110, incidentes: [{ tipo: 'Obras viales', emoji: '🚧', descripcion: 'Obras en calzada — carril derecho cerrado', gravedad: 2 }] },
    { vel: 110, libre: 110, incidentes: [] },
    { vel: 40, libre: 100, incidentes: [{ tipo: 'Accidente', emoji: '🚨', descripcion: 'Colisión en banquina — precaución', gravedad: 3 }] },
    { vel: 90, libre: 110, incidentes: [] },
  ];

  return puntos.map(([lat, lon], i) => {
    const esc = escenarios[i % escenarios.length];
    const { nivel, emoji, color } = clasificarTrafico(esc.vel, esc.libre);
    const demora = esc.incidentes.length > 0
      ? Math.round(((esc.libre - esc.vel) / esc.libre) * 20)
      : 0;
    return {
      lat, lon,
      nombre: nombres[i] || `Tramo ${i + 1}`,
      velocidadActual: esc.vel,
      velocidadLibre: esc.libre,
      nivel,
      emoji,
      color,
      demora,
      incidentes: esc.incidentes,
      bajaCobertua: false,
    };
  });
}

export async function POST(request: Request) {
  try {
    const { polyline, km = 0 } = await request.json();

    if (!polyline || !Array.isArray(polyline) || polyline.length < 2) {
      return NextResponse.json({ error: 'Polyline inválida' }, { status: 400 });
    }

    const PUNTOS = Math.min(5, polyline.length);
    const muestras = muestrarPuntos(polyline, PUNTOS);

    // Geocodificar nombres de los tramos
    const nombres = await Promise.all(
      muestras.map(([lat, lon]) => reversGeocode(lat, lon))
    );

    // Sin key activa → devolver demo para mostrar UI
    if (!TOMTOM_KEY) {
      const segmentos = datosDemo(muestras, nombres);
      return NextResponse.json({
        segmentos,
        totalIncidentes: segmentos.reduce((n, s) => n + s.incidentes.length, 0),
        demoraTotal: segmentos.reduce((n, s) => n + s.demora, 0),
        esDemo: true,
      });
    }

    // Con key activa → consultar TomTom en paralelo
    const segmentos: SegmentoTrafico[] = await Promise.all(
      muestras.map(async ([lat, lon], i) => {
        const [flow, incidentes] = await Promise.all([
          consultarFlow(lat, lon, TOMTOM_KEY),
          consultarIncidentes(lat, lon, TOMTOM_KEY),
        ]);

        const sinDatos = flow === null;
        const vel = flow?.velocidadActual ?? 80;
        const libre = flow?.velocidadLibre ?? 90;
        const { nivel, emoji, color } = clasificarTrafico(vel, libre);
        const demora = incidentes.length > 0
          ? Math.round(((libre - vel) / libre) * 25)
          : Math.max(0, Math.round(((libre - vel) / libre) * 15));

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

    return NextResponse.json({
      segmentos,
      totalIncidentes: segmentos.reduce((n, s) => n + s.incidentes.length, 0),
      demoraTotal: segmentos.reduce((n, s) => n + s.demora, 0),
      tramosConBajaCobertura: segmentos.filter(s => s.bajaCobertua).length,
      esDemo: false,
    });

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
