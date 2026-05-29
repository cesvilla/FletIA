import { describe, it, expect } from 'vitest';
import { calcularViaje, ajustarModeloConsumo, type PuntoConsumo } from '../ai';

// ─────────────────────────────────────────────────────────────────────────────
// calcularViaje — modelo lineal de costo de combustible
// ─────────────────────────────────────────────────────────────────────────────
describe('calcularViaje', () => {
  it('camión vacío consume exactamente el consumoVacio', () => {
    const r = calcularViaje({
      consumoVacio: 30,
      pendienteCarga: 10,
      capacidadMax: 30,
      pesoCarga: 0,
      kilometros: 100,
      precioCombustible: 1000,
    });
    // 30 L/100km × 100 km = 30 L → 30 × 1000 = 30.000
    expect(r.consumoReal).toBe(30);
    expect(r.litrosTotales).toBe(30);
    expect(r.costoTotal).toBe(30000);
    expect(r.porcentajeCarga).toBe(0);
  });

  it('a plena carga suma toda la pendiente', () => {
    const r = calcularViaje({
      consumoVacio: 30,
      pendienteCarga: 10,
      capacidadMax: 30,
      pesoCarga: 30,
      kilometros: 100,
      precioCombustible: 1000,
    });
    // consumo = 30 + 10 × 1.0 = 40 L/100km → 40 L → 40.000
    expect(r.consumoReal).toBe(40);
    expect(r.litrosTotales).toBe(40);
    expect(r.costoTotal).toBe(40000);
    expect(r.porcentajeCarga).toBe(100);
  });

  it('a media carga suma la mitad de la pendiente', () => {
    const r = calcularViaje({
      consumoVacio: 30,
      pendienteCarga: 10,
      capacidadMax: 30,
      pesoCarga: 15,
      kilometros: 100,
      precioCombustible: 1000,
    });
    // consumo = 30 + 10 × 0.5 = 35
    expect(r.consumoReal).toBe(35);
    expect(r.porcentajeCarga).toBe(50);
  });

  it('usa pendiente por defecto (25% del vacío) cuando pendienteCarga es null', () => {
    const r = calcularViaje({
      consumoVacio: 40,
      pendienteCarga: null,
      capacidadMax: 30,
      pesoCarga: 30,
      kilometros: 100,
      precioCombustible: 1000,
    });
    // pendiente = 40 × 0.25 = 10 → consumo a plena carga = 40 + 10 = 50
    expect(r.consumoReal).toBe(50);
  });

  it('clampa la fracción de carga a 1 si el peso supera la capacidad (sobrecarga)', () => {
    const r = calcularViaje({
      consumoVacio: 30,
      pendienteCarga: 10,
      capacidadMax: 30,
      pesoCarga: 45, // 150% — no debe pasar de 100%
      kilometros: 100,
      precioCombustible: 1000,
    });
    expect(r.porcentajeCarga).toBe(100);
    expect(r.consumoReal).toBe(40); // 30 + 10 × 1.0
  });

  it('costoPorKm es coherente con el costo total', () => {
    const r = calcularViaje({
      consumoVacio: 30,
      pendienteCarga: 10,
      capacidadMax: 30,
      pesoCarga: 15,
      kilometros: 200,
      precioCombustible: 1000,
    });
    expect(r.costoPorKm).toBeCloseTo(r.costoTotal / 200, 0);
  });

  it('el costo escala linealmente con los kilómetros', () => {
    const base = {
      consumoVacio: 30, pendienteCarga: 10, capacidadMax: 30,
      pesoCarga: 15, precioCombustible: 1000,
    };
    const r100 = calcularViaje({ ...base, kilometros: 100 });
    const r200 = calcularViaje({ ...base, kilometros: 200 });
    expect(r200.costoTotal).toBe(r100.costoTotal * 2);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// ajustarModeloConsumo — aprendizaje por regresión lineal ponderada
// ─────────────────────────────────────────────────────────────────────────────
describe('ajustarModeloConsumo', () => {
  const previo = { consumoVacio: 30, pendienteCarga: 10 };

  it('sin datos devuelve el modelo previo (base-fija)', () => {
    const m = ajustarModeloConsumo([], previo);
    expect(m.metodo).toBe('base-fija');
    expect(m.n).toBe(0);
    expect(m.consumoVacio).toBe(30);
    expect(m.pendienteCarga).toBe(10);
  });

  it('recupera los parámetros reales de datos limpios (a=30, b=10)', () => {
    // Generamos puntos perfectos: consumo = 30 + 10 × fracción
    const puntos: PuntoConsumo[] = [
      { fraccionCarga: 0.0, consumo: 30 },
      { fraccionCarga: 0.5, consumo: 35 },
      { fraccionCarga: 1.0, consumo: 40 },
      { fraccionCarga: 0.25, consumo: 32.5 },
      { fraccionCarga: 0.75, consumo: 37.5 },
    ];
    const m = ajustarModeloConsumo(puntos, previo);
    expect(m.metodo).toBe('regresion');
    expect(m.consumoVacio).toBeCloseTo(30, 0);
    expect(m.pendienteCarga).toBeCloseTo(10, 0);
  });

  it('con poca variedad de cargas no estima pendiente (base-fija)', () => {
    // Todas las cargas casi iguales → rangoCarga < 0.15
    const puntos: PuntoConsumo[] = [
      { fraccionCarga: 0.5, consumo: 35 },
      { fraccionCarga: 0.52, consumo: 35.2 },
      { fraccionCarga: 0.51, consumo: 35.1 },
    ];
    const m = ajustarModeloConsumo(puntos, previo);
    expect(m.metodo).toBe('base-fija');
    expect(m.pendienteCarga).toBe(10); // mantiene la pendiente previa
  });

  it('clampa el consumo en vacío dentro de límites de cordura', () => {
    // Datos absurdamente altos → debe quedar acotado a VACIO_MAX (55)
    const puntos: PuntoConsumo[] = [
      { fraccionCarga: 0.0, consumo: 200 },
      { fraccionCarga: 0.5, consumo: 205 },
      { fraccionCarga: 1.0, consumo: 210 },
    ];
    const m = ajustarModeloConsumo(puntos, previo);
    expect(m.consumoVacio).toBeLessThanOrEqual(55);
    expect(m.consumoVacio).toBeGreaterThanOrEqual(12);
  });

  it('descarta pendiente negativa (ruido) y cae a base-fija', () => {
    // consumo BAJA con la carga → pendiente negativa, físicamente imposible
    const puntos: PuntoConsumo[] = [
      { fraccionCarga: 0.0, consumo: 40 },
      { fraccionCarga: 0.5, consumo: 35 },
      { fraccionCarga: 1.0, consumo: 30 },
    ];
    const m = ajustarModeloConsumo(puntos, previo);
    expect(m.metodo).toBe('base-fija');
    expect(m.pendienteCarga).toBeGreaterThanOrEqual(0);
  });

  it('da más peso a los viajes recientes (recency decay)', () => {
    // El más reciente (primero) tiene consumo más alto en vacío.
    // El modelo debería inclinarse hacia el dato reciente.
    const recienteAlto: PuntoConsumo[] = [
      { fraccionCarga: 0.0, consumo: 38 }, // reciente
      { fraccionCarga: 0.0, consumo: 30 },
      { fraccionCarga: 0.0, consumo: 30 },
    ];
    const m = ajustarModeloConsumo(recienteAlto, previo);
    expect(m.consumoVacio).toBeGreaterThan(30);
  });
});
