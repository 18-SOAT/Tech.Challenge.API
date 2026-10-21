import type {
  Prisma,
  Employee as PrismaEmployee,
} from '../../../../generated/prisma/client.js';
import { Employee } from '../../domain/entities/employee.entity.js';
import type { EmployeeRole } from '../../domain/enums/employee-role.enum.js';

// Toda leitura de Employee traz o e-mail de login do User (JOIN), só o campo usado.
export const withUserEmail = {
  user: { select: { email: true } },
} satisfies Prisma.EmployeeInclude;

type EmployeeRecord = PrismaEmployee & { user: { email: string } };

export class EmployeeMapper {
  static toEntity(record: EmployeeRecord): Employee {
    return Employee.restore({
      id: record.id,
      userId: record.userId,
      name: record.name,
      email: record.user.email,
      role: record.role as EmployeeRole,
    });
  }

  // Sem e-mail: ele é gravado no User (UserMapper), não em `employees`.
  static toObject(entity: Employee): Prisma.EmployeeUncheckedCreateInput {
    return {
      id: entity.idValue,
      userId: entity.userIdValue,
      name: entity.nameValue,
      role: entity.roleValue,
    };
  }
}
