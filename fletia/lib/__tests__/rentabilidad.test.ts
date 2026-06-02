import { describe, it, expect } from 'vitest';
import {
  costoTotalReal,
  precioMinimoFlete,
  margenNetoPct,
  gananciaNeta,
  colorMargen,
} from '../rentabilidad';

describe('costoTotalReal', () => {
  it('suma combustible + peajes + conductor + mantenimiento', () => {
    expect(costoTotalReal(100000, 15000, 30000, 5000)).toBe(150000);
  });

  it('trata los costos ausentes/0 como cero', () => {
    expect(costoTotalReal(100000, 0, 0, 0)).toBe(100000);
    // @ts-expect-error probamos robustez ante undefined
    expect(costoTotalReal(100000, undefined, undefined, undefined)).toBe(100000);
  });
});

describe('precioMinimoFlete', () => {
  it('aplica el margen sobre el precio de venta, no sobre el costo', () => {
    // costo 1000, margen 20% → 1000 / 0.8 = 1250 (250 = 20% de 1250)
    expect(precioMinimoFlete(1000, 20)).toBe(1250);
  });

  it('margen 0% devuelve el costo tal cual', () => {
    expect(precioMinimoFlete(1000, 0)).toBe(1000);
  });

  it('margen 25% sobre 1500 → 2000', () => {
    expect(precioMinimoFlete(1500, 25)).toBe(2000);
  });

  it('costo 0 o negativo devuelve 0', () => {
    expect(precioMinimoFlete(0, 20)).toBe(0);
    expect(precioMinimoFlete(-100, 20)).toBe(0);
  });

  it('margen >= 100% no tiene solución finita → 0', () => {
    expect(precioMinimoFlete(1000, 100)).toBe(0);
    expect(precioMinimoFlete(1000, 120)).toBe(0);
  });

  it('el precio mínimo siempre cubre el costo (margen positivo)', () => {
    const costo = 137000;
    expect(precioMinimoFlete(costo, 15)).toBeGreaterThan(costo);
  });
});

describe('margenNetoPct', () => {
  it('calcula el margen real como % del flete', () => {
    // flete 1250, costo 1000 → 250/1250 = 20%
    expect(margenNetoPct(1250, 1000)).toBeCloseTo(20, 5);
  });

  it('margen negativo si el flete no cubre el costo', () => {
    expect(margenNetoPct(800, 1000)).toBeCloseTo(-25, 5);
  });

  it('sin flete válido devuelve null', () => {
    expect(margenNetoPct(0, 1000)).toBeNull();
    expect(margenNetoPct(NaN, 1000)).toBeNull();
  });

  it('es el inverso de precioMinimoFlete', () => {
    // si cobro exactamente el precio mínimo para 20%, el margen real debe ser 20%
    const costo = 100000;
    const precio = precioMinimoFlete(costo, 20);
    expect(margenNetoPct(precio, costo)).toBeCloseTo(20, 1);
  });
});

describe('gananciaNeta', () => {
  it('es flete menos costo', () => {
    expect(gananciaNeta(1250, 1000)).toBe(250);
    expect(gananciaNeta(800, 1000)).toBe(-200);
  });
});

describe('colorMargen', () => {
  it('verde si > 25%, ámbar si > 10%, rojo si bajo, gris si null', () => {
    expect(colorMargen(30)).toBe('#1a6b3a');
    expect(colorMargen(15)).toBe('#c8860a');
    expect(colorMargen(5)).toBe('#d4440c');
    expect(colorMargen(-10)).toBe('#d4440c');
    expect(colorMargen(null)).toBe('#8a8278');
  });
});
