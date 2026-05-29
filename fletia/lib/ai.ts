export interface ParametrosViaje {
  consumoVacio: number;            // L/100km sin carga (intercepto aprendido)
  pendienteCarga: number | null;   // L/100km extra a plena carga (pendiente). null => fallback 25%
  capacidadMax: number;
  pesoCarga: number;
  kilometros: number;
  precioCombustible: number;
}

export interface ResultadoCalculo {
  factorPeso: number;
  factorRuta: number;      // siempre 1 — reservado para compat. DB
  factorTerreno: number;   // siempre 1 — reservado para compat. DB
  factorCondicion: number; // siempre 1 — reservado para compat. DB
  consumoReal: number;
  litrosTotales: number;
  costoTotal: number;
  costoPorKm: number;
  porcentajeCarga: number;
  descripcion: string;
}

// ─── Modelo de consumo por camión ─────────────────────────────────────────────
//
// El consumo de un camión diesel es aproximadamente LINEAL respecto de la carga:
//
//     consumo(L/100km) = consumoVacio + pendienteCarga × fracciónDeCarga
//
//   - consumoVacio:    litros/100km circulando vacío        (intercepto, "a")
//   - pendienteCarga:  litros/100km extra a plena carga      (pendiente, "b")
//   - fracciónDeCarga: pesoCarga / capacidadMax  (0 = vacío, 1 = lleno)
//
// AMBOS parámetros se APRENDEN por camión a partir de sus viajes reales
// (ver ajustarModeloConsumo). Mientras no haya suficientes datos con cargas
// variadas, se usa una pendiente por defecto del 25% del consumo en vacío
// (promedio razonable para semirremolques), y el aprendizaje la corrige sola.
//
// Por qué importa: con pendiente FIJA, un camión que en realidad sube +40% a
// plena carga generaba una "base" inflada o deflactada según qué tan cargados
// fueran los últimos viajes. Aprender la pendiente elimina ese sesgo.

const PENDIENTE_DEFECTO_PCT = 0.25;

// Límites de cordura para los parámetros aprendidos (L/100km)
const VACIO_MIN = 12, VACIO_MAX = 55;
const PENDIENTE_MIN = 0, PENDIENTE_MAX = 30;

function pendienteEfectiva(consumoVacio: number, pendienteCarga: number | null): number {
  if (pendienteCarga != null && pendienteCarga > 0) return pendienteCarga;
  return consumoVacio * PENDIENTE_DEFECTO_PCT;
}

export function calcularViaje(params: ParametrosViaje): ResultadoCalculo {
  const { consumoVacio, pendienteCarga, capacidadMax, pesoCarga, kilometros, precioCombustible } = params;

  const porcentajeCarga = Math.min(pesoCarga / capacidadMax, 1);
  const pendiente = pendienteEfectiva(consumoVacio, pendienteCarga);

  // Modelo lineal: consumo = vacío + pendiente × fracción de carga
  const consumoReal = consumoVacio + pendiente * porcentajeCarga;

  // factorPeso = cuántas veces el consumo en vacío (se guarda por compat. DB)
  const factorPeso = consumoVacio > 0
    ? Math.round((consumoReal / consumoVacio) * 100) / 100
    : 1;

  const litrosTotales = (consumoReal * kilometros) / 100;
  const costoTotal    = litrosTotales * precioCombustible;
  const costoPorKm    = costoTotal / kilometros;

  const pctCarga   = Math.round(porcentajeCarga * 100);
  const pctAumento = consumoVacio > 0
    ? Math.round(((consumoReal - consumoVacio) / consumoVacio) * 100)
    : 0;

  const descripcion =
    `Con ${pesoCarga} ton de carga (${pctCarga}% de capacidad), el consumo estimado es ` +
    `${consumoReal.toFixed(1)} lts/100km — un ${pctAumento}% más que en vacío ` +
    `(${consumoVacio.toFixed(1)} lts/100km). Total: ${litrosTotales.toFixed(1)} litros ` +
    `a $${precioCombustible}/lt. El modelo de consumo se aprende de los viajes reales del camión.`;

  return {
    factorPeso,
    factorRuta:      1,
    factorTerreno:   1,
    factorCondicion: 1,
    consumoReal:   Math.round(consumoReal * 10) / 10,
    litrosTotales: Math.round(litrosTotales * 10) / 10,
    costoTotal:    Math.round(costoTotal),
    costoPorKm:    Math.round(costoPorKm * 10) / 10,
    porcentajeCarga: pctCarga,
    descripcion,
  };
}

