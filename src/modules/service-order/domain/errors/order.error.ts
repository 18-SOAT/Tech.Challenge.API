import { DomainError } from '../../../../shared/domain/errors/domain.error.js';

export enum OrderErrorCode {
  NOT_FOUND = 'ORDER_NOT_FOUND',
  ALREADY_DELIVERED = 'ORDER_ALREADY_DELIVERED',
  VEHICLE_HAS_OPEN_ORDER = 'ORDER_VEHICLE_HAS_OPEN_ORDER',
  VEHICLE_NOT_OWNED_BY_CUSTOMER = 'ORDER_VEHICLE_NOT_OWNED_BY_CUSTOMER',
  QUOTE_DECISION_FORBIDDEN = 'ORDER_QUOTE_DECISION_FORBIDDEN',
}

export class OrderError extends DomainError {
  private constructor(
    readonly code: OrderErrorCode,
    message: string,
  ) {
    super(message);
  }

  static notFound(): OrderError {
    return new OrderError(OrderErrorCode.NOT_FOUND, 'Ordem não encontrada.');
  }

  static alreadyDelivered(): OrderError {
    return new OrderError(
      OrderErrorCode.ALREADY_DELIVERED,
      'A ordem já foi entregue: abra uma nova ordem para o veículo.',
    );
  }

  static vehicleHasOpenOrder(): OrderError {
    return new OrderError(
      OrderErrorCode.VEHICLE_HAS_OPEN_ORDER,
      'O veículo já está na oficina com uma ordem aberta. Para um novo trabalho, abra um reparo adicional nela.',
    );
  }

  static vehicleNotOwnedByCustomer(): OrderError {
    return new OrderError(
      OrderErrorCode.VEHICLE_NOT_OWNED_BY_CUSTOMER,
      'O veículo informado não pertence a esse cliente.',
    );
  }

  static quoteDecisionForbidden(): OrderError {
    return new OrderError(
      OrderErrorCode.QUOTE_DECISION_FORBIDDEN,
      'Só o cliente da ordem ou um ADMIN aprova ou rejeita o orçamento.',
    );
  }
}
