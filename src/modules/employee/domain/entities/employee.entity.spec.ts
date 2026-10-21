import { describe, expect, it } from 'bun:test';
import { Email } from '../../../../shared/domain/value-objects/email.vo.js';
import { EmployeeRole } from '../enums/employee-role.enum.js';
import { EmployeeErrorCode } from '../errors/employee.error.js';
import { Employee } from './employee.entity.js';

describe('Employee', () => {
  const create = (role = EmployeeRole.MECHANIC, name = '  Maria Souza ') =>
    Employee.create({
      userId: 'user-1',
      name,
      email: Email.create('maria@oficina.com'),
      role,
    });

  describe('create', () => {
    it('nasce com id, ligado ao User, com o nome aparado', () => {
      const employee = create();

      expect(employee.idValue).toBeString();
      expect(employee.userIdValue).toBe('user-1');
      expect(employee.nameValue).toBe('Maria Souza');
      expect(employee.emailValue).toBe('maria@oficina.com');
      expect(employee.roleValue).toBe(EmployeeRole.MECHANIC);
    });

    it('rejeita nome vazio', () => {
      expect(() => create(EmployeeRole.MECHANIC, '   ')).toThrow(
        expect.objectContaining({ code: EmployeeErrorCode.INVALID_NAME }),
      );
    });
  });

  describe('changeRole', () => {
    it('promove MECHANIC a ADMIN', () => {
      const employee = create(EmployeeRole.MECHANIC);
      employee.changeRole(EmployeeRole.ADMIN, 1);
      expect(employee.roleValue).toBe(EmployeeRole.ADMIN);
    });

    it('rebaixa um ADMIN quando há outro', () => {
      const employee = create(EmployeeRole.ADMIN);
      employee.changeRole(EmployeeRole.MECHANIC, 2);
      expect(employee.roleValue).toBe(EmployeeRole.MECHANIC);
    });

    it('não rebaixa o último ADMIN', () => {
      const employee = create(EmployeeRole.ADMIN);

      expect(() => employee.changeRole(EmployeeRole.MECHANIC, 1)).toThrow(
        expect.objectContaining({ code: EmployeeErrorCode.LAST_ADMIN }),
      );
      expect(employee.roleValue).toBe(EmployeeRole.ADMIN);
    });
  });
});
