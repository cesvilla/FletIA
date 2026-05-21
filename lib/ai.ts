/**
 * Motor de IA de FletIA
 * Calcula el consumo y costo de combustible de un viaje
 * basándose en el camión, la carga, la ruta y el terreno.
 */

export interface ParametrosViaje {
  consumoBase: number;       // litros/100km del camión vacío
  capacidadMax: number;      // toneladas máximas del camión
  pesoCarга: number;         // toneladas de carga del viaje
  kilometros: number;        // distancia del viaje
  tipoRuta: 'autopista' | 'mixta' | 'urbana';
  terreno: 'plano' | 'ondulado' | 'montanoso';
  precioCombustible: number; // precio por litro en pesos
  condicionCamion: 'excelente' | 'buena' | 'regular';
}

export interface ResultadoCalculo {
  factorPeso: number;
  factorRuta: number;
  factorTerreno: number;
  factorCondicion: number;
  consumoReal: number;       // litros/100km ajustado
  litrosTotales: number;     // litros necesarios para el viaje
  costoTotal: number;        // costo en pesos
  costoPorKm: number;        // costo por kilómetro
  porcentajeCarga: number;   // % de capacidad utilizada
  descripcion: string;       // explicación en texto
}

// Factores según tipo de ruta
const FACTORES_RUTA: Record<string, number> = {
  autopista: 1.0,   // mejor consumo
  mixta: 1.20,      // 20% más
  urbana: 1.40,     // 40% más (semáforos, arranques)
};

// Factores según terreno
const FACTORES_TERRENO: Record<string, number> = {
  plano: 1.0,
  ondulado: 1.15,   // 15% más
  montanoso: 1.30,  // 30% más (subidas)
};

// Factores según condición del camión
const FACTORES_CONDICION: Record<string, number> = {
  excelente: 1.0,
  buena: 1.03,      // 3% más
  regular: 1.08,    // 8% más (motor, filtros, neumáticos)
};

/**
 * Función principal de cálculo.
 * La IA aplica factores multiplicadores al consumo base
 * según las condiciones del viaje.
 */
export function calcularViaje(params: ParametrosViaje): ResultadoCalculo {
  const {
    consumoBase,
    capacidadMax,
    pesoCarга,
    kilometros,
    tipoRuta,
    terreno,
    precioCombustible,
    condicionCamion,
  } = params;

  // Porcentaje de carga (0 a 1)
  const porcentajeCarga = Math.min(pesoCarга / capacidadMax, 1);

  // Factor de peso: a más carga, más consumo
  // Con carga máxima consume ~35% más que vacío
  const factorPeso = 1 + (porcentajeCarga * 0.35);

  // Factores externos
  const factorRuta = FACTORES_RUTA[tipoRuta] || 1.0;
  const factorTerreno = FACTORES_TERRENO[terreno] || 1.0;
  const factorCondicion = FACTORES_CONDICION[condicionCamion] || 1.0;

  // Consumo real ajustado (litros/100km)
  const consumoReal = consumoBase * factorPeso * factorRuta * factorTerreno * factorCondicion;

  // Litros totales para el viaje
  const litrosTotales = (consumoReal * kilometros) / 100;

  // Costo total
  const costoTotal = litrosTotales * precioCombustible;

  // Costo por km
  const costoPorKm = costoTotal / kilometros;

  // Descripción para el usuario
  const descripcion = generarDescripcion(params, factorPeso, consumoReal, litrosTotales);

  return {
    factorPeso: Math.round(factorPeso * 100) / 100,
    factorRuta,
    factorTerreno,
    factorCondicion,
    consumoReal: Math.round(consumoReal * 10) / 10,
    litrosTotales: Math.round(litrosTotales * 10) / 10,
    costoTotal: Math.round(costoTotal),
    costoPorKm: Math.round(costoPorKm * 10) / 10,
    porcentajeCarga: Math.round(porcentajeCarga * 100),
    descripcion,
  };
}

function generarDescripcion(
  params: ParametrosViaje,
  factorPeso: number,
  consumoReal: number,
  litrosTotales: number
): string {
  const incrementoPeso = Math.round((factorPeso - 1) * 100);
  const partes = [];

  partes.push(`Con ${params.pesoCarга} ton de carga (${Math.round((params.pesoCarга / params.capacidadMax) * 100)}% de capacidad), el consumo aumenta un ${incrementoPeso}% respecto al viaje vacío.`);

  if (params.tipoRuta !== 'autopista') {
    const inc = Math.round((FACTORES_RUTA[params.tipoRuta] - 1) * 100);
    partes.push(`La ruta ${params.tipoRuta} agrega un ${inc}% adicional.`);
  }

  if (params.terreno !== 'plano') {
    const inc = Math.round((FACTORES_TERRENO[params.terreno] - 1) * 100);
    partes.push(`El terreno ${params.terreno} suma otro ${inc}%.`);
  }

  partes.push(`Consumo estimado: ${consumoReal.toFixed(1)} lts/100km · Total: ${litrosTotales.toFixed(1)} litros.`);

  return partes.join(' ');
}
