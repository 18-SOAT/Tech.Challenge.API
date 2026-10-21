import { beforeEach, describe, expect, it } from 'bun:test';
import { makeEmployee } from '../../../../../test/fakes/auth-fixtures.js';
import { InMemoryEmployeeRepository } from '../../../../../test/fakes/in-memory-employee.repository.js';
import { EmployeeRole } from '../../domain/enums/employee-role.enum.js';
import { EmployeeErrorCode } from '../../domain/errors/employee.error.js';
import { ChangeEmployeeRoleUseCase } from './change-employee-role.use-case.js';

describe('ChangeEmployeeRoleUseCase', () => {
  let employees: InMemoryEmployeeRepository;
  let useCase: ChangeEmployeeRoleUseCase;

  beforeEach(() => {
    employees = new InMemoryEmployeeRepository();
    useCase = new ChangeEmployeeRoleUseCase(employees);
    employees.items.push(
      makeEmployee('user-1', EmployeeRole.ADMIN, 'admin-1'),
      makeEmployee('user-2', EmployeeRole.MECHANIC, 'mechanic-1'),
    );
  });

  it('promove um MECHANIC e grava', async () => {
    const updated = await useCase.execute({
      id: 'mechanic-1',
      role: EmployeeRole.ADMIN,
    });

    expect(updated.roleValue).toBe(EmployeeRole.ADMIN);
    expect((await employees.findById('mechanic-1'))?.roleValue).toBe(
      EmployeeRole.ADMIN,
    );
  });

  it('rebaixa um ADMIN quando resta outro', async () => {
    await useCase.execute({ id: 'mechanic-1', role: EmployeeRole.ADMIN });

    const updated = await useCase.execute({
      id: 'admin-1',
      role: EmployeeRole.MECHANIC,
    });

    expect(updated.roleValue).toBe(EmployeeRole.MECHANIC);
    expect(await employees.countByRole(EmployeeRole.ADMIN)).toBe(1);
  });

  it('não rebaixa o último ADMIN', async () => {
    await expect(
      useCase.execute({ id: 'admin-1', role: EmployeeRole.MECHANIC }),
    ).rejects.toThrow(
      expect.objectContaining({ code: EmployeeErrorCode.LAST_ADMIN }),
    );
    expect((await employees.findById('admin-1'))?.roleValue).toBe(
      EmployeeRole.ADMIN,
    );
  });

  it('o repository barra a corrida que o use case não vê', async () => {
    // Dois ADMINs, e o use case contou 2; mas outro pedido rebaixou o segundo antes
    // de este gravar: a checagem no changeRole do repository é a última barreira.
    // Cópia própria (não a referência guardada no fake), como a leitura da outra requisição.
    employees.items.push(makeEmployee('user-3', EmployeeRole.ADMIN, 'admin-2'));
    const stale = makeEmployee('user-1', EmployeeRole.ADMIN, 'admin-1');
    stale.changeRole(EmployeeRole.MECHANIC, 2);
    await useCase.execute({ id: 'admin-2', role: EmployeeRole.MECHANIC });

    await expect(employees.changeRole(stale)).rejects.toThrow(
      expect.objectContaining({ code: EmployeeErrorCode.LAST_ADMIN }),
    );
  });

  it('mesmo papel: devolve sem alterar', async () => {
    const same = await useCase.execute({
      id: 'admin-1',
      role: EmployeeRole.ADMIN,
    });
    expect(same.roleValue).toBe(EmployeeRole.ADMIN);
  });

  it('lança notFound se não existir', async () => {
    await expect(
      useCase.execute({ id: 'missing', role: EmployeeRole.ADMIN }),
    ).rejects.toThrow(
      expect.objectContaining({ code: EmployeeErrorCode.NOT_FOUND }),
    );
  });
});
