import { describe, it, expect } from 'vitest';
import { calcularPeajesEnRuta, PEAJES_AR, RADIO_DETECCION_KM } from '../peajes-ar';

describe('calcularPeajesEnRuta', () => {
  it('no detecta peajes en una ruta vacía / sin plazas cercanas', () => {
    // Punto en medio del océano Atlántico, lejos de toda plaza
    const polyline: [number, number][] = [
      [-40.0, -50.0],
      [-41.0, -49.0],
    ];
    const r = calcularPeajesEnRuta(polyline);
    expect(r.plazas).toHaveLength(0);
    expect(r.total).toBe(0);
  });

  it('detecta una plaza cuando el polyline pasa justo por encima', () => {
    const campana = PEAJES_AR.find(p => p.id === 'rn9_campana')!;
    const polyline: [number, number][] = [
      [campana.lat, campana.lon],
    ];
    const r = calcularPeajesEnRuta(polyline);
    expect(r.plazas.some(p => p.nombre === 'Campana')).toBe(true);
    expect(r.total).toBeGreaterThanOrEqual(campana.precioCamion);
  });

  it('el total es la suma de los precios de las plazas detectadas', () => {
    const campana = PEAJES_AR.find(p => p.id === 'rn9_campana')!;
    const ramallo = PEAJES_AR.find(p => p.id === 'rn9_ramallo')!;
    const polyline: [number, number][] = [
      [campana.lat, campana.lon],
      [ramallo.lat, ramallo.lon],
    ];
    const r = calcularPeajesEnRuta(polyline);
    const suma = r.plazas.reduce((s, p) => s + p.precio, 0);
    expect(r.total).toBe(suma);
  });

  it('no cuenta dos veces la misma plaza aunque haya varios puntos cerca', () => {
    const campana = PEAJES_AR.find(p => p.id === 'rn9_campana')!;
    const polyline: [number, number][] = [
      [campana.lat, campana.lon],
      [campana.lat + 0.001, campana.lon + 0.001],
      [campana.lat - 0.001, campana.lon - 0.001],
    ];
    const r = calcularPeajesEnRuta(polyline);
    const apariciones = r.plazas.filter(p => p.nombre === 'Campana').length;
    expect(apariciones).toBe(1);
  });

  it('respeta el radio de detección: un punto lejano no dispara la plaza', () => {
    const campana = PEAJES_AR.find(p => p.id === 'rn9_campana')!;
    // ~0.5° de latitud ≈ 55 km, muy por fuera del radio
    const polyline: [number, number][] = [
      [campana.lat + 0.5, campana.lon],
    ];
    const r = calcularPeajesEnRuta(polyline);
    expect(r.plazas.some(p => p.nombre === 'Campana')).toBe(false);
  });

  it('todas las plazas tienen datos válidos (precio positivo, coords en Argentina)', () => {
    for (const p of PEAJES_AR) {
      expect(p.precioCamion).toBeGreaterThan(0);
      // Latitudes de Argentina continental: aprox -22 a -55
      expect(p.lat).toBeLessThan(-21);
      expect(p.lat).toBeGreaterThan(-56);
      // Longitudes: aprox -53 a -74
      expect(p.lon).toBeLessThan(-53);
      expect(p.lon).toBeGreaterThan(-74);
    }
  });

  it('no hay IDs de plaza duplicados', () => {
    const ids = PEAJES_AR.map(p => p.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('el radio de detección por defecto es razonable (entre 1 y 3 km)', () => {
    expect(RADIO_DETECCION_KM).toBeGreaterThanOrEqual(1);
    expect(RADIO_DETECCION_KM).toBeLessThanOrEqual(3);
  });
});
