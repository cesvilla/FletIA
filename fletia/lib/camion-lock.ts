// ─── Bloqueo de identidad de camión ──────────────────────────────────────────
//
// Por qué existe esto: el cobro es por camión, así que si la "identidad" de
// un camión (patente, capacidad, marca, modelo) fuera totalmente libre de
// editar para siempre, un usuario podría reutilizar el mismo slot para
// múltiples vehículos reales y pagar uno solo.
//
// Diseño:
//   • Ventana de gracia de 72 horas tras crear el camión → cambios libres
//     (cubre typos detectados al día siguiente).
//   • Pasadas las 72 hs:
//       - Patente: solo cambios con distancia Levenshtein ≤ 2 (typo real),
//         con cooldown de 90 días entre correcciones.
//       - Capacidad: solo ajustes de ±10% (corrección de cifra).
//       - Marca/modelo/año: editables siempre (alias técnicos).
//   • Para cambios más grandes el usuario debe dar de baja y crear otro,
//     o pedir desbloqueo manual a soporte.
//
// Este módulo es 100% puro (sin DB ni I/O) para que sea testeable y reusable
// tanto en el frontend (deshabilitar inputs) como en el backend (validar PATCH).

export const VENTANA_GRACIA_HORAS = 72;
export const COOLDOWN_CAMBIO_PATENTE_DIAS = 90;
export const TOLERANCIA_CAPACIDAD = 0.10;        // ±10%
export const MAX_DISTANCIA_PATENTE_TYPO = 2;     // hasta 2 caracteres distintos

// ─── Validación de patente argentina ─────────────────────────────────────────
// Formatos válidos en AR:
//   • Viejo (hasta sept 2016): 3 letras + 3 números    → "ABC123" / "ABC-123"
//   • Nuevo Mercosur (desde sept 2016): 2L + 3N + 2L  → "AB123CD" / "AB-123-CD"

const RE_PATENTE_VIEJA = /^[A-Z]{3}\d{3}$/;
const RE_PATENTE_MERCOSUR = /^[A-Z]{2}\d{3}[A-Z]{2}$/;

export function normalizarPatente(patente: string): string {
  return patente.toUpperCase().replace(/[^A-Z0-9]/g, '');
}

export function validarPatenteAR(patente: string): boolean {
  if (!patente) return false;
  const limpia = normalizarPatente(patente);
  return RE_PATENTE_VIEJA.test(limpia) || RE_PATENTE_MERCOSUR.test(limpia);
}

// ─── Levenshtein (distancia de edición) ──────────────────────────────────────
export function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;

  // Matriz (a.length+1) × (b.length+1)
  const prev: number[] = new Array(b.length + 1);
  const curr: number[] = new Array(b.length + 1);
  for (let j = 0; j <= b.length; j++) prev[j] = j;

  for (let i = 1; i <= a.length; i++) {
    curr[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const costo = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[j] = Math.min(
        curr[j - 1] + 1,        // inserción
        prev[j] + 1,            // borrado
        prev[j - 1] + costo,    // sustitución
      );
    }
    for (let j = 0; j <= b.length; j++) prev[j] = curr[j];
  }
  return prev[b.length];
}

// ─── Helpers de tiempo ───────────────────────────────────────────────────────

export function horasDesde(fechaIso: string | Date, ahora: Date = new Date()): number {
  const fecha = typeof fechaIso === 'string' ? new Date(fechaIso) : fechaIso;
  return (ahora.getTime() - fecha.getTime()) / (1000 * 60 * 60);
}

export function diasDesde(fechaIso: string | Date | null, ahora: Date = new Date()): number {
  if (!fechaIso) return Infinity;
  return horasDesde(fechaIso, ahora) / 24;
}

export function dentroVentanaGracia(createdAt: string | Date, ahora: Date = new Date()): boolean {
  return horasDesde(createdAt, ahora) <= VENTANA_GRACIA_HORAS;
}

// ─── Reglas de cambio ────────────────────────────────────────────────────────

export type ResultadoValidacion =
  | { ok: true }
  | { ok: false; motivo: string; codigo: 'patente_invalida' | 'patente_cambio_grande' | 'patente_cooldown' | 'capacidad_cambio_grande' };

export interface ContextoCambio {
  createdAt: string | Date;
  ultimoCambioPatente?: string | Date | null;
  ahora?: Date;
}

