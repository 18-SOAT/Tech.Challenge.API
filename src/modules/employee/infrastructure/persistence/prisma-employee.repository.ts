import type { PrismaClient } from '../../../../shared/infrastructure/prisma/client.js';
import type { Employee } from '../../domain/entities/employee.entity.js';
import type { EmployeeRepository } from '../../domain/repositories/employee.repository.js';
import { EmployeeMapper } from './employee.mapper.js';

export class PrismaEmployeeRepository implements EmployeeRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findByUserId(userId: string): Promise<Employee | null> {
    const record = await this.prisma.employee.findUnique({ where: { userId } });
    return record ? EmployeeMapper.toEntity(record) : null;
  }
}
