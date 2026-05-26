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

function getWMO(code: number) {
  return WMO_CODES[code] ?? { label: 'Variable', emoji: '🌡️', factor: 0 };
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

// Geocodificación inversa para obtener ciudad/provincia del punto
async function reversGeocode(lat: number, lon: number): Promise<string> {
  try {
    const url = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json&zoom=10&addressdetails=1`;
    const res = await fetch(url, {
      headers: { 'User-Agent': 'FletIA/1.0 (fletia@gmail.com)' },
    });
    if (!res.ok) return `${lat.toFixed(1)}, ${lon.toFixed(1)}`;
    const data = await res.json();
    const addr = data.address;
    const ciudad = addr?.city || addr?.town || addr?.village || addr?.county || addr?.state_district;
    const provincia = addr?.state;
    if (ciudad && provincia) return `${ciudad}, ${provincia}`;
    if (provincia) return provincia;
    return data.display_name?.split(',').slice(0, 2).join(',') ?? 'En ruta';
  } catch {
    return 'En ruta';
  }
}

export async function POST(request: Request) {
  try {
    const { polyline } = await request.json();

    if (!polyline || !Array.isArray(polyline) || polyline.length < 2) {
      return NextResponse.json({ error: 'Polyline inválida' }, { status: 400 });
    }

    // Tomar hasta 5 puntos equidistantes de la ruta (origen, ~25%, ~50%, ~75%, destino)
    const PUNTOS = Math.min(5, polyline.length);
    const muestras = muestrarPuntos(polyline, PUNTOS);

    // Consultar clima y geocode en paralelo para todos los puntos
    const resultados = await Promise.all(
      muestras.map(async ([lat, lon]) => {
        const [climaRes, nombre] = await Promise.all([
          fetch(
            `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}` +
            `&current=temperature_2m,precipitation,windspeed_10m,weathercode` +
            `&timezone=America%2FArgentina%2FBuenos_Aires`
          ),
          reversGeocode(lat, lon),
        ]);

        if (!climaRes.ok) return null;
        const climaData = await climaRes.json();
        const current = climaData.current;

        const wmo = getWMO(current.weathercode);
        const viento = current.windspeed_10m as number;
        const lluvia = current.precipitation as number;
        const temp = current.temperature_2m as number;

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
          lluvia: Math.round(lluvia * 10) / 10,
          viento: Math.round(viento),
          condicion: wmo.label,
          emoji: wmo.emoji,
          factorImpacto: factorTotal,
          impactoPct: Math.round(factorTotal * 100),
        };
      })
    );

    const puntos = resultados.filter(Boolean);

    // Factor climático máximo de toda la ruta (el peor tramo manda)
    const factorMaximo = puntos.reduce((max, p) => Math.max(max, p!.factorImpacto), 0);
    const alertas = puntos.filter(p => p!.factorImpacto > 0);

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
