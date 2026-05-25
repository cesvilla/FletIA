export interface ParametrosViaje {
  consumoBase: number;
  capacidadMax: number;
  pesoCarga: number;
  kilometros: number;
  tipoRuta: 'autopista' | 'mixta' | 'urbana';
  terreno: 'plano' | 'ondulado' | 'montanoso';
  precioCombustible: number;
  condicionCamion: 'excelente' | 'buena' | 'regular';
}

export interface ResultadoCalculo {
  factorPeso: number;
  factorRuta: number;
  factorTerreno: number;
  factorCondicion: number;
  consumoReal: number;
  litrosTotales: number;
  costoTotal: number;
  costoPorKm: number;
  porcentajeCarga: number;
  descripcion: string;
}

// ─── Incrementos individuales sobre consumo base ──────────────────────────────
// Cada factor agrega un porcentaje independiente al consumo base.
// Se suman (NO se multiplican) para evitar que se potencien entre sí.
//
// Referencia real para camiones diesel argentinos:
//   Carga llena (+25%), autopista base, mixta (+12%), urbana (+28%)
//   Terreno ondulado (+7%), montañoso (+18%)
//   Condición buena (+3%), regular (+8%)

const INCREMENTOS_RUTA: Record<string, number> = {
  autopista: 0.00,   // base, sin incremento
  mixta:     0.12,   // +12% sobre base
  urbana:    0.28,   // +28% sobre base
};

const INCREMENTOS_TERRENO: Record<string, number> = {
  plano:      0.00,  // base
  ondulado:   0.07,  // +7%
  montanoso:  0.18,  // +18%
};

const INCREMENTOS_CONDICION: Record<string, number> = {
  excelente: 0.00,   // base
  buena:     0.03,   // +3%
  regular:   0.08,   // +8%
};

export function calcularViaje(params: ParametrosViaje): ResultadoCalculo {
  const {
    consumoBase, capacidadMax, pesoCarga, kilometros,
    tipoRuta, terreno, precioCombustible, condicionCamion,
  } = params;

  const porcentajeCarga = Math.min(pesoCarga / capacidadMax, 1);

  // Incrementos individuales (cada uno es independiente)
  const incPeso      = porcentajeCarga * 0.25;
  const incRuta      = INCREMENTOS_RUTA[tipoRuta]      ?? 0;
  const incTerreno   = INCREMENTOS_TERRENO[terreno]    ?? 0;
  const incCondicion = INCREMENTOS_CONDICION[condicionCamion] ?? 0;

  // Factor total = suma de incrementos (aditivo, no multiplicativo)
  const factorTotal = 1 + incPeso + incRuta + incTerreno + incCondicion;

  // Factores individuales para mostrar en UI y guardar en DB
  const factorPeso      = Math.round((1 + incPeso) * 100) / 100;
  const factorRuta      = 1 + incRuta;
  const factorTerreno   = 1 + incTerreno;
  const factorCondicion = 1 + incCondicion;

  const consumoReal   = consumoBase * factorTotal;
  const litrosTotales = (consumoReal * kilometros) / 100;
  const costoTotal    = litrosTotales * precioCombustible;
  const costoPorKm    = costoTotal / kilometros;

  const pctCarga = Math.round(porcentajeCarga * 100);
  const pctAumento = Math.round((factorTotal - 1) * 100);

  const descripcion =
    `Con ${pesoCarga} ton de carga (${pctCarga}% de capacidad) en ruta ${tipoRuta}, ` +
    `el consumo aumenta un ${pctAumento}% respecto al viaje vacío. ` +
    `Consumo estimado: ${consumoReal.toFixed(1)} lts/100km · Total: ${litrosTotales.toFixed(1)} litros.`;

  return {
    factorPeso,
    factorRuta,
    factorTerreno,
    factorCondicion,
    consumoReal:   Math.round(consumoReal * 10) / 10,
    litrosTotales: Math.round(litrosTotales * 10) / 10,
    costoTotal:    Math.round(costoTotal),
    costoPorKm:    Math.round(costoPorKm * 10) / 10,
    porcentajeCarga: pctCarga,
    descripcion,
  };
}

export function calcularNuevoConsumoBase(
  consumoBaseActual: number,
  litrosReales: number,
  kilometros: number,
  factorPeso: number,
  factorRuta: number,
  factorTerreno: number,
  factorCondicion: number
): number {
  const consumoRealMedido = (litrosReales / kilometros) * 100;

  // Reconstruir factor total usando la misma lógica aditiva
  const incPeso      = factorPeso - 1;
  const incRuta      = factorRuta - 1;
  const incTerreno   = factorTerreno - 1;
  const incCondicion = factorCondicion - 1;
  const factorTotal  = 1 + incPeso + incRuta + incTerreno + incCondicion;

  const consumoBaseImplicito = consumoRealMedido / factorTotal;
  const nuevoConsumoBase = (consumoBaseActual * 0.8) + (consumoBaseImplicito * 0.2);
  return Math.round(Math.min(Math.max(nuevoConsumoBase, 15), 60) * 10) / 10;
}
