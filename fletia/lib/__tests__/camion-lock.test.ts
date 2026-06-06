import { describe, it, expect } from 'vitest';
import {
  normalizarPatente,
  validarPatenteAR,
  levenshtein,
  dentroVentanaGracia,
  validarCambioPatente,
  validarCambioCapacidad,
  estadoBloqueo,
  VENTANA_GRACIA_HORAS,
  COOLDOWN_CAMBIO_PATENTE_DIAS,
} from '../camion-lock';

// Helper: fecha hace N horas / días
const haceHoras = (h: number) => new Date(Date.now() - h * 3600 * 1000);
const haceDias  = (d: number) => haceHoras(d * 24);

describe('normalizarPatente', () => {
  it('saca guiones, espacios y pone uppercase', () => {
    expect(normalizarPatente('ab-123-cd')).toBe('AB123CD');
    expect(normalizarPatente('  abc 123  ')).toBe('ABC123');
  });
});

describe('validarPatenteAR', () => {
  it('acepta formato viejo (ABC123)', () => {
    expect(validarPatenteAR('ABC123')).toBe(true);
    expect(validarPatenteAR('abc-123')).toBe(true);
  });
  it('acepta formato Mercosur (AB123CD)', () => {
    expect(validarPatenteAR('AB123CD')).toBe(true);
    expect(validarPatenteAR('ab-123-cd')).toBe(true);
  });
  it('rechaza basura', () => {
    expect(validarPatenteAR('ABCD123')).toBe(false);
    expect(validarPatenteAR('12345')).toBe(false);
    expect(validarPatenteAR('')).toBe(false);
  });
});

describe('levenshtein', () => {
  it('mide distancia mínima de edición', () => {
    expect(levenshtein('AB123CD', 'AB123CD')).toBe(0);
    expect(levenshtein('AB123CD', 'AB123DC')).toBe(2); // swap = 2 sustituciones
    expect(levenshtein('AB123CD', 'AB123CE')).toBe(1);
    expect(levenshtein('ABC123',  'AB123CD')).toBeGreaterThan(2);
  });
});

describe('dentroVentanaGracia', () => {
  it('true durante las primeras 72 hs', () => {
    expect(dentroVentanaGracia(haceHoras(1))).toBe(true);
    expect(dentroVentanaGracia(haceHoras(71))).toBe(true);
  });
  it('false pasadas las 72 hs', () => {
    expect(dentroVentanaGracia(haceHoras(VENTANA_GRACIA_HORAS + 1))).toBe(false);
    expect(dentroVentanaGracia(haceDias(10))).toBe(false);
  });
});

describe('validarCambioPatente', () => {
  it('permite cualquier cambio válido dentro de la gracia', () => {
    const r = validarCambioPatente('AB123CD', 'XY987ZW', { createdAt: haceHoras(5) });
    expect(r.ok).toBe(true);
  });

  it('rechaza patente con formato inválido', () => {
    const r = validarCambioPatente('AB123CD', 'BASURA', { createdAt: haceHoras(5) });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.codigo).toBe('patente_invalida');
  });

  it('mismo valor → ok aunque esté bloqueado', () => {
    const r = validarCambioPatente('AB123CD', 'AB123CD', { createdAt: haceDias(60) });
    expect(r.ok).toBe(true);
  });

  it('typo (dist ≤ 2) → permitido fuera de gracia sin cooldown previo', () => {
    const r = validarCambioPatente('AB123CD', 'AB123DC', { createdAt: haceDias(30) });
    expect(r.ok).toBe(true);
  });

  it('cambio grande fuera de gracia → rechazado', () => {
    const r = validarCambioPatente('AB123CD', 'XY987ZW', { createdAt: haceDias(30) });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.codigo).toBe('patente_cambio_grande');
  });

  it('typo válido pero dentro del cooldown → rechazado', () => {
    const r = validarCambioPatente('AB123CD', 'AB123CE', {
      createdAt: haceDias(120),
      ultimoCambioPatente: haceDias(10),
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.codigo).toBe('patente_cooldown');
  });

  it('typo válido fuera del cooldown → permitido', () => {
    const r = validarCambioPatente('AB123CD', 'AB123CE', {
      createdAt: haceDias(200),
      ultimoCambioPatente: haceDias(COOLDOWN_CAMBIO_PATENTE_DIAS + 5),
    });
    expect(r.ok).toBe(true);
  });

  it('patente legacy con guiones se trata como SIN cambio si normaliza igual', () => {
    // Camion viejo guardado como "AB-123-CD"; el form manda "AB123CD".
    const r = validarCambioPatente('AB-123-CD', 'AB123CD', { createdAt: haceDias(300) });
    expect(r.ok).toBe(true);
  });

  it('patente legacy NO estándar se puede dejar igual aunque esté bloqueada', () => {
    // "TEST 1" no es formato AR válido, pero si no cambia, no se valida formato.
    const r = validarCambioPatente('TEST 1', 'TEST1', { createdAt: haceDias(300) });
    expect(r.ok).toBe(true);
  });
});

describe('validarCambioCapacidad', () => {
  it('cualquier cambio en gracia', () => {
    const r = validarCambioCapacidad(25, 12, { createdAt: haceHoras(10) });
    expect(r.ok).toBe(true);
  });
  it('±10% fuera de gracia → permitido', () => {
    expect(validarCambioCapacidad(25, 26, { createdAt: haceDias(30) }).ok).toBe(true);
    expect(validarCambioCapacidad(25, 27.5, { createdAt: haceDias(30) }).ok).toBe(true);
  });
  it('cambio > 10% fuera de gracia → rechazado', () => {
    const r = validarCambioCapacidad(25, 12, { createdAt: haceDias(30) });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.codigo).toBe('capacidad_cambio_grande');
  });
  it('mismo valor → ok siempre', () => {
    expect(validarCambioCapacidad(25, 25, { createdAt: haceDias(500) }).ok).toBe(true);
  });
});

describe('estadoBloqueo', () => {
  it('dentro de gracia: nada bloqueado', () => {
    const s = estadoBloqueo({ createdAt: haceHoras(10) });
    expect(s.dentroGracia).toBe(true);
    expect(s.patenteBloqueada).toBe(false);
    expect(s.capacidadBloqueada).toBe(false);
    expect(s.horasRestantesGracia).toBeGreaterThan(60);
  });

  it('fuera de gracia: bloqueados', () => {
    const s = estadoBloqueo({ createdAt: haceDias(10) });
    expect(s.dentroGracia).toBe(false);
    expect(s.patenteBloqueada).toBe(true);
    expect(s.capacidadBloqueada).toBe(true);
    expect(s.horasRestantesGracia).toBe(0);
  });

  it('cooldown activo informa días restantes', () => {
    const s = estadoBloqueo({
      createdAt: haceDias(120),
      ultimoCambioPatente: haceDias(30),
    });
    expect(s.cooldownPatenteActivo).toBe(true);
    expect(s.diasParaProximaCorreccion).toBeGreaterThan(0);
    expect(s.diasParaProximaCorreccion).toBeLessThanOrEqual(COOLDOWN_CAMBIO_PATENTE_DIAS - 30 + 1);
  });
});
