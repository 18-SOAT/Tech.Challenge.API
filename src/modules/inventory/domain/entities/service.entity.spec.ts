import { describe, expect, it } from 'bun:test';
import { Money } from '../../../../shared/domain/value-objects/money.vo.js';
import { ServiceErrorCode } from '../errors/service.error.js';
import { Service } from './service.entity.js';

const make = (
  overrides: Partial<{
    name: string;
    description: string | null;
    estimatedDurationMinutes: number | null;
  }> = {},
) =>
  Service.create({
    name: ' Troca de óleo ',
    description: ' Óleo e filtro ',
    price: Money.fromReais(89.9),
    estimatedDurationMinutes: 30,
    ...overrides,
  });

describe('Service', () => {
  it('create gera id, nasce ativo e faz trim de nome/descrição', () => {
    const service = make();

    expect(service.idValue).toBeTruthy();
    expect(service.nameValue).toBe('Troca de óleo');
    expect(service.descriptionValue).toBe('Óleo e filtro');
    expect(service.priceValue.cents).toBe(8990);
    expect(service.estimatedDurationMinutesValue).toBe(30);
    expect(service.isActive).toBe(true);
  });

  it('descrição e duração são opcionais; descrição em branco vira null', () => {
    const service = Service.create({
      name: 'Alinhamento',
      description: '   ',
      price: Money.fromReais(0),
    });

    expect(service.descriptionValue).toBeNull();
    expect(service.estimatedDurationMinutesValue).toBeNull();
  });

  it('rejeita nome vazio', () => {
    expect(() => make({ name: '  ' })).toThrow(
      expect.objectContaining({ code: ServiceErrorCode.INVALID_NAME }),
    );
  });

  it.each([0, -10, 12.5])('rejeita duração %p', (minutes) => {
    expect(() => make({ estimatedDurationMinutes: minutes })).toThrow(
      expect.objectContaining({
        code: ServiceErrorCode.INVALID_ESTIMATED_DURATION,
      }),
    );
  });

  describe('update', () => {
    it('altera só os campos informados e null limpa opcionais', () => {
      const service = make();

      service.update({
        price: Money.fromReais(99),
        description: null,
        estimatedDurationMinutes: null,
      });

      expect(service.priceValue.value).toBe(99);
      expect(service.descriptionValue).toBeNull();
      expect(service.estimatedDurationMinutesValue).toBeNull();
      expect(service.nameValue).toBe('Troca de óleo');
    });

    it('campo inválido não altera nada (nem os válidos)', () => {
      const service = make();

      expect(() =>
        service.update({ name: 'Revisão', estimatedDurationMinutes: 0 }),
      ).toThrow(
        expect.objectContaining({
          code: ServiceErrorCode.INVALID_ESTIMATED_DURATION,
        }),
      );
      expect(service.nameValue).toBe('Troca de óleo');
    });
  });

  it('deactivate e activate alternam o status', () => {
    const service = make();

    service.deactivate();
    expect(service.isActive).toBe(false);

    service.activate();
    expect(service.isActive).toBe(true);
  });

  it('restore reconstrói a partir da persistência', () => {
    const service = Service.restore({
      id: 'service-1',
      name: 'Troca de óleo',
      description: null,
      price: 89.9,
      estimatedDurationMinutes: null,
      active: false,
    });

    expect(service.idValue).toBe('service-1');
    expect(service.priceValue.cents).toBe(8990);
    expect(service.isActive).toBe(false);
  });
});
