import { NextResponse } from 'next/server';

// Códigos WMO → descripción + emoji + factor de impacto en combustible
const WMO_CODES: Record<number, { label: string; emoji: string; factor: number }> = {
  0:  { label: 'Despejado',          emoji: '☀️',  factor: 0.00 },
  1:  { label: 'Mayormente despejado', emoji: '🌤️', factor: 0.00 },
  2:  { label: 'Parcialmente nublado', emoji: '⛅', factor: 0.00 },
  3:  { label: 'Nublado',             emoji: '☁️',  factor: 0.00 },
  45: { label: 'Niebla',              emoji: '🌫️', factor: 0.05 },
  48: { label: 'Niebla con escarcha', emoji: '🌫️', factor: 0.07 },
  51: { label: 'Llovizna leve',       emoji: '🌦️', factor: 0.03 },
  53: { label: 'Llovizna moderada',   emoji: '🌦️', factor: 0.05 },
  55: { label: 'Llovizna intensa',    emoji: '🌧️', factor: 0.07 },
  61: { label: 'Lluvia leve',         emoji: '🌧️', factor: 0.05 },
  63: { label: 'Lluvia moderada',     emoji: '🌧️', factor: 0.08 },
  65: { label: 'Lluvia intensa',      emoji: '🌧️', factor: 0.12 },
  71: { label: 'Nieve leve',          emoji: '🌨️', factor: 0.10 },
  73: { label: 'Nieve moderada',      emoji: '❄️',  factor: 0.15 },
  75: { label: 'Nieve intensa',       emoji: '❄️',  factor: 0.20 },
  80: { label: 'Chaparrones',         emoji: '🌦️', factor: 0.07 },
  81: { label: 'Chaparrones moderados', emoji: '🌧️', factor: 0.10 },
  82: { label: 'Chaparrones violentos', emoji: '⛈️', factor: 0.15 },
  85: { label: 'Nevadas',             emoji: '🌨️', factor: 0.15 },
  95: { label: 'Tormenta eléctrica',  emoji: '⛈️', factor: 0.15 },
  96: { label: 'Tormenta con granizo',emoji: '⛈️', factor: 0.18 },
  99: { label: 'Tormenta con granizo fuerte', emoji: '🌩️', factor: 0.20 },
};

function getWMO(code: number, isDay: number | undefined = 1) {
  const wmo = WMO_CODES[code] ?? { label: 'Variable', emoji: '🌡️', factor: 0 };
  if (isDay === 0) {
    if (code === 0) return { ...wmo, emoji: '🌙', label: 'Despejado' };
    if (code === 1) return { ...wmo, emoji: '🌛', label: 'Mayormente despejado' };
    if (code === 2) return { ...wmo, emoji: '☁️', label: 'Parcialmente nublado' };
    if (code === 3) return { ...wmo, emoji: '☁️', label: 'Nublado' };
  }
  return wmo;
}

// Extraer N puntos equidistantes de la polyline
function muestrarPuntos(polyline: [number, number][], n: number): [number, number][] {
  if (polyline.length <= n) return polyline;
  const step = Math.floor(polyline.length / n);
  const puntos: [number, number][] = [];
  for (let i = 0; i < n; i++) {
    puntos.push(polyline[Math.min(i * step, polyline.length - 1)]);
  }
  // Siempre incluir destino final
  puntos[n - 1] = polyline[polyline.length - 1];
  return puntos;
}

// Geocodificación inversa adaptativa según distancia del viaje
// - Ruta larga (>200km): muestra provincia  (zoom 6)
// - Ruta media (80-200km): muestra ciudad + provincia (zoom 8)
// - Ruta corta (<80km): muestra departamento/ciudad (zoom 10)
// - esExtremo=true (origen/destino): SIEMPRE zoom 10 para mostrar el lugar exacto
// Correcciones de nombres que Nominatim devuelve mal
// Correcciones de ciudades que Nominatim devuelve mal
const CORRECCIONES_CIUDAD: Record<string, string> = {
  'san salvador de tucumán': 'San Miguel de Tucumán',
  'san salvador de tucuman': 'San Miguel de Tucumán',
  'ciudad de tucumán': 'San Miguel de Tucumán',
  'san miguel de tucuman': 'San Miguel de Tucumán',
};

function corregirCiudad(ciudad: string): string {
  return CORRECCIONES_CIUDAD[ciudad.toLowerCase().trim()] ?? ciudad;
}

// Caché en memoria de nombres geocodificados (L1, por instancia caliente del server).
// El nombre de un punto no cambia, así que se reutiliza entre requests sin volver a
// pegarle a Nominatim. Evita reventar el rate-limit (hasta 14 puntos por ruta).
const cacheNombres = new Map<string, string>();

