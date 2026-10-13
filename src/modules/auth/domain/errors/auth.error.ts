import { DomainError } from '../../../../shared/domain/errors/domain.error.js';

export enum AuthErrorCode {
  INVALID_CREDENTIALS = 'AUTH_INVALID_CREDENTIALS',
  TOKEN_MISSING = 'AUTH_TOKEN_MISSING',
  TOKEN_INVALID = 'AUTH_TOKEN_INVALID',
  USER_UNAVAILABLE = 'AUTH_USER_UNAVAILABLE',
  FORBIDDEN = 'AUTH_FORBIDDEN',
}

export class AuthError extends DomainError {
  private constructor(
    readonly code: AuthErrorCode,
    message: string,
  ) {
    super(message);
  }

  // Mensagem única pra e-mail inexistente, senha errada, inativo ou sem perfil:
  // não revela qual foi o caso.
  static invalidCredentials(): AuthError {
    return new AuthError(
      AuthErrorCode.INVALID_CREDENTIALS,
      'Credenciais inválidas.',
    );
  }

  static tokenMissing(): AuthError {
    return new AuthError(
      AuthErrorCode.TOKEN_MISSING,
      'Token de acesso ausente.',
    );
  }

  static tokenInvalid(): AuthError {
    return new AuthError(
      AuthErrorCode.TOKEN_INVALID,
      'Token de acesso inválido ou expirado.',
    );
  }

  static userUnavailable(): AuthError {
    return new AuthError(
      AuthErrorCode.USER_UNAVAILABLE,
      'Usuário não encontrado ou inativo.',
    );
  }

  static forbidden(): AuthError {
    return new AuthError(
      AuthErrorCode.FORBIDDEN,
      'Acesso não permitido para este usuário.',
    );
  }
}
