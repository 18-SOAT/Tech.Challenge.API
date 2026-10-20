import { t } from 'elysia';
import type { Employee } from '../../domain/entities/employee.entity.js';
import { EmployeeRole } from '../../domain/enums/employee-role.enum.js';

// Whitelist: o `userId` (vínculo interno com o login) não sai.
export class EmployeeResponseDto {
  private constructor(
    readonly id: string,
    readonly name: string,
    readonly email: string,
    readonly role: EmployeeRole,
  ) {}

  static fromEntity(employee: Employee): EmployeeResponseDto {
    return new EmployeeResponseDto(
      employee.idValue,
      employee.nameValue,
      employee.emailValue,
      employee.roleValue,
    );
  }
}

export const EmployeeResponseSchema = t.Object(
  {
    id: t.String({ format: 'uuid', description: 'Id do Employee (UUID v7)' }),
    name: t.String({ examples: ['Maria Souza'] }),
    email: t.String({ format: 'email', description: 'E-mail de login' }),
    role: t.Enum(EmployeeRole),
  },
  { title: 'Employee' },
);
