// ─── Orden y dedupe de tarjetas de clima de una ruta ────────────────────────
//
// Por qué existe esto: /api/clima-ruta consulta el clima en hasta 14 puntos
// equidistantes de la ruta (origen, destino e intermedios). Dos de esos puntos
// pueden caer en la misma zona y volver con nombres distintos del geocodificador
// (ej. "Tucumán" de un punto intermedio y "San Miguel de Tucumán" del destino),
// generando tarjetas duplicadas. Este módulo deduplica esos puntos y los
// devuelve SIEMPRE en orden de ruta: origen primero, destino último.
//
// Dos puntos son "el mismo lugar" si:
//   • tienen el mismo nombre normalizado, o
//   • un nombre contiene al otro (≥4 chars: "Tucumán" ⊂ "San Miguel de Tucumán"), o
//   • están a menos de MISMA_ZONA_KM km (misma zona).
// Al fusionar se conserva el nombre más corto/general y el clima del punto que
// ya estaba. Origen y destino tienen prioridad (se procesan primero), así que un
// intermedio cercano se fusiona DENTRO del extremo y nunca lo desplaza.
//
// El bug que motivó extraer esto (commit b93f010): el orden final usaba
// `indexOf` sobre la lista original, pero el dedupe reemplaza objetos por copias
// nuevas (spread), así que `indexOf` devolvía -1 y mandaba el destino al
// principio (un viaje Tucumán → Misiones mostraba Misiones en la primera
// tarjeta). Se arregla anotando el índice de ruta (`orden`) ANTES de deduplicar
// y ordenando por ese número.
//
// Módulo 100% puro (sin I/O) para que sea testeable y aislado del handler HTTP.

export interface PuntoClima {
  lat: number;
  lon: number;
  nombre: string;
  temp: number;
  sensacion: number;
  lluvia: number;
  viento: number;
  condicion: string;
  emoji: string;
  factorImpacto: number;
  impactoPct: number;
}

// Punto con el índice de ruta anotado. Es un detalle interno: se usa para
// reordenar tras el dedupe sin depender de la identidad de los objetos.
type PuntoConOrden = PuntoClima & { orden: number };

export const MISMA_ZONA_KM = 30;

// Nombre en minúsculas, sin acentos ni espacios sobrantes, para comparar.
const norm = (s: string) =>
  s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim();

// Distancia en km entre dos coordenadas (haversine).
function distKm(a: { lat: number; lon: number }, b: { lat: number; lon: number }): number {
  const R = 6371, toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat), dLon = toRad(b.lon - a.lon);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}

// ¿Son el mismo lugar? mismo nombre, muy cerca, o un nombre contiene al otro
// (ej. "Tucumán" ⊂ "San Miguel de Tucumán" = la provincia y su capital).
function mismoLugar(
  a: { nombre: string; lat: number; lon: number },
  b: { nombre: string; lat: number; lon: number },
): boolean {
  const na = norm(a.nombre), nb = norm(b.nombre);
  if (na === nb) return true;
  if (na.length >= 4 && nb.length >= 4 && (na.includes(nb) || nb.includes(na))) return true;
  return distKm(a, b) < MISMA_ZONA_KM;
}

/**
 * Deduplica puntos de clima de la misma zona y los devuelve en orden de ruta
 * (origen primero, destino último). No muta la entrada.
 *
 * @param puntos Puntos válidos en orden de ruta: índice 0 = origen, último = destino.
 */
export function ordenarYDeduplicarPuntos(puntos: PuntoClima[]): PuntoClima[] {
  // Anotamos el orden de ruta ANTES de deduplicar, para poder reordenar al final
  // sin depender de la identidad de los objetos (ver nota del bug arriba).
  const todosValidos: PuntoConOrden[] = puntos.map((p, i) => ({ ...p, orden: i }));

  const ultimoIdx = todosValidos.length - 1;
  // Prioridad: origen y destino primero, luego intermedios en orden de ruta.
  const ordenPrioridad = [
    ...(todosValidos.length > 0 ? [0] : []),
    ...(ultimoIdx > 0 ? [ultimoIdx] : []),
    ...todosValidos.map((_, i) => i).filter(i => i !== 0 && i !== ultimoIdx),
  ];

  const elegidos: PuntoConOrden[] = [];
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

  // Reordenar SIEMPRE de origen a destino por el índice de ruta anotado.
  return elegidos.sort((a, b) => a.orden - b.orden);
}
