import { DomainError } from '../../../../shared/domain/errors/domain.error.js';

export enum UserErrorCode {
  EMAIL_ALREADY_IN_USE = 'USER_EMAIL_ALREADY_IN_USE',
  INVALID_PASSWORD = 'USER_INVALID_PASSWORD',
}

export class UserError extends DomainError {
  private constructor(
    readonly code: UserErrorCode,
    message: string,
  ) {
    super(message);
  }

  static emailAlreadyInUse(): UserError {
    return new UserError(
      UserErrorCode.EMAIL_ALREADY_IN_USE,
      'E-mail já cadastrado.',
    );
  }

  static passwordTooShort(minLength: number): UserError {
    return new UserError(
      UserErrorCode.INVALID_PASSWORD,
      `A senha deve ter no mínimo ${minLength} caracteres.`,
    );
  }

  static passwordTooLong(maxBytes: number): UserError {
    return new UserError(
      UserErrorCode.INVALID_PASSWORD,
      `A senha deve ter no máximo ${maxBytes} bytes.`,
    );
  }
}
