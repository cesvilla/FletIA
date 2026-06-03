import { NextResponse } from 'next/server';

// Devuelve las localidades por las que pasa la ruta, en orden origen → destino.
// Se llama UNA vez al generar el link compartido; el resultado se guarda en el
// snapshot, así el chofer no dispara ninguna API al abrir.
export const maxDuration = 30;

async function fetchConTimeout(url: string, opts: RequestInit = {}, ms = 7000): Promise<Response | null> {
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

// Caché en memoria (L1) — los nombres no cambian. Coords a ~100m.
const cacheCiudades = new Map<string, string>();

// Saca prefijos administrativos que mete Nominatim (Departamento/Pedanía/Municipio…)
function limpiarNombre(n: string): string {
  return (n || '').replace(/^(departamento|municipio de|municipio|pedan[ií]a|comuna|partido de|distrito)\s+/i, '').trim();
}

async function ciudadEn(lat: number, lon: number): Promise<string> {
  const rlat = lat.toFixed(3), rlon = lon.toFixed(3);
  const key = `${rlat},${rlon}`;
  const c = cacheCiudades.get(key);
  if (c !== undefined) return c;
  try {
    const url = `https://nominatim.openstreetmap.org/reverse?lat=${rlat}&lon=${rlon}&format=json&zoom=10&addressdetails=1`;
    const res = await fetchConTimeout(url, {
      headers: { 'User-Agent': 'FletIA/1.0 (fletia@gmail.com)' },
      next: { revalidate: 60 * 60 * 24 * 30 }, // L2: data-cache de Next (30 días)
    }, 7000);
    if (!res || !res.ok) return '';
    const d = await res.json();
    const a = d.address || {};
    // SOLO localidades reales (city/town/village). Descartamos county/state_district
    // que son divisiones administrativas (departamentos, pedanías), no ciudades.
    const ciudad = limpiarNombre(a.city || a.town || a.village || '');
    if (ciudad) cacheCiudades.set(key, ciudad);
    return ciudad;
  } catch {
    return '';
  }
}

function muestrar(polyline: [number, number][], n: number): [number, number][] {
  if (polyline.length <= n) return polyline;
  const step = Math.floor(polyline.length / n);
  const pts: [number, number][] = [];
  for (let i = 0; i < n; i++) pts.push(polyline[Math.min(i * step, polyline.length - 1)]);
  pts[n - 1] = polyline[polyline.length - 1];
  return pts;
}

export async function POST(request: Request) {
  try {
    const { polyline, origenNombre, destinoNombre } = await request.json();
    if (!Array.isArray(polyline) || polyline.length < 2) {
      return NextResponse.json({ ciudades: [] });
    }

    const N = Math.min(10, polyline.length);
    const pts = muestrar(polyline, N);
    const nombres = await Promise.all(pts.map(([la, lo]) => ciudadEn(la, lo)));

    // Construir lista ordenada, sin repetir (consecutivos o ya presentes)
    const norm = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim();
    const lista: string[] = [];
    const push = (nombre?: string) => {
      const n = (nombre || '').split(',')[0].trim();
      if (!n) return;
      const nn = norm(n);
      if (lista.some(x => norm(x) === nn || norm(x).includes(nn) || nn.includes(norm(x)))) return;
      lista.push(n);
    };

    push(origenNombre);
    for (const n of nombres) push(n);
    push(destinoNombre);

    return NextResponse.json({ ciudades: lista });
  } catch {
    return NextResponse.json({ ciudades: [] });
  }
}
