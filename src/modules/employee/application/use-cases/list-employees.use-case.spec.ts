import { beforeEach, describe, expect, it } from 'bun:test';
import { InMemoryEmployeeRepository } from '../../../../../test/fakes/in-memory-employee.repository.js';
import { Employee } from '../../domain/entities/employee.entity.js';
import { EmployeeRole } from '../../domain/enums/employee-role.enum.js';
import { ListEmployeesUseCase } from './list-employees.use-case.js';

describe('ListEmployeesUseCase', () => {
  let employees: InMemoryEmployeeRepository;
  let useCase: ListEmployeesUseCase;

  const add = (id: string, name: string, role: EmployeeRole) =>
    employees.items.push(
      Employee.restore({
        id,
        userId: `user-${id}`,
        name,
        email: `${id}@oficina.com`,
        role,
      }),
    );

  beforeEach(() => {
    employees = new InMemoryEmployeeRepository();
    useCase = new ListEmployeesUseCase(employees);
    add('1', 'Paulo Lima', EmployeeRole.MECHANIC);
    add('2', 'Ana Souza', EmployeeRole.ADMIN);
    add('3', 'Bruno Souza', EmployeeRole.MECHANIC);
  });

  it('pagina em ordem de nome', async () => {
    const page = await useCase.execute({ page: 1, limit: 2 });

    expect(page.total).toBe(3);
    expect(page.items.map((e) => e.nameValue)).toStrictEqual([
      'Ana Souza',
      'Bruno Souza',
    ]);
  });

  it('filtra por papel e por parte do nome (aparado)', async () => {
    const page = await useCase.execute({
      page: 1,
      limit: 10,
      role: EmployeeRole.MECHANIC,
      name: '  souza ',
    });

    expect(page.items.map((e) => e.idValue)).toStrictEqual(['3']);
  });

  it('nome só com espaços não filtra', async () => {
    const page = await useCase.execute({ page: 1, limit: 10, name: '   ' });
    expect(page.total).toBe(3);
  });
});
