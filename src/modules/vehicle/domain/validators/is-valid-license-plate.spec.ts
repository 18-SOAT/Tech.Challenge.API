import { describe, expect, it } from 'bun:test';
import {
  isValidLicensePlate,
  normalizeLicensePlate,
} from './is-valid-license-plate.js';

describe('isValidLicensePlate', () => {
  it.each([
    'ABC1234', // padrão antigo
    'ABC1D23', // Mercosul
    'abc-1234', // minúscula e hífen
    ' abc 1d23 ',
  ])('aceita %p', (plate) => {
    expect(isValidLicensePlate(plate)).toBeTrue();
  });

  it.each([
    'ABCD123', // 4 letras
    'AB12345', // 2 letras
    'ABC123', // curta
    'ABC12345', // longa
    'ABC1DD3', // Mercosul com 2 letras no fim
    'ABC.1234', // separador não aceito
    '',
  ])('rejeita %p', (plate) => {
    expect(isValidLicensePlate(plate)).toBeFalse();
  });
});

describe('normalizeLicensePlate', () => {
  it('deixa maiúscula e remove hífen e espaços', () => {
    expect(normalizeLicensePlate(' abc-1d23 ')).toBe('ABC1D23');
  });
});
