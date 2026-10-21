import { describe, expect, it } from 'bun:test';
import { makeEmployee } from '../../../../../test/fakes/auth-fixtures.js';
import { InMemoryEmployeeRepository } from '../../../../../test/fakes/in-memory-employee.repository.js';
import { EmployeeErrorCode } from '../../domain/errors/employee.error.js';
import { FindEmployeeByIdUseCase } from './find-employee-by-id.use-case.js';

describe('FindEmployeeByIdUseCase', () => {
  it('devolve o funcionário', async () => {
    const employees = new InMemoryEmployeeRepository();
    const employee = makeEmployee('user-1');
    employees.items.push(employee);

    await expect(
      new FindEmployeeByIdUseCase(employees).execute(employee.idValue),
    ).resolves.toBe(employee);
  });

  it('lança notFound se não existir', async () => {
    await expect(
      new FindEmployeeByIdUseCase(new InMemoryEmployeeRepository()).execute(
        'missing',
      ),
    ).rejects.toThrow(
      expect.objectContaining({ code: EmployeeErrorCode.NOT_FOUND }),
    );
  });
});
