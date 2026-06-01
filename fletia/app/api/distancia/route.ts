import { NextResponse } from 'next/server';
import { calcularPeajesEnRuta } from '@/lib/peajes-ar';

// Permitir hasta 30s en Vercel (rutas largas con ORS/OSRM pueden tardar)
export const maxDuration = 30;

// fetch con timeout: si el servicio externo no responde, abortamos y seguimos
// con el fallback en vez de colgar toda la petición.
async function fetchConTimeout(
  url: string,
  opts: RequestInit = {},
  ms = 9000
): Promise<Response | null> {
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

// ─── Coordenadas exactas de capitales y ciudades principales de Argentina ───────
// Nominatim a veces devuelve la provincia en lugar de la capital, lo que genera
// rutas erróneas. Este diccionario garantiza las coordenadas correctas.
const CIUDADES_AR: Record<string, { lat: number; lon: number; nombre: string }> = {
  'tucuman':                           { lat: -26.8241, lon: -65.2226, nombre: 'San Miguel de Tucumán' },
  'san salvador de tucuman':           { lat: -26.8241, lon: -65.2226, nombre: 'San Miguel de Tucumán' },
  'jujuy':                             { lat: -24.1858, lon: -65.2995, nombre: 'San Salvador de Jujuy' },
  'san salvador de jujuy':             { lat: -24.1858, lon: -65.2995, nombre: 'San Salvador de Jujuy' },
  'salta':                             { lat: -24.7821, lon: -65.4232, nombre: 'Salta' },
  'cordoba':                           { lat: -31.4201, lon: -64.1888, nombre: 'Córdoba' },
  'buenos aires':                      { lat: -34.6037, lon: -58.3816, nombre: 'Buenos Aires' },
  'caba':                              { lat: -34.6037, lon: -58.3816, nombre: 'Buenos Aires' },
  'capital federal':                   { lat: -34.6037, lon: -58.3816, nombre: 'Buenos Aires' },
  'mendoza':                           { lat: -32.8908, lon: -68.8272, nombre: 'Mendoza' },
  'rosario':                           { lat: -32.9468, lon: -60.6893, nombre: 'Rosario' },
  'santa fe':                          { lat: -31.6333, lon: -60.7000, nombre: 'Santa Fe' },
  'mar del plata':                     { lat: -38.0023, lon: -57.5575, nombre: 'Mar del Plata' },
  'san juan':                          { lat: -31.5375, lon: -68.5364, nombre: 'San Juan' },
  'la plata':                          { lat: -34.9214, lon: -57.9545, nombre: 'La Plata' },
  'san luis':                          { lat: -33.3000, lon: -66.3500, nombre: 'San Luis' },
  'catamarca':                         { lat: -28.4696, lon: -65.7795, nombre: 'Catamarca' },
  'san fernando del valle de catamarca': { lat: -28.4696, lon: -65.7795, nombre: 'Catamarca' },
  'la rioja':                          { lat: -29.4131, lon: -66.8560, nombre: 'La Rioja' },
  'santiago del estero':               { lat: -27.7951, lon: -64.2615, nombre: 'Santiago del Estero' },
  'resistencia':                       { lat: -27.4514, lon: -58.9862, nombre: 'Resistencia' },
  'corrientes':                        { lat: -27.4692, lon: -58.8306, nombre: 'Corrientes' },
  'posadas':                           { lat: -27.3671, lon: -55.8963, nombre: 'Posadas' },
  'formosa':                           { lat: -26.1775, lon: -58.1781, nombre: 'Formosa' },
  'neuquen':                           { lat: -38.9516, lon: -68.0591, nombre: 'Neuquén' },
  'neuquén':                           { lat: -38.9516, lon: -68.0591, nombre: 'Neuquén' },
  'viedma':                            { lat: -40.8135, lon: -62.9967, nombre: 'Viedma' },
  'rawson':                            { lat: -43.3002, lon: -65.1023, nombre: 'Rawson' },
  'comodoro rivadavia':                { lat: -45.8647, lon: -67.4997, nombre: 'Comodoro Rivadavia' },
  'rio gallegos':                      { lat: -51.6230, lon: -69.2168, nombre: 'Río Gallegos' },
  'río gallegos':                      { lat: -51.6230, lon: -69.2168, nombre: 'Río Gallegos' },
  'ushuaia':                           { lat: -54.8019, lon: -68.3029, nombre: 'Ushuaia' },
  'bariloche':                         { lat: -41.1456, lon: -71.3082, nombre: 'Bariloche' },
  'san carlos de bariloche':           { lat: -41.1456, lon: -71.3082, nombre: 'Bariloche' },
  'parana':                            { lat: -31.7333, lon: -60.5333, nombre: 'Paraná' },
  'paraná':                            { lat: -31.7333, lon: -60.5333, nombre: 'Paraná' },
  'concordia':                         { lat: -31.3928, lon: -58.0204, nombre: 'Concordia' },
  'bahia blanca':                      { lat: -38.7183, lon: -62.2661, nombre: 'Bahía Blanca' },
  'bahía blanca':                      { lat: -38.7183, lon: -62.2661, nombre: 'Bahía Blanca' },
  'san miguel de tucuman':             { lat: -26.8241, lon: -65.2226, nombre: 'San Miguel de Tucumán' },
  'villa maria':                       { lat: -32.4072, lon: -63.2397, nombre: 'Villa María' },
  'villa maría':                       { lat: -32.4072, lon: -63.2397, nombre: 'Villa María' },
  'rio cuarto':                        { lat: -33.1307, lon: -64.3499, nombre: 'Río Cuarto' },
  'río cuarto':                        { lat: -33.1307, lon: -64.3499, nombre: 'Río Cuarto' },
  'san rafael':                        { lat: -34.6177, lon: -68.3301, nombre: 'San Rafael' },
  'neuquen capital':                   { lat: -38.9516, lon: -68.0591, nombre: 'Neuquén' },
};

function normalizarCiudad(nombre: string): string {
  return nombre.toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .trim();
}

async function geocodificar(lugar: string): Promise<{ lat: number; lon: number; nombre: string } | null> {
  // 1. Buscar en diccionario local primero (evita errores de Nominatim con provincias)
  const clave = normalizarCiudad(lugar);
  if (CIUDADES_AR[clave]) return CIUDADES_AR[clave];

  // 2. Fallback a Nominatim para localidades no cubiertas
  const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(lugar + ', Argentina')}&format=json&limit=5&addressdetails=1&countrycodes=ar`;
  const res = await fetchConTimeout(url, { headers: { 'User-Agent': 'FletIA/1.0 (fletia@gmail.com)' } }, 7000);
  if (!res || !res.ok) return null;
  const data = await res.json();
  if (!data.length) return null;

  // Priorizar resultado que tenga ciudad concreta (no provincia)
  const conCiudad = data.find((r: any) =>
    r.addresstype === 'city' || r.addresstype === 'town' ||
    r.address?.city || r.address?.town || r.address?.village
  );
  const elegido = conCiudad || data[0];

  return {
    lat: parseFloat(elegido.lat),
    lon: parseFloat(elegido.lon),
    nombre: elegido.display_name.split(',').slice(0, 2).join(',').trim(),
  };
}

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function decodificarPolyline(encoded: string): [number, number][] {
  const coords: [number, number][] = [];
  let index = 0, lat = 0, lng = 0;
  while (index < encoded.length) {
    let b, shift = 0, result = 0;
    do { b = encoded.charCodeAt(index++) - 63; result |= (b & 0x1f) << shift; shift += 5; } while (b >= 0x20);
    lat += result & 1 ? ~(result >> 1) : result >> 1;
    shift = 0; result = 0;
    do { b = encoded.charCodeAt(index++) - 63; result |= (b & 0x1f) << shift; shift += 5; } while (b >= 0x20);
    lng += result & 1 ? ~(result >> 1) : result >> 1;
    coords.push([lat / 1e5, lng / 1e5]);
  }
  return coords;
}

// Tipo para una ruta calculada
interface RutaCalculada {
  km: number;
  polyline: [number, number][];
  duracionMin?: number; // duración estimada en minutos
}

// OpenRouteService — perfil driving-hgv (camiones pesados), más preciso para Argentina.
// Una request = una ruta según la preferencia (recommended/shortest/fastest).
// NOTA: el parámetro `alternative_routes` de ORS sólo funciona para rutas ≤100km,
// por eso usamos variaciones de `preference` que no tienen límite de distancia.
async function calcularRutaORS(
  origen: { lat: number; lon: number },
  destino: { lat: number; lon: number },
  apiKey: string,
  preference: 'recommended' | 'shortest' | 'fastest' = 'recommended'
): Promise<RutaCalculada | null> {
  const res = await fetchConTimeout('https://api.openrouteservice.org/v2/directions/driving-hgv/geojson', {
    method: 'POST',
    headers: {
      'Authorization': apiKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      coordinates: [
        [origen.lon, origen.lat],
        [destino.lon, destino.lat],
      ],
      preference,
    }),
  }, 12000);
  if (!res || !res.ok) return null;
  const data = await res.json();
  const feature = data.features?.[0];
  if (!feature) return null;

  const distanciaM: number = feature.properties.summary.distance;
  const duracionS: number = feature.properties.summary.duration;
  const km = Math.round(distanciaM / 1000);
  const duracionMin = Math.round(duracionS / 60);

  // GeoJSON coordinates vienen como [lon, lat] — invertir a [lat, lon] para Leaflet
  const polyline: [number, number][] = feature.geometry.coordinates.map(
    ([lon, lat]: [number, number]) => [lat, lon]
  );

  return { km, polyline, duracionMin };
}

// OSRM — fallback gratuito sin key, con alternativas
async function calcularRutaOSRM(
  origen: { lat: number; lon: number },
  destino: { lat: number; lon: number }
): Promise<RutaCalculada[] | null> {
  const url = `https://router.project-osrm.org/route/v1/driving/${origen.lon},${origen.lat};${destino.lon},${destino.lat}?overview=full&geometries=polyline&alternatives=3`;
  const res = await fetchConTimeout(url, { headers: { 'User-Agent': 'FletIA/1.0 (fletia@gmail.com)' } }, 12000);
  if (!res || !res.ok) return null;
  const data = await res.json();
  if (data.code !== 'Ok' || !data.routes?.length) return null;

  return data.routes.map((route: any) => ({
    km: Math.round(route.distance / 1000),
    polyline: decodificarPolyline(route.geometry),
    duracionMin: Math.round(route.duration / 60),
  }));
}

