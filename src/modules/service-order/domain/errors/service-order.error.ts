import { DomainError } from '../../../../shared/domain/errors/domain.error.js';

export enum ServiceOrderErrorCode {
  NOT_FOUND = 'SERVICE_ORDER_NOT_FOUND',
  NOT_IN_DIAGNOSIS = 'SERVICE_ORDER_NOT_IN_DIAGNOSIS',
  ALREADY_CLOSED = 'SERVICE_ORDER_ALREADY_CLOSED',
  INVALID_QUANTITY = 'SERVICE_ORDER_INVALID_QUANTITY',
  ITEM_NOT_FOUND = 'SERVICE_ORDER_ITEM_NOT_FOUND',
  INACTIVE_CATALOG_ITEM = 'SERVICE_ORDER_INACTIVE_CATALOG_ITEM',
  ASSIGNEE_NOT_MECHANIC = 'SERVICE_ORDER_ASSIGNEE_NOT_MECHANIC',
  NO_ASSIGNEE = 'SERVICE_ORDER_NO_ASSIGNEE',
  EMPTY_QUOTE = 'SERVICE_ORDER_EMPTY_QUOTE',
  NOT_ASSIGNED_TO_YOU = 'SERVICE_ORDER_NOT_ASSIGNED_TO_YOU',
  NOT_AWAITING_APPROVAL = 'SERVICE_ORDER_NOT_AWAITING_APPROVAL',
}

export class ServiceOrderError extends DomainError {
  private constructor(
    readonly code: ServiceOrderErrorCode,
    message: string,
  ) {
    super(message);
  }

  static notFound(): ServiceOrderError {
    return new ServiceOrderError(
      ServiceOrderErrorCode.NOT_FOUND,
      'Ordem de serviço não encontrada.',
    );
  }

  static notInDiagnosis(): ServiceOrderError {
    return new ServiceOrderError(
      ServiceOrderErrorCode.NOT_IN_DIAGNOSIS,
      'Os itens só podem mudar enquanto a OS está em diagnóstico.',
    );
  }

  static alreadyClosed(): ServiceOrderError {
    return new ServiceOrderError(
      ServiceOrderErrorCode.ALREADY_CLOSED,
      'A OS já foi finalizada ou rejeitada.',
    );
  }

  static invalidQuantity(): ServiceOrderError {
    return new ServiceOrderError(
      ServiceOrderErrorCode.INVALID_QUANTITY,
      'A quantidade deve ser um inteiro maior que zero.',
    );
  }

  static itemNotFound(): ServiceOrderError {
    return new ServiceOrderError(
      ServiceOrderErrorCode.ITEM_NOT_FOUND,
      'Item não encontrado nesta OS.',
    );
  }

  static inactiveCatalogItem(): ServiceOrderError {
    return new ServiceOrderError(
      ServiceOrderErrorCode.INACTIVE_CATALOG_ITEM,
      'Serviço ou produto inativo não entra em orçamento novo.',
    );
  }

  static assigneeNotMechanic(): ServiceOrderError {
    return new ServiceOrderError(
      ServiceOrderErrorCode.ASSIGNEE_NOT_MECHANIC,
      'Só um funcionário com papel MECHANIC pode ser o responsável pela OS.',
    );
  }

  static noAssignee(): ServiceOrderError {
    return new ServiceOrderError(
      ServiceOrderErrorCode.NO_ASSIGNEE,
      'Atribua um mecânico antes de concluir o diagnóstico.',
    );
  }

  static emptyQuote(): ServiceOrderError {
    return new ServiceOrderError(
      ServiceOrderErrorCode.EMPTY_QUOTE,
      'Inclua ao menos um serviço ou produto antes de concluir o diagnóstico.',
    );
  }

  static notAssignedToYou(): ServiceOrderError {
    return new ServiceOrderError(
      ServiceOrderErrorCode.NOT_ASSIGNED_TO_YOU,
      'Esta OS está atribuída a outro mecânico.',
    );
  }

  static notAwaitingApproval(): ServiceOrderError {
    return new ServiceOrderError(
      ServiceOrderErrorCode.NOT_AWAITING_APPROVAL,
      'O orçamento desta OS não está aguardando aprovação.',
    );
  }
}
