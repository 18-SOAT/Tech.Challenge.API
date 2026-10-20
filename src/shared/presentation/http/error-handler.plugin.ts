import { Elysia, ValidationError } from 'elysia';
import { AuthErrorCode } from '../../../modules/auth/domain/errors/auth.error.js';
import { CustomerErrorCode } from '../../../modules/customer/domain/errors/customer.error.js';
import { UserErrorCode } from '../../../modules/user/domain/errors/user.error.js';
import { DomainError } from '../../domain/errors/domain.error.js';
import { SharedErrorCode } from '../../domain/errors/shared.error.js';
import type { ApiErrorBody } from './envelope.js';

// Todo XxxErrorCode novo PRECISA de entrada aqui (o spec deste arquivo garante).
// Sem fallback silencioso: code sem mapa vira 500 + log — bug visível, não status
// adivinhado. Ver docs/code/patterns/error-handling.md.
export const STATUS_MAP: Record<string, number> = {
  [AuthErrorCode.INVALID_CREDENTIALS]: 401,
  [AuthErrorCode.TOKEN_MISSING]: 401,
  [AuthErrorCode.TOKEN_INVALID]: 401,
  [AuthErrorCode.USER_UNAVAILABLE]: 401,
  [AuthErrorCode.FORBIDDEN]: 403,
  [UserErrorCode.EMAIL_ALREADY_IN_USE]: 409,
  [UserErrorCode.INVALID_PASSWORD]: 400,
  [CustomerErrorCode.INVALID_DOCUMENT]: 400,
  [CustomerErrorCode.INVALID_PHONE]: 400,
  [CustomerErrorCode.INVALID_NAME]: 400,
  [CustomerErrorCode.DOCUMENT_ALREADY_IN_USE]: 409,
  [CustomerErrorCode.NOT_FOUND]: 404,
  [CustomerErrorCode.HAS_LINKED_ACCESS]: 409,
  [CustomerErrorCode.HAS_DEPENDENCIES]: 409,
  [SharedErrorCode.INVALID_EMAIL]: 400,
};

const INTERNAL_ERROR_MESSAGE = 'Erro interno.';

const body = (status: number, message: string): ApiErrorBody => ({
  data: null,
  message,
  status,
});

// Mensagem do `error` declarado no campo do schema TypeBox (ver docs/code/patterns/dto.md),
// ou uma genérica quando o schema não define.
function validationMessage(error: ValidationError): string {
  return typeof error.customError === 'string'
    ? error.customError
    : 'Dados de entrada inválidos.';
}

// `as: 'global'`: hooks de plugin valem só pras rotas do próprio plugin por padrão;
// o errorHandler precisa capturar as rotas de TODOS os módulos. Por isso também é o
// primeiro `.use()` do createApp.
export const errorHandler = new Elysia({ name: 'error-handler' }).onError(
  { as: 'global' },
  ({ code, error, set }) => {
    const fail = (status: number, message: string) => {
      set.status = status;
      return body(status, message);
    };

    if (error instanceof DomainError) {
      const status = STATUS_MAP[error.code];
      if (status) return fail(status, error.message);
      console.error(
        `[errorHandler] DomainError sem entrada no STATUS_MAP: ${error.code}`,
        error,
      );
      return fail(500, INTERNAL_ERROR_MESSAGE);
    }

    if (error instanceof ValidationError) {
      return fail(400, validationMessage(error));
    }
    if (code === 'NOT_FOUND') return fail(404, 'Rota não encontrada.');
    if (code === 'PARSE') return fail(400, 'Corpo da requisição malformado.');

    console.error('[errorHandler] erro não tratado', error);
    return fail(500, INTERNAL_ERROR_MESSAGE);
  },
);