export async function POST(request: Request) {
  try {
    const { origen, destino } = await request.json();
    if (!origen?.trim() || !destino?.trim()) {
      return NextResponse.json({ error: 'Origen y destino son requeridos' }, { status: 400 });
    }

    const [coordOrigen, coordDestino] = await Promise.all([
      geocodificar(origen.trim()),
      geocodificar(destino.trim()),
    ]);

    if (!coordOrigen) {
      return NextResponse.json({ error: `No encontramos "${origen}". Probá con ciudad o provincia.` }, { status: 422 });
    }
    if (!coordDestino) {
      return NextResponse.json({ error: `No encontramos "${destino}". Probá con ciudad o provincia.` }, { status: 422 });
    }

    const orsKey = process.env.ORS_API_KEY;
    let rutas: RutaCalculada[] | null = null;
    let motor = orsKey ? 'ors-hgv' : 'osrm';

    if (orsKey) {
      // Pedimos en paralelo la ruta recomendada y la más corta. Como `preference`
      // no tiene límite de distancia, esto funciona para viajes de cualquier largo.
      const [recomendada, corta] = await Promise.all([
        calcularRutaORS(coordOrigen, coordDestino, orsKey, 'recommended'),
        calcularRutaORS(coordOrigen, coordDestino, orsKey, 'shortest'),
      ]);

      if (recomendada) {
        rutas = [recomendada];
        // Agregamos la "más corta" si es realmente distinta: diferencia notable en
        // km (>1%) o en duración (>10%). Así detectamos rutas físicamente distintas
        // aunque tengan kilometraje parecido.
        if (corta) {
          const difKm = Math.abs(corta.km - recomendada.km) / recomendada.km;
          const difMin =
            recomendada.duracionMin && corta.duracionMin
              ? Math.abs(corta.duracionMin - recomendada.duracionMin) / recomendada.duracionMin
              : 0;
          if (difKm > 0.01 || difMin > 0.1) {
            rutas.push(corta);
          }
        }
      } else if (corta) {
        rutas = [corta];
      }
    }

    // Fallback a OSRM si no hay key o si ORS falla
    if (!rutas) {
      rutas = await calcularRutaOSRM(coordOrigen, coordDestino);
      if (rutas) motor = 'osrm';
    }

    // Último recurso: estimación por línea recta × factor de ruta (1.25).
    // Garantiza un resultado funcional aunque los servicios de ruteo no respondan.
    if (!rutas) {
      const kmRecta = haversineKm(coordOrigen.lat, coordOrigen.lon, coordDestino.lat, coordDestino.lon);
      const km = Math.round(kmRecta * 1.25);
      rutas = [{
        km,
        polyline: [
          [coordOrigen.lat, coordOrigen.lon],
          [coordDestino.lat, coordDestino.lon],
        ],
      }];
      motor = 'estimado';
    }

    // Ruta principal (la más óptima)
    const principal = rutas[0];
    const peajes = calcularPeajesEnRuta(principal.polyline);

    // Rutas alternativas con peajes pre-calculados
    const rutasAlternativas = rutas.length > 1
      ? rutas.slice(1).map(r => ({
          km: r.km,
          polyline: r.polyline,
          duracionMin: r.duracionMin,
          peajes: calcularPeajesEnRuta(r.polyline),
        }))
      : [];

    return NextResponse.json({
      // Campos principales (retrocompatibles)
      km: principal.km,
      polyline: principal.polyline,
      duracionMin: principal.duracionMin,
      origen: { lat: coordOrigen.lat, lon: coordOrigen.lon, nombre: coordOrigen.nombre },
      destino: { lat: coordDestino.lat, lon: coordDestino.lon, nombre: coordDestino.nombre },
      motor,
      peajes,
      // Rutas alternativas (nuevo)
      rutasAlternativas,
    });

  } catch {
    return NextResponse.json({ error: 'Error interno al calcular distancia.' }, { status: 500 });
  }
}
