// ─── Rentabilidad de un viaje ────────────────────────────────────────────────
//
// Funciones puras del cálculo de costo total y margen. Viven acá (y no inline en
// el componente) para poder testearlas y reutilizarlas. El componente de viajes
// las importa; los tests cubren los casos límite.

// Costo TOTAL REAL del viaje = combustible + peajes + conductor + mantenimiento.
// El clima NO se suma (impacto incierto; queda como referencia informativa).
export function costoTotalReal(
  combustible: number,
  peajes: number,
  conductor: number,
  mantenimiento: number,
): number {
  return (combustible || 0) + (peajes || 0) + (conductor || 0) + (mantenimiento || 0);
}

// Precio mínimo de flete para alcanzar un margen objetivo, expresado como % del
// PRECIO de venta (no del costo): precio = costo / (1 - margen).
// Ej: costo $1.000 con margen 20% → $1.250 (de los cuales $250 = 20% de $1.250).
export function precioMinimoFlete(costoTotal: number, margenObjetivoPct: number): number {
  if (!costoTotal || costoTotal <= 0) return 0;
  const m = margenObjetivoPct / 100;
  if (m >= 1) return 0; // un margen ≥ 100% del precio no tiene solución finita
  return Math.round(costoTotal / (1 - m));
}

// Margen neto real (% del flete cobrado): (flete - costo) / flete × 100.
// Devuelve null si no hay flete cobrado válido.
export function margenNetoPct(fleteCobrado: number, costoTotal: number): number | null {
  if (!fleteCobrado || fleteCobrado <= 0) return null;
  return ((fleteCobrado - costoTotal) / fleteCobrado) * 100;
}

// Ganancia neta en pesos = flete cobrado - costo total real.
export function gananciaNeta(fleteCobrado: number, costoTotal: number): number {
  return (fleteCobrado || 0) - (costoTotal || 0);
}

// Color semáforo según el margen neto (verde >25%, ámbar >10%, rojo si bajo/negativo).
export function colorMargen(margenPct: number | null): string {
  if (margenPct == null) return '#8a8278';
  if (margenPct > 25) return '#1a6b3a';
  if (margenPct > 10) return '#c8860a';
  return '#d4440c';
}
