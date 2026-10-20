import { DomainError } from '../../../../shared/domain/errors/domain.error.js';

export enum EmployeeErrorCode {
  INVALID_NAME = 'EMPLOYEE_INVALID_NAME',
  NOT_FOUND = 'EMPLOYEE_NOT_FOUND',
  LAST_ADMIN = 'EMPLOYEE_LAST_ADMIN',
}

export class EmployeeError extends DomainError {
  private constructor(
    readonly code: EmployeeErrorCode,
    message: string,
  ) {
    super(message);
  }

  static invalidName(): EmployeeError {
    return new EmployeeError(
      EmployeeErrorCode.INVALID_NAME,
      'O nome do funcionário não pode ser vazio.',
    );
  }

  static notFound(): EmployeeError {
    return new EmployeeError(
      EmployeeErrorCode.NOT_FOUND,
      'Funcionário não encontrado.',
    );
  }

  static lastAdmin(): EmployeeError {
    return new EmployeeError(
      EmployeeErrorCode.LAST_ADMIN,
      'A oficina precisa de ao menos um ADMIN: promova outro funcionário antes de alterar o papel deste.',
    );
  }
}