async function reversGeocode(lat: number, lon: number, km: number, esExtremo = false): Promise<string> {
  // Origen y destino siempre con máximo detalle (zoom 10) para mostrar el lugar exacto
  const zoom = esExtremo ? 10 : km > 200 ? 6 : km > 80 ? 8 : 10;
  // Redondeamos a ~100m: sube los aciertos de caché y el nombre no cambia a esa escala.
  const rlat = lat.toFixed(3), rlon = lon.toFixed(3);
  const key = `${rlat},${rlon},${zoom}`;
  const cached = cacheNombres.get(key);
  if (cached !== undefined) return cached;

  try {
    const url = `https://nominatim.openstreetmap.org/reverse?lat=${rlat}&lon=${rlon}&format=json&zoom=${zoom}&addressdetails=1`;
    const res = await fetch(url, {
      headers: { 'User-Agent': 'FletIA/1.0 (fletia@gmail.com)' },
      // L2: caché de datos de Next (persistente/compartida entre requests). Un nombre
      // no cambia, así que lo guardamos 30 días.
      next: { revalidate: 60 * 60 * 24 * 30 },
    });
    if (!res.ok) return `${lat.toFixed(1)}, ${lon.toFixed(1)}`;
    const data = await res.json();
    const addr = data.address;
    const provincia = addr?.state;

    let resultado: string;
    // Origen/destino y rutas cortas: mostrar ciudad/departamento con detalle
    if (esExtremo || km <= 80) {
      const ciudadRaw = addr?.city || addr?.town || addr?.village || addr?.county || addr?.state_district;
      const ciudad = ciudadRaw ? corregirCiudad(ciudadRaw) : null;
      resultado = (ciudad && provincia && ciudad !== provincia)
        ? `${ciudad}, ${provincia}`
        : (ciudad || provincia || 'En ruta');
    } else if (km > 200) {
      resultado = provincia || data.display_name?.split(',')[0] || 'En ruta';
    } else {
      // Ruta media (puntos intermedios): ciudad + provincia
      const ciudadRaw = addr?.city || addr?.town || addr?.county || addr?.state_district;
      const ciudad = ciudadRaw ? corregirCiudad(ciudadRaw) : null;
      resultado = (ciudad && provincia && ciudad !== provincia)
        ? `${ciudad}, ${provincia}`
        : (provincia || ciudad || 'En ruta');
    }

    // Solo cacheamos nombres "buenos" (no el fallback genérico).
    if (resultado !== 'En ruta') cacheNombres.set(key, resultado);
    return resultado;

  } catch {
    return 'En ruta';
  }
}

