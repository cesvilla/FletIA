import { describe, it, expect } from 'vitest';
import { normalizarWhatsapp, whatsappPlausible, linkWhatsapp } from '../whatsapp';

describe('normalizarWhatsapp', () => {
  it('quita espacios, guiones y paréntesis', () => {
    expect(normalizarWhatsapp('11 2345-6789')).toBe('541123456789');
  });
  it('respeta un número que ya tiene código 54', () => {
    expect(normalizarWhatsapp('+54 9 11 2345 6789')).toBe('5491123456789');
  });
  it('saca el 0 troncal de larga distancia', () => {
    expect(normalizarWhatsapp('0351 155 123456')).toBe('54351155123456');
  });
  it('saca el 00 internacional', () => {
    expect(normalizarWhatsapp('0054 11 2345 6789')).toBe('541123456789');
  });
  it('string vacío o basura → vacío', () => {
    expect(normalizarWhatsapp('')).toBe('');
    expect(normalizarWhatsapp('abc')).toBe('');
  });
});

describe('whatsappPlausible', () => {
  it('un celular AR normal es plausible', () => {
    expect(whatsappPlausible('11 2345-6789')).toBe(true);
    expect(whatsappPlausible('+54 9 11 2345 6789')).toBe(true);
  });
  it('un número muy corto no es plausible', () => {
    expect(whatsappPlausible('123')).toBe(false);
  });
});

describe('linkWhatsapp', () => {
  it('arma el link wa.me con dígitos', () => {
    expect(linkWhatsapp('11 2345-6789')).toBe('https://wa.me/541123456789');
  });
  it('codifica el texto', () => {
    const l = linkWhatsapp('1123456789', 'Hola Juan!');
    expect(l).toContain('https://wa.me/541123456789?text=');
    expect(l).toContain('Hola%20Juan');
  });
});
