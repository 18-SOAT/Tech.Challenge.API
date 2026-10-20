import { SharedError } from '../errors/shared.error.js';

// Folga para o ruído do ponto flutuante: 19.99 * 100 = 1998.9999999999998.
const EPSILON = 1e-6;

// Reais com 2 casas, ≥ 0. Guarda centavos inteiros por dentro: soma e multiplicação
// de orçamento (#11) ficam exatas, sem o 0.1 + 0.2 = 0.30000000000000004 do float.
export class Money {
  private constructor(readonly cents: number) {}

  static fromReais(amount: number): Money {
    const cents = Math.round(amount * 100);
    if (
      !Number.isFinite(amount) ||
      amount < 0 ||
      Math.abs(amount * 100 - cents) > EPSILON
    ) {
      throw SharedError.invalidMoney();
    }
    return new Money(cents);
  }

  static fromCents(cents: number): Money {
    if (!Number.isSafeInteger(cents) || cents < 0) {
      throw SharedError.invalidMoney();
    }
    return new Money(cents);
  }

  // Valor em reais, como trafega na API.
  get value(): number {
    return this.cents / 100;
  }

  // Forma decimal exata ("89.90"), usada para gravar no Decimal(10,2) do banco.
  toDecimalString(): string {
    return (this.cents / 100).toFixed(2);
  }

  equals(other: Money): boolean {
    return this.cents === other.cents;
  }
}
