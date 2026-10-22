import { Elysia, ValidationError } from 'elysia';
import { AuthErrorCode } from '../../../modules/auth/domain/errors/auth.error.js';
import { CustomerErrorCode } from '../../../modules/customer/domain/errors/customer.error.js';
import { EmployeeErrorCode } from '../../../modules/employee/domain/errors/employee.error.js';
import { ProductErrorCode } from '../../../modules/inventory/domain/errors/product.error.js';
import { ServiceErrorCode } from '../../../modules/inventory/domain/errors/service.error.js';
import { OrderErrorCode } from '../../../modules/service-order/domain/errors/order.error.js';
import { ServiceOrderErrorCode } from '../../../modules/service-order/domain/errors/service-order.error.js';
import { UserErrorCode } from '../../../modules/user/domain/errors/user.error.js';
import { VehicleErrorCode } from '../../../modules/vehicle/domain/errors/vehicle.error.js';
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
  [AuthErrorCode.ACCESS_LINK_INVALID]: 400,
  [UserErrorCode.EMAIL_ALREADY_IN_USE]: 409,
  [UserErrorCode.INVALID_PASSWORD]: 400,
  [EmployeeErrorCode.INVALID_NAME]: 400,
  [EmployeeErrorCode.NOT_FOUND]: 404,
  [EmployeeErrorCode.LAST_ADMIN]: 409,
  [CustomerErrorCode.INVALID_DOCUMENT]: 400,
  [CustomerErrorCode.INVALID_PHONE]: 400,
  [CustomerErrorCode.INVALID_NAME]: 400,
  [CustomerErrorCode.DOCUMENT_ALREADY_IN_USE]: 409,
  [CustomerErrorCode.NOT_FOUND]: 404,
  [CustomerErrorCode.HAS_LINKED_ACCESS]: 409,
  [CustomerErrorCode.ALREADY_HAS_ACCESS]: 409,
  [CustomerErrorCode.HAS_DEPENDENCIES]: 409,
  [VehicleErrorCode.INVALID_LICENSE_PLATE]: 400,
  [VehicleErrorCode.INVALID_BRAND]: 400,
  [VehicleErrorCode.INVALID_MODEL]: 400,
  [VehicleErrorCode.INVALID_YEAR]: 400,
  [VehicleErrorCode.LICENSE_PLATE_ALREADY_IN_USE]: 409,
  [VehicleErrorCode.NOT_FOUND]: 404,
  [VehicleErrorCode.HAS_SERVICE_ORDERS]: 409,
  [ServiceErrorCode.INVALID_NAME]: 400,
  [ServiceErrorCode.INVALID_ESTIMATED_DURATION]: 400,
  [ServiceErrorCode.NAME_ALREADY_IN_USE]: 409,
  [ServiceErrorCode.NOT_FOUND]: 404,
  [ServiceErrorCode.IN_USE]: 409,
  [ProductErrorCode.INVALID_SKU]: 400,
  [ProductErrorCode.INVALID_NAME]: 400,
  [ProductErrorCode.INVALID_MINIMUM_STOCK]: 400,
  [ProductErrorCode.INVALID_QUANTITY]: 400,
  [ProductErrorCode.ADJUSTMENT_REASON_REQUIRED]: 400,
  [ProductErrorCode.INSUFFICIENT_STOCK]: 409,
  [ProductErrorCode.SKU_ALREADY_IN_USE]: 409,
  [ProductErrorCode.NOT_FOUND]: 404,
  [ProductErrorCode.IN_USE]: 409,
  [OrderErrorCode.NOT_FOUND]: 404,
  [OrderErrorCode.ALREADY_DELIVERED]: 409,
  [OrderErrorCode.VEHICLE_HAS_OPEN_ORDER]: 409,
  [OrderErrorCode.VEHICLE_NOT_OWNED_BY_CUSTOMER]: 422,
  [OrderErrorCode.QUOTE_DECISION_FORBIDDEN]: 403,
  [OrderErrorCode.HAS_OPEN_SERVICE_ORDERS]: 409,
  [ServiceOrderErrorCode.NOT_FOUND]: 404,
  [ServiceOrderErrorCode.NOT_IN_DIAGNOSIS]: 409,
  [ServiceOrderErrorCode.ALREADY_CLOSED]: 409,
  [ServiceOrderErrorCode.INVALID_QUANTITY]: 400,
  [ServiceOrderErrorCode.ITEM_NOT_FOUND]: 404,
  [ServiceOrderErrorCode.INACTIVE_CATALOG_ITEM]: 409,
  [ServiceOrderErrorCode.ASSIGNEE_NOT_MECHANIC]: 422,
  [ServiceOrderErrorCode.NO_ASSIGNEE]: 409,
  [ServiceOrderErrorCode.EMPTY_QUOTE]: 409,
  [ServiceOrderErrorCode.NOT_ASSIGNED_TO_YOU]: 403,
  [ServiceOrderErrorCode.NOT_AWAITING_APPROVAL]: 409,
  [ServiceOrderErrorCode.NOT_IN_EXECUTION]: 409,
  [ServiceOrderErrorCode.CONCURRENT_UPDATE]: 409,
  [SharedErrorCode.INVALID_EMAIL]: 400,
  [SharedErrorCode.INVALID_MONEY]: 400,
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
