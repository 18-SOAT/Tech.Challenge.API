import { DomainError } from './domain.error.js';

export enum SharedErrorCode {
  INVALID_EMAIL = 'SHARED_INVALID_EMAIL',
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
}