// ─── Aprendizaje: regresión lineal ponderada por recencia ─────────────────────

export interface PuntoConsumo {
  fraccionCarga: number; // 0..1  (pesoCarga / capacidadMax)
  consumo: number;       // L/100km realmente medido en ese viaje
}

export interface ModeloConsumo {
  consumoVacio: number;       // a  (L/100km)
  pendienteCarga: number;     // b  (L/100km extra a plena carga)
  metodo: 'regresion' | 'base-fija';
  n: number;                  // viajes usados
}

// Ajusta el modelo de consumo de un camión a partir de sus viajes reales.
// `puntos` debe venir ordenado del MÁS RECIENTE al más antiguo.
// `decay` < 1 da más peso a los viajes recientes (0.6 ≈ 80% del peso en los 4 últimos).
export function ajustarModeloConsumo(
  puntos: PuntoConsumo[],
  modeloPrevio: { consumoVacio: number; pendienteCarga: number | null },
  decay = 0.6,
): ModeloConsumo {
  const n = puntos.length;
  const pendientePrevia = pendienteEfectiva(modeloPrevio.consumoVacio, modeloPrevio.pendienteCarga);

  if (n === 0) {
    return {
      consumoVacio: clamp(modeloPrevio.consumoVacio, VACIO_MIN, VACIO_MAX),
      pendienteCarga: clamp(pendientePrevia, PENDIENTE_MIN, PENDIENTE_MAX),
      metodo: 'base-fija',
      n: 0,
    };
  }

  // Pesos por recencia
  const w = puntos.map((_, i) => Math.pow(decay, i));
  const sumW = w.reduce((s, v) => s + v, 0);

  const xs = puntos.map(p => p.fraccionCarga);
  const ys = puntos.map(p => p.consumo);

  const xMean = puntos.reduce((s, p, i) => s + p.fraccionCarga * w[i], 0) / sumW;
  const yMean = puntos.reduce((s, p, i) => s + p.consumo * w[i], 0) / sumW;

  let Sxx = 0, Sxy = 0;
  for (let i = 0; i < n; i++) {
    const dx = xs[i] - xMean;
    Sxx += w[i] * dx * dx;
    Sxy += w[i] * dx * (ys[i] - yMean);
  }

  const rangoCarga = Math.max(...xs) - Math.min(...xs);

  // Sin suficiente variedad de cargas no se puede estimar la pendiente con
  // confianza: mantenemos la pendiente previa y aprendemos solo el intercepto.
  if (n < 3 || rangoCarga < 0.15 || Sxx < 1e-6) {
    const b = pendientePrevia;
    const a = puntos.reduce((s, p, i) => s + (p.consumo - b * p.fraccionCarga) * w[i], 0) / sumW;
    return {
      consumoVacio: round1(clamp(a, VACIO_MIN, VACIO_MAX)),
      pendienteCarga: round1(clamp(b, PENDIENTE_MIN, PENDIENTE_MAX)),
      metodo: 'base-fija',
      n,
    };
  }

  // Regresión lineal ponderada
  let b = Sxy / Sxx;
  let a = yMean - b * xMean;

  // Si la regresión devuelve algo físicamente absurdo (p. ej. pendiente
  // negativa por ruido), caemos a la pendiente previa para no degradar.
  if (b < PENDIENTE_MIN || b > PENDIENTE_MAX) {
    b = clamp(pendientePrevia, PENDIENTE_MIN, PENDIENTE_MAX);
    a = puntos.reduce((s, p, i) => s + (p.consumo - b * p.fraccionCarga) * w[i], 0) / sumW;
    return {
      consumoVacio: round1(clamp(a, VACIO_MIN, VACIO_MAX)),
      pendienteCarga: round1(b),
      metodo: 'base-fija',
      n,
    };
  }

  return {
    consumoVacio: round1(clamp(a, VACIO_MIN, VACIO_MAX)),
    pendienteCarga: round1(clamp(b, PENDIENTE_MIN, PENDIENTE_MAX)),
    metodo: 'regresion',
    n,
  };
}

function clamp(v: number, min: number, max: number): number {
  return Math.min(Math.max(v, min), max);
}
function round1(v: number): number {
  return Math.round(v * 10) / 10;
}
