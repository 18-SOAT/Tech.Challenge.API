import { describe, expect, it } from 'bun:test';
import { SharedError, SharedErrorCode } from '../errors/shared.error.js';
import { Money } from './money.vo.js';

describe('Money', () => {
  it('converte reais em centavos inteiros', () => {
    const money = Money.fromReais(89.9);

    expect(money.cents).toBe(8990);
    expect(money.value).toBe(89.9);
    expect(money.toDecimalString()).toBe('89.90');
  });

  it('absorve o ruído do float (19.99 * 100 não é 1999 exato)', () => {
    expect(Money.fromReais(19.99).cents).toBe(1999);
  });

  it('aceita zero (serviço cortesia)', () => {
    expect(Money.fromReais(0).toDecimalString()).toBe('0.00');
  });

  it('lança SharedError (DomainError), não Error genérico', () => {
    expect(() => Money.fromReais(-1)).toThrow(SharedError);
  });

  it.each([-0.01, 10.001, Number.NaN, Number.POSITIVE_INFINITY])(
    'rejeita %p reais',
    (amount) => {
      expect(() => Money.fromReais(amount)).toThrow(
        expect.objectContaining({ code: SharedErrorCode.INVALID_MONEY }),
      );
    },
  );

  it('fromCents exige inteiro ≥ 0', () => {
    expect(Money.fromCents(150).value).toBe(1.5);
    expect(() => Money.fromCents(1.5)).toThrow(SharedError);
    expect(() => Money.fromCents(-1)).toThrow(SharedError);
  });

  it('equals compara pelo valor', () => {
    expect(Money.fromReais(1.5).equals(Money.fromCents(150))).toBe(true);
    expect(Money.fromReais(1.5).equals(Money.fromCents(151))).toBe(false);
  });
});
