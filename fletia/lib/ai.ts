export interface ParametrosViaje {
  consumoBase: number;
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

// ─── Lógica de cálculo ────────────────────────────────────────────────────────
//
// Se calcula únicamente con datos reales:
//   - consumoBase: aprendido de los viajes reales confirmados del camión
//   - pesoCarga:   toneladas que el usuario ingresa
//   - capacidadMax: capacidad del camión registrada
//
// El incremento por peso es el único factor variable porque es el único
// que el usuario informa con datos reales en cada viaje.
// La relación peso/consumo en camiones diesel es física y directa:
//   carga llena ≈ +25% consumo sobre vacío (promedio real para semirremolques).
//
// Los factores de ruta, terreno, clima y condición del camión fueron eliminados
// porque se basaban en porcentajes genéricos, no en datos de la flota real.
// El consumo base aprendido ya captura esas condiciones de forma implícita.

export function calcularViaje(params: ParametrosViaje): ResultadoCalculo {
  const { consumoBase, capacidadMax, pesoCarga, kilometros, precioCombustible } = params;

  const porcentajeCarga = Math.min(pesoCarga / capacidadMax, 1);

  // Único incremento: peso de la carga (dato real ingresado por el usuario)
  const incPeso   = porcentajeCarga * 0.25;
  const factorTotal = 1 + incPeso;

  const factorPeso = Math.round(factorTotal * 100) / 100;

  const consumoReal   = consumoBase * factorTotal;
  const litrosTotales = (consumoReal * kilometros) / 100;
  const costoTotal    = litrosTotales * precioCombustible;
  const costoPorKm    = costoTotal / kilometros;

  const pctCarga   = Math.round(porcentajeCarga * 100);
  const pctAumento = Math.round(incPeso * 100);

  const descripcion =
    `Con ${pesoCarga} ton de carga (${pctCarga}% de capacidad), el consumo estimado es ` +
    `${consumoReal.toFixed(1)} lts/100km — un ${pctAumento}% más que en vacío. ` +
    `Total: ${litrosTotales.toFixed(1)} litros a $${precioCombustible}/lt. ` +
    `El consumo base del camión fue aprendido de sus viajes reales confirmados.`;

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

export function calcularNuevoConsumoBase(
  consumoBaseActual: number,
  litrosReales: number,
  kilometros: number,
  factorPeso: number,
): number {
  const consumoRealMedido = (litrosReales / kilometros) * 100;

  // Con el factor aditivo simplificado: factorTotal = factorPeso
  const consumoBaseImplicito = consumoRealMedido / factorPeso;

  // Media ponderada: 70% historial acumulado + 30% medición nueva
  const nuevoConsumoBase = (consumoBaseActual * 0.7) + (consumoBaseImplicito * 0.3);
  return Math.round(Math.min(Math.max(nuevoConsumoBase, 15), 60) * 10) / 10;
}
