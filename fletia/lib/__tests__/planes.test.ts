import { describe, it, expect } from 'vitest';
import { planParaCamiones, montoMensual, conceptoSuscripcion, PLANES } from '../planes';

describe('planParaCamiones', () => {
  it('0 o negativo → demo', () => {
    expect(planParaCamiones(0).id).toBe('demo');
    expect(planParaCamiones(-1).id).toBe('demo');
  });
  it('1-3 camiones → básico', () => {
    expect(planParaCamiones(1).id).toBe('basico');
    expect(planParaCamiones(3).id).toBe('basico');
  });
  it('4-10 camiones → flota', () => {
    expect(planParaCamiones(4).id).toBe('flota');
    expect(planParaCamiones(10).id).toBe('flota');
  });
  it('11+ también cae en flota (el más alto)', () => {
    expect(planParaCamiones(15).id).toBe('flota');
  });
});

describe('montoMensual', () => {
  it('demo = $0', () => {
    expect(montoMensual(0)).toBe(0);
  });
  it('1 camión básico = $20.000', () => {
    expect(montoMensual(1)).toBe(20000);
  });
  it('3 camiones básico = $60.000', () => {
    expect(montoMensual(3)).toBe(60000);
  });
  it('4 camiones flota = $60.000 (4 × $15.000)', () => {
    expect(montoMensual(4)).toBe(60000);
  });
  it('10 camiones flota = $150.000', () => {
    expect(montoMensual(10)).toBe(150000);
  });
});

describe('conceptoSuscripcion', () => {
  it('incluye nombre del plan, cantidad y empresa', () => {
    const c = conceptoSuscripcion('Transportes Pérez', 3);
    expect(c).toContain('Básico');
    expect(c).toContain('3 camiones');
    expect(c).toContain('Transportes Pérez');
  });
  it('singular para 1 camión', () => {
    const c = conceptoSuscripcion('Test', 1);
    expect(c).toContain('1 camión');
    expect(c).not.toContain('camiones');
  });
});

describe('PLANES integridad', () => {
  it('hay exactamente 3 planes', () => {
    expect(PLANES).toHaveLength(3);
  });
  it('todos tienen id, nombre y features no vacíos', () => {
    for (const p of PLANES) {
      expect(p.id).toBeTruthy();
      expect(p.nombre).toBeTruthy();
      expect(p.features.length).toBeGreaterThan(0);
    }
  });
  it('demo es gratis, los demás tienen precio > 0', () => {
    expect(PLANES[0].precioPorCamion).toBe(0);
    expect(PLANES[1].precioPorCamion).toBeGreaterThan(0);
    expect(PLANES[2].precioPorCamion).toBeGreaterThan(0);
  });
  it('flota es más barato por camión que básico (descuento volumen)', () => {
    expect(PLANES[2].precioPorCamion).toBeLessThan(PLANES[1].precioPorCamion);
  });
});
