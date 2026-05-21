export interface ParametrosViaje {
  consumoBase: number;
  capacidadMax: number;
  pesoCarга: number;
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

const FACTORES_RUTA: Record<string, number> = {
  autopista: 1.0,
  mixta: 1.20,
  urbana: 1.40,
};

const FACTORES_TERRENO: Record<string, number> = {
  plano: 1.0,
  ondulado: 1.15,
  montanoso: 1.30,
};

const FACTORES_CONDICION: Record<string, number> = {
  excelente: 1.0,
  buena: 1.03,
  regular: 1.08,
};

export function calcularViaje(params: ParametrosViaje): ResultadoCalculo {
  const { consumoBase, capacidadMax, pesoCarга, kilometros, tipoRuta, terreno, precioCombustible, condicionCamion } = params;

  const porcentajeCarga = Math.min(pesoCarга / capacidadMax, 1);
  const factorPeso = 1 + (porcentajeCarga * 0.35);
  const factorRuta = FACTORES_RUTA[tipoRuta] || 1.0;
  const factorTerreno = FACTORES_TERRENO[terreno] || 1.0;
  const factorCondicion = FACTORES_CONDICION[condicionCamion] || 1.0;

  const consumoReal = consumoBase * factorPeso * factorRuta * factorTerreno * factorCondicion;
  const litrosTotales = (consumoReal * kilometros) / 100;
  const costoTotal = litrosTotales * precioCombustible;
  const costoPorKm = costoTotal / kilometros;

  const incrementoPeso = Math.round((factorPeso - 1) * 100);
  const descripcion = `Con ${pesoCarга} ton de carga (${Math.round(porcentajeCarga * 100)}% de capacidad), el consumo aumenta un ${incrementoPeso}% respecto al viaje vacío. Consumo estimado: ${consumoReal.toFixed(1)} lts/100km · Total: ${litrosTotales.toFixed(1)} litros.`;

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