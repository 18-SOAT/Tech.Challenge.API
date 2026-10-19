import { describe, expect, it } from 'bun:test';
import { VehicleErrorCode } from '../errors/vehicle.error.js';
import { LicensePlate } from '../value-objects/license-plate.vo.js';
import { Vehicle } from './vehicle.entity.js';

const nextYear = new Date().getFullYear() + 1;

const make = (
  overrides: Partial<{ brand: string; model: string; year: number }> = {},
) =>
  Vehicle.create({
    customerId: 'customer-1',
    plate: LicensePlate.create('abc-1d23'),
    brand: ' Fiat ',
    model: ' Uno ',
    year: 2015,
    ...overrides,
  });

describe('Vehicle', () => {
  it('create gera id, normaliza placa e faz trim de marca/modelo', () => {
    const vehicle = make();

    expect(vehicle.idValue).toBeTruthy();
    expect(vehicle.customerIdValue).toBe('customer-1');
    expect(vehicle.plateValue).toBe('ABC1D23');
    expect(vehicle.brandValue).toBe('Fiat');
    expect(vehicle.modelValue).toBe('Uno');
    expect(vehicle.yearValue).toBe(2015);
  });

  it('aceita ano-modelo do ano seguinte', () => {
    expect(make({ year: nextYear }).yearValue).toBe(nextYear);
  });

  it.each([1899, nextYear + 1, 2015.5])('rejeita ano %p', (year) => {
    expect(() => make({ year })).toThrow(
      expect.objectContaining({ code: VehicleErrorCode.INVALID_YEAR }),
    );
  });

  it('rejeita marca e modelo vazios', () => {
    expect(() => make({ brand: '  ' })).toThrow(
      expect.objectContaining({ code: VehicleErrorCode.INVALID_BRAND }),
    );
    expect(() => make({ model: '' })).toThrow(
      expect.objectContaining({ code: VehicleErrorCode.INVALID_MODEL }),
    );
  });

  describe('update', () => {
    it('altera só os campos informados', () => {
      const vehicle = make();

      vehicle.update({ plate: LicensePlate.create('ABC1C34'), year: 2016 });

      expect(vehicle.plateValue).toBe('ABC1C34');
      expect(vehicle.yearValue).toBe(2016);
      expect(vehicle.brandValue).toBe('Fiat');
      expect(vehicle.customerIdValue).toBe('customer-1');
    });

    it('campo inválido não altera nada (nem os válidos)', () => {
      const vehicle = make();

      expect(() =>
        vehicle.update({ brand: 'VW', model: 'Gol', year: 1800 }),
      ).toThrow(
        expect.objectContaining({ code: VehicleErrorCode.INVALID_YEAR }),
      );
      expect(vehicle.brandValue).toBe('Fiat');
      expect(vehicle.modelValue).toBe('Uno');
    });
  });

  it('restore reconstrói a partir da persistência', () => {
    const vehicle = Vehicle.restore({
      id: 'vehicle-1',
      customerId: 'customer-1',
      plate: 'ABC1234',
      brand: 'Fiat',
      model: 'Uno',
      year: 2010,
    });

    expect(vehicle.idValue).toBe('vehicle-1');
    expect(vehicle.plateValue).toBe('ABC1234');
  });
});
