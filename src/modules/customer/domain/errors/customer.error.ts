import { DomainError } from '../../../../shared/domain/errors/domain.error.js';

export enum CustomerErrorCode {
  INVALID_DOCUMENT = 'CUSTOMER_INVALID_DOCUMENT',
  INVALID_PHONE = 'CUSTOMER_INVALID_PHONE',
  DOCUMENT_ALREADY_IN_USE = 'CUSTOMER_DOCUMENT_ALREADY_IN_USE',
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

  static documentAlreadyInUse(): CustomerError {
    return new CustomerError(
      CustomerErrorCode.DOCUMENT_ALREADY_IN_USE,
      'CPF/CNPJ já cadastrado.',
    );
  }
}
