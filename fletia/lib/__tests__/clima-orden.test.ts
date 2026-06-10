import { describe, it, expect } from 'vitest';
import { ordenarYDeduplicarPuntos, MISMA_ZONA_KM, type PuntoClima } from '../clima-orden';

// Helper: arma un PuntoClima con clima de relleno. Para el orden/dedupe lo único
// que importa es el nombre y las coordenadas; el resto es ruido.
const punto = (
  nombre: string,
  lat: number,
  lon: number,
  extra: Partial<PuntoClima> = {},
): PuntoClima => ({
  lat, lon, nombre,
  temp: 20, sensacion: 20, lluvia: 0, viento: 10,
  condicion: 'Despejado', emoji: '☀️', factorImpacto: 0, impactoPct: 0,
  ...extra,
});

const nombres = (ps: PuntoClima[]) => ps.map(p => p.nombre);

describe('ordenarYDeduplicarPuntos — orden de ruta', () => {
  it('mantiene el origen primero y el destino último', () => {
    const r = ordenarYDeduplicarPuntos([
      punto('Salta', -24.79, -65.41),    // 0: origen
      punto('Tucumán', -26.82, -65.22),  // 1: intermedio
      punto('Córdoba', -31.42, -64.18),  // 2: destino
    ]);
    expect(r).toHaveLength(3);
    expect(r[0].nombre).toBe('Salta');
    expect(r[r.length - 1].nombre).toBe('Córdoba');
  });

  it('no rompe con arrays vacíos ni de un solo punto', () => {
    expect(ordenarYDeduplicarPuntos([])).toEqual([]);
    const uno = ordenarYDeduplicarPuntos([punto('Salta', -24.79, -65.41)]);
    expect(uno).toHaveLength(1);
    expect(uno[0].nombre).toBe('Salta');
  });

  it('expone el umbral de "misma zona"', () => {
    expect(MISMA_ZONA_KM).toBe(30);
  });
});

describe('ordenarYDeduplicarPuntos — regresión Tucumán → Misiones (commit b93f010)', () => {
  it('el destino fusionado con un punto cercano NO salta al principio', () => {
    // El destino (Posadas, Misiones) cae cerca de un punto intermedio de la
    // misma provincia ("Misiones"). Al deduplicar se fusionan y gana el nombre
    // corto, pero la tarjeta del destino DEBE quedar última, no saltar al frente
    // (el bug del viejo `indexOf`, que devolvía -1 para los objetos fusionados).
    const r = ordenarYDeduplicarPuntos([
      punto('San Miguel de Tucumán', -26.82, -65.22), // 0: origen
      punto('Santiago del Estero', -27.79, -64.26),   // 1: intermedio
      punto('Misiones', -27.40, -55.95),              // 2: intermedio cercano al destino
      punto('Posadas, Misiones', -27.36, -55.90),     // 3: destino
    ]);

    // Origen sigue primero…
    expect(r[0].nombre).toBe('San Miguel de Tucumán');
    expect(r[0].nombre).not.toBe('Misiones');
    // …y el destino sigue último: conserva sus coordenadas aunque el nombre
    // quedó como el más corto ("Misiones").
    const ultimo = r[r.length - 1];
    expect(ultimo.lat).toBeCloseTo(-27.36, 2);
    expect(ultimo.lon).toBeCloseTo(-55.90, 2);
    expect(ultimo.nombre).toBe('Misiones');
  });
});

describe('ordenarYDeduplicarPuntos — dedupe por nombre contenido', () => {
  it('"Tucumán" ⊂ "San Miguel de Tucumán": una sola tarjeta con el nombre más corto', () => {
    // Los dos puntos de Tucumán están a >30 km entre sí, así que lo único que
    // los fusiona es la contención de nombre (no la proximidad).
    const r = ordenarYDeduplicarPuntos([
      punto('Buenos Aires', -34.60, -58.38),          // 0: origen
      punto('San Miguel de Tucumán', -26.82, -65.22), // 1: intermedio
      punto('Tucumán', -26.40, -65.50),               // 2: intermedio (~54 km del anterior)
      punto('Salta', -24.79, -65.41),                 // 3: destino
    ]);
    expect(nombres(r)).toEqual(['Buenos Aires', 'Tucumán', 'Salta']);
    // Se conserva el clima/coords del punto que ya estaba (el de índice 1),
    // sólo cambia el nombre al más corto.
    const tuc = r.find(p => p.nombre === 'Tucumán')!;
    expect(tuc.lat).toBeCloseTo(-26.82, 2);
  });
});

describe('ordenarYDeduplicarPuntos — dedupe por proximidad (<30 km)', () => {
  it('fusiona dos nombres distintos a menos de 30 km y conserva el más corto', () => {
    const r = ordenarYDeduplicarPuntos([
      punto('Córdoba', -31.42, -64.18), // 0: origen
      punto('Rosario', -32.95, -60.66), // 1: intermedio
      punto('Funes', -32.92, -60.81),   // 2: intermedio (~14 km de Rosario)
      punto('Mendoza', -32.89, -68.84), // 3: destino
    ]);
    // Rosario + Funes → una sola tarjeta; gana el nombre más corto por longitud.
    expect(nombres(r)).toEqual(['Córdoba', 'Funes', 'Mendoza']);
  });

  it('respeta el umbral: a más de 30 km NO fusiona', () => {
    const r = ordenarYDeduplicarPuntos([
      punto('Córdoba', -31.42, -64.18),
      punto('Rosario', -32.95, -60.66),
      punto('Santa Fe', -31.63, -60.70), // ~150 km de Rosario
      punto('Mendoza', -32.89, -68.84),
    ]);
    expect(r).toHaveLength(4);
  });
});

describe('ordenarYDeduplicarPuntos — origen y destino nunca se descartan', () => {
  it('un intermedio pegado a un extremo se fusiona DENTRO del extremo, sin desplazarlo', () => {
    const r = ordenarYDeduplicarPuntos([
      punto('Córdoba', -31.42, -64.18),          // 0: origen
      punto('Villa Carlos Paz', -31.42, -64.30), // 1: ~11 km del origen
      punto('Luján de Cuyo', -33.03, -68.88),    // 2: ~16 km del destino
      punto('Mendoza', -32.89, -68.84),          // 3: destino
    ]);
    // Quedan exactamente las dos tarjetas de los extremos, en orden de ruta.
    expect(nombres(r)).toEqual(['Córdoba', 'Mendoza']);
    expect(r[0].lat).toBeCloseTo(-31.42, 2); // origen conservado
    expect(r[1].lat).toBeCloseTo(-32.89, 2); // destino conservado
  });
});
