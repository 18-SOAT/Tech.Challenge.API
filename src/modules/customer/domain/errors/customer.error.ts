import { DomainError } from '../../../../shared/domain/errors/domain.error.js';

export enum CustomerErrorCode {
  INVALID_DOCUMENT = 'CUSTOMER_INVALID_DOCUMENT',
  INVALID_PHONE = 'CUSTOMER_INVALID_PHONE',
  INVALID_NAME = 'CUSTOMER_INVALID_NAME',
  DOCUMENT_ALREADY_IN_USE = 'CUSTOMER_DOCUMENT_ALREADY_IN_USE',
  NOT_FOUND = 'CUSTOMER_NOT_FOUND',
  HAS_LINKED_ACCESS = 'CUSTOMER_HAS_LINKED_ACCESS',
  HAS_DEPENDENCIES = 'CUSTOMER_HAS_DEPENDENCIES',
}

export class CustomerError extends DomainError {
  private constructor(
    readonly code: CustomerErrorCode,
    message: string,
  ) {
    super(message);
  }

  static invalidDocument(): CustomerError {
    return new CustomerError(
      CustomerErrorCode.INVALID_DOCUMENT,
      'CPF/CNPJ inválido.',
    );
  }

  static invalidPhone(): CustomerError {
    return new CustomerError(
      CustomerErrorCode.INVALID_PHONE,
      'Telefone inválido. Informe DDD + número.',
    );
  }

  static invalidName(): CustomerError {
    return new CustomerError(
      CustomerErrorCode.INVALID_NAME,
      'O nome do cliente não pode ser vazio.',
    );
  }

  static documentAlreadyInUse(): CustomerError {
    return new CustomerError(
      CustomerErrorCode.DOCUMENT_ALREADY_IN_USE,
      'CPF/CNPJ já cadastrado.',
    );
  }

  static notFound(): CustomerError {
    return new CustomerError(
      CustomerErrorCode.NOT_FOUND,
      'Cliente não encontrado.',
    );
  }

  static hasLinkedAccess(): CustomerError {
    return new CustomerError(
      CustomerErrorCode.HAS_LINKED_ACCESS,
      'Cliente com acesso ativo não pode ser excluído.',
    );
  }

  static hasDependencies(): CustomerError {
    return new CustomerError(
      CustomerErrorCode.HAS_DEPENDENCIES,
      'Cliente com veículos ou ordens de serviço não pode ser excluído.',
    );
  }
}
