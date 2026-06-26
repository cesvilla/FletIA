import { describe, it, expect } from 'vitest';
import {
  mediana, parseNumAR, splitCsvLine, parseCsvVigentes, medianaFiltrada,
  baseProvincia, provinciaCSV, type RegistroSurtidor,
} from '../precios';

describe('mediana', () => {
  it('lista impar: el del medio', () => expect(mediana([1, 3, 2])).toBe(2));
  it('lista par: promedio redondeado de los dos centrales', () => expect(mediana([10, 20, 30, 40])).toBe(25));
  it('lista vacía: 0', () => expect(mediana([])).toBe(0));
  it('robusta a outliers', () => expect(mediana([2000, 2100, 2200, 2150, 999999])).toBe(2150));
});

describe('parseNumAR', () => {
  it('entero plano', () => expect(parseNumAR('2190')).toBe(2190));
  it('decimal con punto', () => expect(parseNumAR('1320.721')).toBeCloseTo(1320.721));
  it('decimal con coma', () => expect(parseNumAR('300,00')).toBe(300));
  it('limpia $ y espacios', () => expect(parseNumAR(' $ 2323 ')).toBe(2323));
  it('vacío → null', () => expect(parseNumAR('  ')).toBeNull());
});

describe('splitCsvLine', () => {
  it('campos simples', () => {
    expect(splitCsvLine('a,b,c')).toEqual(['a', 'b', 'c']);
  });
  it('respeta comas dentro de comillas (geojson)', () => {
    const linea = 'YPF,Av. Siempre Viva 123,"{""type"":""Point"",""coordinates"":[-58.5,-34.6]}",fin';
    expect(splitCsvLine(linea)).toEqual([
      'YPF', 'Av. Siempre Viva 123', '{"type":"Point","coordinates":[-58.5,-34.6]}', 'fin',
    ]);
  });
  it('campo vacío entre comas', () => expect(splitCsvLine('a,,c')).toEqual(['a', '', 'c']));
});

describe('parseCsvVigentes', () => {
  const csv = [
    'indice_tiempo,idempresa,cuit,empresa,direccion,localidad,provincia,region,idproducto,producto,idtipohorario,tipohorario,precio,fecha_vigencia,idempresabandera,empresabandera,latitud,longitud,geojson',
    '2026-06,1,30-1-9,EST UNO,"Calle 1, esq 2",SMT,TUCUMAN,NOA,19,Gas Oil Grado 2,2,Diurno,2400,2026-06-10 10:00:00,1,YPF,-26,-65,"{""type"":""Point""}"',
    '2026-06,2,30-2-9,EST DOS,Calle 3,SMT,TUCUMAN,NOA,19,Gas Oil Grado 2,2,Diurno,2380,2026-06-09 10:00:00,2,SHELL,-26,-65,"{""type"":""Point""}"',
    '2026-06,3,30-3-9,EST TRES,Calle 4,SMT,TUCUMAN,NOA,19,Gas Oil Grado 2,2,Diurno,50,2026-06-08 10:00:00,3,PUMA,-26,-65,"{""type"":""Point""}"',
  ].join('\n');

  it('extrae provincia/producto/precio/fecha y respeta la coma en dirección', () => {
    const recs = parseCsvVigentes(csv);
    expect(recs.length).toBe(2); // la fila con precio 50 (fuera de rango) se descarta
    expect(recs[0]).toMatchObject({ provincia: 'TUCUMAN', producto: 'Gas Oil Grado 2', idempresa: '1', precio: 2400, fecha: '2026-06-10' });
  });

  it('CSV sin header válido → []', () => expect(parseCsvVigentes('foo,bar')).toEqual([]));
});