export function validarCambioPatente(
  vieja: string,
  nueva: string,
  ctx: ContextoCambio,
): ResultadoValidacion {
  const v = normalizarPatente(vieja);
  const n = normalizarPatente(nueva);
  if (v === n) return { ok: true };

  if (!validarPatenteAR(n)) {
    return {
      ok: false,
      codigo: 'patente_invalida',
      motivo: 'Formato de patente inválido. Usá ABC123 (viejo) o AB123CD (Mercosur).',
    };
  }

  // Dentro de la ventana de gracia → cualquier cambio válido.
  if (dentroVentanaGracia(ctx.createdAt, ctx.ahora)) return { ok: true };

  // Fuera de la ventana: solo typo real.
  const dist = levenshtein(v, n);
  if (dist > MAX_DISTANCIA_PATENTE_TYPO) {
    return {
      ok: false,
      codigo: 'patente_cambio_grande',
      motivo:
        'Este cambio parece un cambio de unidad, no una corrección de typo. ' +
        'Para registrar otro camión, dale de baja a éste y creá uno nuevo, ' +
        'o contactá a soporte para verificar la corrección.',
    };
  }

  // Cooldown entre correcciones de patente.
  const diasUltimo = diasDesde(ctx.ultimoCambioPatente ?? null, ctx.ahora);
  if (diasUltimo < COOLDOWN_CAMBIO_PATENTE_DIAS) {
    const faltan = Math.ceil(COOLDOWN_CAMBIO_PATENTE_DIAS - diasUltimo);
    return {
      ok: false,
      codigo: 'patente_cooldown',
      motivo:
        `Ya corregiste la patente recientemente. ` +
        `Faltan ${faltan} día${faltan === 1 ? '' : 's'} para poder volver a corregirla.`,
    };
  }

  return { ok: true };
}

export function validarCambioCapacidad(
  vieja: number,
  nueva: number,
  ctx: ContextoCambio,
): ResultadoValidacion {
  if (vieja === nueva) return { ok: true };
  if (dentroVentanaGracia(ctx.createdAt, ctx.ahora)) return { ok: true };

  // Fuera de la ventana: solo ajustes ≤ TOLERANCIA_CAPACIDAD.
  if (vieja <= 0) return { ok: true }; // dato roto, dejar pasar
  const delta = Math.abs(nueva - vieja) / vieja;
  if (delta > TOLERANCIA_CAPACIDAD) {
    const pct = Math.round(TOLERANCIA_CAPACIDAD * 100);
    return {
      ok: false,
      codigo: 'capacidad_cambio_grande',
      motivo:
        `Solo se permiten ajustes de ±${pct}% en la capacidad después de las 72 hs. ` +
        `Para registrar otro camión, dale de baja a éste y creá uno nuevo.`,
    };
  }
  return { ok: true };
}

// ─── Estado de bloqueo (para UI) ─────────────────────────────────────────────
//
// Devuelve qué campos están "duros" (editables solo bajo reglas) en un camión
// dado. El frontend lo usa para mostrar candados; el backend valida igual.

export interface EstadoBloqueo {
  dentroGracia: boolean;
  horasRestantesGracia: number;
  patenteBloqueada: boolean;
  capacidadBloqueada: boolean;
  cooldownPatenteActivo: boolean;
  diasParaProximaCorreccion: number;
}

export function estadoBloqueo(
  ctx: ContextoCambio,
): EstadoBloqueo {
  const ahora = ctx.ahora ?? new Date();
  const horas = horasDesde(ctx.createdAt, ahora);
  const dentroGracia = horas <= VENTANA_GRACIA_HORAS;
  const diasUltimo = diasDesde(ctx.ultimoCambioPatente ?? null, ahora);
  const cooldownPatenteActivo = !dentroGracia && diasUltimo < COOLDOWN_CAMBIO_PATENTE_DIAS;

  return {
    dentroGracia,
    horasRestantesGracia: Math.max(0, VENTANA_GRACIA_HORAS - horas),
    patenteBloqueada: !dentroGracia,
    capacidadBloqueada: !dentroGracia,
    cooldownPatenteActivo,
    diasParaProximaCorreccion: cooldownPatenteActivo
      ? Math.ceil(COOLDOWN_CAMBIO_PATENTE_DIAS - diasUltimo)
      : 0,
  };
}
