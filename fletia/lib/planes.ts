// ─── Planes y precios de FletIA ──────────────────────────────────────────────
//
// Precio por camión/mes, cobro mensual via MercadoPago (preapproval).
// El admin asigna limite_camiones y tipo al aprobar en /admin; la facturación
// se calcula automáticamente según la cantidad aprobada.

export interface PlanFletIA {
  id: string;
  nombre: string;
  minCamiones: number;
  maxCamiones: number;
  precioPorCamion: number;  // ARS/mes
  features: string[];
}

export const PLANES: PlanFletIA[] = [
  {
    id: 'demo',
    nombre: 'Prueba',
    minCamiones: 1,
    maxCamiones: 1,
    precioPorCamion: 0,
    features: ['1 camión', 'Viajes ilimitados', 'IA que aprende', 'Reporte de rentabilidad'],
  },
  {
    id: 'basico',
    nombre: 'Básico',
    minCamiones: 1,
    maxCamiones: 3,
    precioPorCamion: 20000,
    features: ['Hasta 3 camiones', 'Viajes ilimitados', 'IA que aprende por camión', 'Reportes y rentabilidad', 'Soporte por WhatsApp'],
  },
  {
    id: 'flota',
    nombre: 'Flota',
    minCamiones: 4,
    maxCamiones: 10,
    precioPorCamion: 15000,
    features: ['Hasta 10 camiones', 'Todo lo del plan Básico', 'Exportar por camión (Excel/PDF)', 'Soporte prioritario'],
  },
];

// Determina el plan correcto según la cantidad de camiones autorizados.
export function planParaCamiones(cantidad: number): PlanFletIA {
  if (cantidad <= 0) return PLANES[0]; // demo
  if (cantidad <= 3) return PLANES[1]; // básico
  return PLANES[2];                    // flota
}

// Monto total mensual a cobrar por la cantidad de camiones.
export function montoMensual(cantidad: number): number {
  const plan = planParaCamiones(cantidad);
  return plan.precioPorCamion * Math.max(1, cantidad);
}

// Descripción para el concepto de la suscripción (lo ve el cliente en MercadoPago).
export function conceptoSuscripcion(empresa: string, cantidad: number): string {
  const plan = planParaCamiones(cantidad);
  return `FletIA ${plan.nombre} — ${cantidad} ${cantidad > 1 ? 'camiones' : 'camión'} · ${empresa}`;
}