describe('medianaFiltrada', () => {
  const reg = (id: string, provincia: string, producto: string, precio: number, fecha: string): RegistroSurtidor =>
    ({ idempresa: id, provincia, producto, precio, fecha });
  const G2 = 'Gas Oil Grado 2';
  const recs: RegistroSurtidor[] = [
    reg('a', 'TUCUMAN', G2, 2400, '2026-06-10'),
    reg('b', 'TUCUMAN', G2, 2380, '2026-06-09'),
    reg('a', 'TUCUMAN', G2, 1000, '2024-01-01'), // misma estación 'a', vieja → ignorada
    reg('c', 'TUCUMAN', G2, 2420, '2026-06-08'),
    reg('d', 'TUCUMAN', G2, 2360, '2026-05-30'),
    reg('e', 'TUCUMAN', G2, 2410, '2026-06-05'),
    reg('f', 'TUCUMAN', G2, 2390, '2026-06-04'),
    reg('g', 'TUCUMAN', G2, 2370, '2026-06-03'),
    reg('h', 'TUCUMAN', G2, 2440, '2026-06-02'),
    reg('viejo', 'TUCUMAN', G2, 2000, '2023-01-01'), // fuera de ventana
  ];

  it('mediana por estación dentro de la ventana, dedupe e ignora viejas', () => {
    const m = medianaFiltrada(recs, r => r.provincia === 'TUCUMAN' && r.producto === G2, '2026-03-01');
    // 8 estaciones a..h → [2360,2370,2380,2390,2400,2410,2420,2440] → (2390+2400)/2 = 2395
    expect(m).not.toBeNull();
    expect(m!.n).toBe(8);
    expect(m!.med).toBe(2395);
  });

  it('null si no llega al mínimo de estaciones (8)', () => {
    const m = medianaFiltrada(recs, r => r.provincia === 'TUCUMAN' && r.producto === G2, '2026-06-05');
    // solo a,b,c,d,e (fecha ≥ 06-05) → 5 < 8 estaciones
    expect(m).toBeNull();
  });
});

describe('baseProvincia (ventana relativa a hoy + fallback regional)', () => {
  const hoy = new Date().toISOString().slice(0, 10);
  const reg = (id: string, provincia: string, producto: string, precio: number): RegistroSurtidor =>
    ({ idempresa: id, provincia, producto, precio, fecha: hoy });
  const G2 = 'Gas Oil Grado 2', G3 = 'Gas Oil Grado 3';

  it('usa la provincia exacta cuando hay muestra (≥8)', () => {
    const ids = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
    const recs = [
      ...ids.map((id, i) => reg(id, 'TUCUMAN', G2, 2360 + i * 10)), // 2360..2430 → med 2395
      ...ids.map((id, i) => reg(id, 'TUCUMAN', G3, 2630 + i * 10)), // 2630..2700 → med 2665
    ];
    const base = baseProvincia(recs, 'TUCUMAN');
    expect(base).not.toBeNull();
    expect(base!.comun).toBe(2395);
    expect(base!.premium).toBe(2665);
  });

  it('cae a la mediana de la REGIÓN cuando la provincia es rala', () => {
    // JUJUY (NOA) sin muestra propia; hay 8 estaciones NOA repartidas en la región
    const provsNOA = ['SALTA', 'TUCUMAN', 'CATAMARCA', 'SANTIAGO DEL ESTERO', 'SALTA', 'TUCUMAN', 'CATAMARCA', 'LA RIOJA'];
    const recs = provsNOA.map((p, i) => reg('e' + i, p, G2, 2380 + i * 5));
    const base = baseProvincia(recs, 'JUJUY');
    expect(base).not.toBeNull();
    expect(base!.comun).toBeGreaterThan(2300);
  });
});

describe('provinciaCSV (nombre UI → nombre del CSV)', () => {
  it('Tucumán → TUCUMAN', () => expect(provinciaCSV('Tucumán')).toBe('TUCUMAN'));
  it('CABA → CAPITAL FEDERAL', () => expect(provinciaCSV('CABA')).toBe('CAPITAL FEDERAL'));
  it('Córdoba → CORDOBA', () => expect(provinciaCSV('Córdoba')).toBe('CORDOBA'));
  it('sin provincia → default (TUCUMAN)', () => expect(provinciaCSV(null)).toBe('TUCUMAN'));
});
