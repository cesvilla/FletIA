import { describe, it, expect } from 'vitest';
import {
  mediana, medianaVigente, parseNumAR, parsePreciosSurtidores, factorRegion,
  type RegistroPrecio,
} from '../precios';

describe('mediana', () => {
  it('lista impar: el del medio', () => {
    expect(mediana([1, 3, 2])).toBe(2);
  });
  it('lista par: promedio redondeado de los dos centrales', () => {
    expect(mediana([10, 20, 30, 40])).toBe(25);
  });
  it('lista vacía: 0', () => {
    expect(mediana([])).toBe(0);
  });
  it('robusta a outliers (a diferencia del promedio)', () => {
    // un valor disparado no mueve la mediana
    expect(mediana([2000, 2100, 2200, 2150, 999999])).toBe(2150);
  });
});

describe('medianaVigente', () => {
  const desde = '2026-01-01';

  // Helper para generar registros
  const reg = (idempresa: string, precio: number, fecha: string): RegistroPrecio =>
    ({ idempresa, precio, fecha_vigencia: fecha });

  it('toma el precio MÁS RECIENTE por estación (registros ordenados desc)', () => {
    // 6 estaciones, cada una con su precio reciente primero
    const records = [
      reg('e1', 2200, '2026-05-01'), reg('e1', 1500, '2024-01-01'), // vieja se ignora
      reg('e2', 2300, '2026-05-02'),
      reg('e3', 2250, '2026-05-03'),
      reg('e4', 2280, '2026-05-04'),
      reg('e5', 2210, '2026-05-05'),
      reg('e6', 2260, '2026-05-06'),
    ];
    // medianas de [2200,2300,2250,2280,2210,2260] → ordenado [2200,2210,2250,2260,2280,2300] → (2250+2260)/2 = 2255
    expect(medianaVigente(records, desde)).toBe(2255);
  });

  it('descarta estaciones fuera de la ventana temporal (precios viejos 2017)', () => {
    const records = [
      reg('a', 50, '2017-01-01'),  // fuera de ventana
      reg('b', 55, '2018-01-01'),  // fuera de ventana
      reg('c', 2200, '2026-05-01'),
      reg('d', 2250, '2026-05-01'),
      reg('e', 2300, '2026-05-01'),
      reg('f', 2150, '2026-05-01'),
      reg('g', 2400, '2026-05-01'),
    ];
    // solo c..g (5 estaciones) entran → mediana de [2200,2250,2300,2150,2400] = 2250
    const m = medianaVigente(records, desde)!;
    expect(m).toBe(2250);
    expect(m).toBeGreaterThan(2000); // no contaminado por los $50 de 2017
  });

  it('devuelve null si hay menos de 5 estaciones válidas', () => {
    const records = [
      reg('a', 2200, '2026-05-01'),
      reg('b', 2250, '2026-05-01'),
      reg('c', 2300, '2026-05-01'),
      reg('d', 2150, '2026-05-01'),
    ]; // solo 4
    expect(medianaVigente(records, desde)).toBeNull();
  });

  it('ignora precios fuera de rango (0, negativos, absurdos)', () => {
    const records = [
      reg('a', 0, '2026-05-01'),        // inválido
      reg('b', -100, '2026-05-01'),     // inválido
      reg('c', 999999, '2026-05-01'),   // inválido (> PRECIO_MAX)
      reg('d', 2200, '2026-05-01'),
      reg('e', 2250, '2026-05-01'),
      reg('f', 2300, '2026-05-01'),
      reg('g', 2150, '2026-05-01'),
      reg('h', 2400, '2026-05-01'),
    ];
    // solo d..h (5 válidas) → mediana 2250
    expect(medianaVigente(records, desde)).toBe(2250);
  });

  it('no cuenta dos veces la misma estación', () => {
    const records = [
      reg('a', 2200, '2026-05-05'), reg('a', 2199, '2026-05-04'), reg('a', 2198, '2026-05-03'),
      reg('b', 2250, '2026-05-01'),
      reg('c', 2300, '2026-05-01'),
      reg('d', 2150, '2026-05-01'),
      reg('e', 2400, '2026-05-01'),
    ];
    // a aporta UNA sola vez (2200, la más reciente) → 5 estaciones
    expect(medianaVigente(records, desde)).toBe(2250);
  });

  it('parsea precios que vienen como string', () => {
    const records: RegistroPrecio[] = [
      { idempresa: 'a', precio: '2200', fecha_vigencia: '2026-05-01' },
      { idempresa: 'b', precio: '2250', fecha_vigencia: '2026-05-01' },
      { idempresa: 'c', precio: '2300', fecha_vigencia: '2026-05-01' },
      { idempresa: 'd', precio: '2150', fecha_vigencia: '2026-05-01' },
      { idempresa: 'e', precio: '2400', fecha_vigencia: '2026-05-01' },
    ];
    expect(medianaVigente(records, desde)).toBe(2250);
  });
});

