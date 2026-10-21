import type { Prisma } from '../../../../generated/prisma/client.js';
import type { Page } from '../../../../shared/domain/pagination.js';
import type { PrismaClient } from '../../../../shared/infrastructure/prisma/client.js';
import { Employee } from '../../domain/entities/employee.entity.js';
import type { EmployeeRole } from '../../domain/enums/employee-role.enum.js';
import { EmployeeError } from '../../domain/errors/employee.error.js';
import type {
  EmployeeFilter,
  EmployeeRepository,
} from '../../domain/repositories/employee.repository.js';
import { EmployeeMapper, withUserEmail } from './employee.mapper.js';

export class PrismaEmployeeRepository implements EmployeeRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findById(id: string): Promise<Employee | null> {
    const record = await this.prisma.employee.findUnique({
      where: { id },
      include: withUserEmail,
    });
    return record ? EmployeeMapper.toEntity(record) : null;
  }

  async findByUserId(userId: string): Promise<Employee | null> {
    const record = await this.prisma.employee.findUnique({
      where: { userId },
      include: withUserEmail,
    });
    return record ? EmployeeMapper.toEntity(record) : null;
  }

  async findMany(filter: EmployeeFilter): Promise<Page<Employee>> {
    const where: Prisma.EmployeeWhereInput = {
      role: filter.role,
      name: filter.name
        ? { contains: filter.name, mode: 'insensitive' }
        : undefined,
    };
    // Lote na mesma transação: total e página vêm do mesmo snapshot. Ordem por nome:
    // é a lista de onde o Atendente escolhe o mecânico da OS.
    const [total, records] = await this.prisma.$transaction([
      this.prisma.employee.count({ where }),
      this.prisma.employee.findMany({
        where,
        include: withUserEmail,
        orderBy: [{ name: 'asc' }, { id: 'asc' }],
        skip: (filter.page - 1) * filter.limit,
        take: filter.limit,
      }),
    ]);
    return { items: records.map(EmployeeMapper.toEntity), total };
  }

  countByRole(role: EmployeeRole): Promise<number> {
    return this.prisma.employee.count({ where: { role } });
  }

  // Dois ADMINs se rebaixando ao mesmo tempo: cada use case contou "2 ADMINs" e os
  // dois passariam. O `FOR UPDATE` trava as linhas ADMIN: a segunda transação espera
  // a primeira terminar, relê (quem foi rebaixado já não é ADMIN) e é recusada.
  // Update condicional não basta aqui: o `WHERE` de cada UPDATE enxerga o snapshot
  // anterior ao commit da outra, e as duas passariam (ver repository.md#transações).
  async changeRole(employee: Employee): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      const admins = await tx.$queryRaw<{ id: string }[]>`
        SELECT id FROM employees WHERE role = 'ADMIN' FOR UPDATE`;
      const current = await tx.employee.findUnique({
        where: { id: employee.idValue },
        select: { role: true },
      });
      if (!current) throw EmployeeError.notFound();

      if (
        Employee.wouldLeaveNoAdmin(
          current.role as EmployeeRole,
          employee.roleValue,
          admins.length,
        )
      ) {
        throw EmployeeError.lastAdmin();
      }

      await tx.employee.update({
        where: { id: employee.idValue },
        data: { role: employee.roleValue },
      });
    });
  }
}
