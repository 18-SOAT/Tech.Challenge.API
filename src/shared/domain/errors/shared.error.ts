import { DomainError } from './domain.error.js';

export enum SharedErrorCode {
  INVALID_EMAIL = 'SHARED_INVALID_EMAIL',
  INVALID_MONEY = 'SHARED_INVALID_MONEY',
}

export class SharedError extends DomainError {
  private constructor(
    readonly code: SharedErrorCode,
    message: string,
  ) {
    super(message);
  }

  static invalidEmail(): SharedError {
    return new SharedError(SharedErrorCode.INVALID_EMAIL, 'E-mail inválido.');
  }

  static invalidMoney(): SharedError {
    return new SharedError(
      SharedErrorCode.INVALID_MONEY,
      'Valor inválido. Informe reais a partir de 0, com até 2 casas decimais.',
    );
  }
}