describe('parseNumAR', () => {
  it('entero plano', () => expect(parseNumAR('2115')).toBe(2115));
  it('coma decimal', () => expect(parseNumAR('300,00')).toBe(300));
  it('punto decimal', () => expect(parseNumAR('168.40')).toBeCloseTo(168.4));
  it('limpia $ y espacios', () => expect(parseNumAR(' $ 2323 ')).toBe(2323));
  it('vacío → null', () => expect(parseNumAR('  ')).toBeNull());
});

describe('factorRegion', () => {
  it('NOA (Tucumán) ~ +9%', () => expect(factorRegion('Tucumán')).toBeCloseTo(1.09));
  it('acepta sin acento / mayúsculas', () => expect(factorRegion('SALTA')).toBeCloseTo(1.09));
  it('Centro = 1.0', () => expect(factorRegion('Buenos Aires')).toBe(1.0));
  it('sin provincia → asume NOA (base de clientes)', () => expect(factorRegion(null)).toBeCloseTo(1.09));
  it('provincia desconocida → 1.0', () => expect(factorRegion('Narnia')).toBe(1.0));
});

describe('parsePreciosSurtidores', () => {
  const html = `
    <table>
      <tr><td>2026</td><td>Enero</td><td>Febrero</td><td>Marzo</td><td>Abril</td><td>Mayo</td><td>Junio</td><td>Julio</td><td> </td><td> </td><td> </td><td> </td><td> </td></tr>
      <tr><td><strong>Super</strong></td><td>1566</td><td>1609</td><td>1999</td><td>1999</td><td>2037</td><td>2030</td><td> </td><td> </td><td> </td><td> </td><td> </td><td> </td></tr>
      <tr><td><strong>Gasoil</strong></td><td>1601</td><td>1658</td><td>2065</td><td>2060</td><td>2106</td><td>2115</td><td> </td><td> </td><td> </td><td> </td><td> </td><td> </td></tr>
      <tr><td><strong>Euro</strong></td><td>1809</td><td>1861</td><td>2271</td><td>2266</td><td>2316</td><td>2323</td><td> </td><td> </td><td> </td><td> </td><td> </td><td> </td></tr>
    </table>`;

  it('toma el mes pedido (Junio idx 5)', () => {
    expect(parsePreciosSurtidores(html, 2026, 5)).toEqual({ comun: 2115, premium: 2323 });
  });

  it('si el mes en curso está vacío, retrocede al último cargado', () => {
    // Julio (idx 6) está vacío → debe devolver Junio
    expect(parsePreciosSurtidores(html, 2026, 6)).toEqual({ comun: 2115, premium: 2323 });
  });

  it('null si no existe la tabla del año', () => {
    expect(parsePreciosSurtidores(html, 2099, 0)).toBeNull();
  });
});
