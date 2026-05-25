import { NextResponse } from 'next/server';

async function geocodificar(lugar: string): Promise<{ lat: number; lon: number; nombre: string } | null> {
  // Pedimos varios resultados y priorizamos ciudad sobre provincia/departamento
  const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(lugar + ', Argentina')}&format=json&limit=5&addressdetails=1&countrycodes=ar`;
  const res = await fetch(url, { headers: { 'User-Agent': 'FletIA/1.0 (fletia@gmail.com)' } });
  if (!res.ok) return null;
  const data = await res.json();
  if (!data.length) return null;

  // Priorizar resultado que tiene una ciudad concreta en su address
  const conCiudad = data.find((r: any) =>
    r.address?.city || r.address?.town || r.address?.village || r.type === 'city'
  );
  const elegido = conCiudad || data[0];

  return {
    lat: parseFloat(elegido.lat),
    lon: parseFloat(elegido.lon),
    nombre: elegido.display_name.split(',').slice(0, 2).join(',').trim(),
  };
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

// OpenRouteService — perfil driving-hgv (camiones pesados), más preciso para Argentina
async function calcularRutaORS(
  origen: { lat: number; lon: number },
  destino: { lat: number; lon: number },
  apiKey: string
): Promise<{ km: number; polyline: [number, number][] } | null> {
  const res = await fetch('https://api.openrouteservice.org/v2/directions/driving-hgv/geojson', {
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
    }),
  });
  if (!res.ok) return null;
  const data = await res.json();
  const feature = data.features?.[0];
  if (!feature) return null;

  const distanciaM: number = feature.properties.summary.distance;
  const km = Math.round(distanciaM / 1000);

  // GeoJSON coordinates vienen como [lon, lat] — invertir a [lat, lon] para Leaflet
  const polyline: [number, number][] = feature.geometry.coordinates.map(
    ([lon, lat]: [number, number]) => [lat, lon]
  );

  return { km, polyline };
}

// OSRM — fallback gratuito sin key
async function calcularRutaOSRM(
  origen: { lat: number; lon: number },
  destino: { lat: number; lon: number }
): Promise<{ km: number; polyline: [number, number][] } | null> {
  const url = `https://router.project-osrm.org/route/v1/driving/${origen.lon},${origen.lat};${destino.lon},${destino.lat}?overview=full&geometries=polyline`;
  const res = await fetch(url, { headers: { 'User-Agent': 'FletIA/1.0 (fletia@gmail.com)' } });
  if (!res.ok) return null;
  const data = await res.json();
  if (data.code !== 'Ok' || !data.routes?.length) return null;
  const km = Math.round(data.routes[0].distance / 1000);
  const polyline = decodificarPolyline(data.routes[0].geometry);
  return { km, polyline };
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
    let resultado: { km: number; polyline: [number, number][] } | null = null;

    if (orsKey) {
      resultado = await calcularRutaORS(coordOrigen, coordDestino, orsKey);
    }

    // Fallback a OSRM si no hay key o si ORS falla
    if (!resultado) {
      resultado = await calcularRutaOSRM(coordOrigen, coordDestino);
    }

    if (!resultado) {
      return NextResponse.json({ error: 'No se encontró ruta entre esos puntos.' }, { status: 422 });
    }

    return NextResponse.json({
      km: resultado.km,
      polyline: resultado.polyline,
      origen: { lat: coordOrigen.lat, lon: coordOrigen.lon, nombre: coordOrigen.nombre },
      destino: { lat: coordDestino.lat, lon: coordDestino.lon, nombre: coordDestino.nombre },
      motor: orsKey ? 'ors-hgv' : 'osrm',
    });

  } catch {
    return NextResponse.json({ error: 'Error interno al calcular distancia.' }, { status: 500 });
  }
}
