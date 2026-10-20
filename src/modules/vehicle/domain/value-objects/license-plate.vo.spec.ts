import { describe, expect, it } from 'bun:test';
import { VehicleErrorCode } from '../errors/vehicle.error.js';
import { LicensePlate } from './license-plate.vo.js';

describe('LicensePlate', () => {
  it('normaliza para a forma canônica', () => {
    expect(LicensePlate.create('abc-1d23').value).toBe('ABC1D23');
  });

  it('distingue Mercosul do padrão antigo', () => {
    expect(LicensePlate.create('ABC1D23').isMercosul).toBeTrue();
    expect(LicensePlate.create('ABC1234').isMercosul).toBeFalse();
  });

  it('rejeita placa inválida com o erro do domínio', () => {
    expect(() => LicensePlate.create('ABCD123')).toThrow(
      expect.objectContaining({ code: VehicleErrorCode.INVALID_LICENSE_PLATE }),
    );
  });
});