export async function POST(request: Request) {
  try {
    const { polyline, km = 0, origenCoord, destinoCoord } = await request.json();

    if (!polyline || !Array.isArray(polyline) || polyline.length < 2) {
      return NextResponse.json({ error: 'Polyline inválida' }, { status: 400 });
    }

    // Tomar hasta 14 puntos equidistantes para cubrir todas las provincias de la ruta
    const PUNTOS = Math.min(14, polyline.length);
    const muestras = muestrarPuntos(polyline, PUNTOS);

    // Reemplazar primer y último punto con coords exactas del geocodificador
    // Esto garantiza que la temperatura corresponde a la altitud real del lugar
    // (ej: Tafí del Valle a 2000m, no al punto de la polyline en el camino de bajada)
    if (origenCoord?.lat && origenCoord?.lon) {
      muestras[0] = [origenCoord.lat, origenCoord.lon];
    }
    if (destinoCoord?.lat && destinoCoord?.lon) {
      muestras[muestras.length - 1] = [destinoCoord.lat, destinoCoord.lon];
    }

    // Consultar clima y geocode en paralelo para todos los puntos
    const resultados = await Promise.all(
      muestras.map(async ([lat, lon], idx) => {
        const esExtremo = idx === 0 || idx === muestras.length - 1;
        // Origen/destino: usar nombre del geocodificador directamente si está disponible.
        // Lo pasamos por corregirCiudad para arreglar nombres mal puestos (ej. el
        // viejo "San Salvador de Tucumán" → "San Miguel de Tucumán").
        const nombreFijoRaw = esExtremo
          ? (idx === 0 ? origenCoord?.nombre : destinoCoord?.nombre) || null
          : null;
        const nombreFijo = nombreFijoRaw ? corregirCiudad(nombreFijoRaw) : null;
        const [climaRes, nombre] = await Promise.all([
          fetch(
            `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}` +
            `&current=temperature_2m,apparent_temperature,precipitation,windspeed_10m,weathercode,is_day` +
            `&timezone=America%2FArgentina%2FBuenos_Aires`
          ),
          nombreFijo ? Promise.resolve(nombreFijo) : reversGeocode(lat, lon, km, esExtremo),
        ]);

        if (!climaRes.ok) return null;
        const climaData = await climaRes.json();
        const current = climaData.current;

        const isDay = Number(current.is_day);
        const wmo = getWMO(current.weathercode, isDay);
        const viento = current.windspeed_10m as number;
        const lluvia = current.precipitation as number;
        const temp = current.temperature_2m as number;
        const sensacion = (current.apparent_temperature ?? temp) as number;

        // Factor viento adicional
        let factorViento = 0;
        if (viento > 80) factorViento = 0.15;
        else if (viento > 50) factorViento = 0.08;
        else if (viento > 30) factorViento = 0.03;

        const factorTotal = Math.min(wmo.factor + factorViento, 0.25); // máx +25%

        return {
          lat,
          lon,
          nombre,
          temp: Math.round(temp),
          sensacion: Math.round(sensacion),
          lluvia: Math.round(lluvia * 10) / 10,
          viento: Math.round(viento),
          condicion: wmo.label,
          emoji: wmo.emoji,
          factorImpacto: factorTotal,
          impactoPct: Math.round(factorTotal * 100),
        };
      })
    );

    // Filtrar nulos y deduplicar puntos de la misma zona.
    // Dos cards de la misma ciudad aparecían cuando el nombre venía distinto
    // (ej. "Tucumán" de un punto intermedio y "San Miguel de Tucumán" del destino).
    // Deduplicamos por nombre normalizado Y por proximidad (<20 km = misma zona),
    // dando prioridad a origen y destino (que nunca se descartan).
    const todosValidos = resultados.filter(Boolean) as NonNullable<typeof resultados[0]>[];

    const norm = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim();
    const distKm = (a: { lat: number; lon: number }, b: { lat: number; lon: number }) => {
      const R = 6371, toRad = (d: number) => (d * Math.PI) / 180;
      const dLat = toRad(b.lat - a.lat), dLon = toRad(b.lon - a.lon);
      const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLon / 2) ** 2;
      return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
    };

    const ultimoIdx = todosValidos.length - 1;
    // Prioridad: origen y destino primero, luego intermedios en orden de ruta.
    const ordenPrioridad = [
      ...(todosValidos.length > 0 ? [0] : []),
      ...(ultimoIdx > 0 ? [ultimoIdx] : []),
      ...todosValidos.map((_, i) => i).filter(i => i !== 0 && i !== ultimoIdx),
    ];

    const MISMA_ZONA_KM = 30;
    // ¿Son el mismo lugar? mismo nombre, muy cerca, o un nombre contiene al otro
    // (ej. "Tucumán" ⊂ "San Miguel de Tucumán" = la provincia y su capital).
    const mismoLugar = (a: { nombre: string; lat: number; lon: number }, b: { nombre: string; lat: number; lon: number }) => {
      const na = norm(a.nombre), nb = norm(b.nombre);
      if (na === nb) return true;
      if (na.length >= 4 && nb.length >= 4 && (na.includes(nb) || nb.includes(na))) return true;
      return distKm(a, b) < MISMA_ZONA_KM;
    };

    const elegidos: typeof todosValidos = [];
    for (const i of ordenPrioridad) {
      const p = todosValidos[i];
      const dupIdx = elegidos.findIndex(k => mismoLugar(k, p));
      if (dupIdx === -1) {
        elegidos.push(p);
      } else if (norm(p.nombre).length < norm(elegidos[dupIdx].nombre).length) {
        // Misma zona ya presente: nos quedamos con el nombre más corto/general
        // (la provincia "Tucumán" en vez de "San Miguel de Tucumán"),
        // manteniendo el clima del punto que ya teníamos.
        elegidos[dupIdx] = { ...elegidos[dupIdx], nombre: p.nombre };
      }
    }
    // Reordenar para mostrar de origen a destino
    const puntos = elegidos.sort((a, b) => todosValidos.indexOf(a) - todosValidos.indexOf(b));

    // Factor climático máximo de toda la ruta (el peor tramo manda)
    const factorMaximo = puntos.reduce((max, p) => Math.max(max, p.factorImpacto), 0);
    const alertas = puntos.filter(p => p.factorImpacto > 0);

    return NextResponse.json({
      puntos,
      factorMaximo: Math.round(factorMaximo * 100) / 100,
      impactoMaximoPct: Math.round(factorMaximo * 100),
      tieneAlertas: alertas.length > 0,
    });

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
