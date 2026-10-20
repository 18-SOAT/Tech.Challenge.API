import { DomainError } from '../../../../shared/domain/errors/domain.error.js';

export enum ServiceErrorCode {
  INVALID_NAME = 'SERVICE_INVALID_NAME',
  INVALID_ESTIMATED_DURATION = 'SERVICE_INVALID_ESTIMATED_DURATION',
  NAME_ALREADY_IN_USE = 'SERVICE_NAME_ALREADY_IN_USE',
  NOT_FOUND = 'SERVICE_NOT_FOUND',
  IN_USE = 'SERVICE_IN_USE',
}

export class ServiceError extends DomainError {
  private constructor(
    readonly code: ServiceErrorCode,
    message: string,
  ) {
    super(message);
  }

  static invalidName(): ServiceError {
    return new ServiceError(
      ServiceErrorCode.INVALID_NAME,
      'O nome do serviço não pode ser vazio.',
    );
  }

  static invalidEstimatedDuration(): ServiceError {
    return new ServiceError(
      ServiceErrorCode.INVALID_ESTIMATED_DURATION,
      'A duração estimada deve ser um inteiro de minutos maior que zero.',
    );
  }

  static nameAlreadyInUse(): ServiceError {
    return new ServiceError(
      ServiceErrorCode.NAME_ALREADY_IN_USE,
      'Já existe um serviço com esse nome no catálogo.',
    );
  }

  static notFound(): ServiceError {
    return new ServiceError(
      ServiceErrorCode.NOT_FOUND,
      'Serviço não encontrado.',
    );
  }

  static inUse(): ServiceError {
    return new ServiceError(
      ServiceErrorCode.IN_USE,
      'Serviço já usado em ordens de serviço não pode ser excluído. Desative-o.',
    );
  }
}
