import { afterEach, beforeEach, describe, expect, it, spyOn } from 'bun:test';
import { makeUser } from '../../../../../test/fakes/auth-fixtures.js';
import { FakeAccessLinkMailer } from '../../../../../test/fakes/fake-access-link-mailer.js';
import { FakeAccessLinkTokenService } from '../../../../../test/fakes/fake-access-link-token-service.js';
import { FakePasswordHasher } from '../../../../../test/fakes/fake-password-hasher.js';
import { InMemoryEmployeeRepository } from '../../../../../test/fakes/in-memory-employee.repository.js';
import { InMemoryEmployeeRegistrationRepository } from '../../../../../test/fakes/in-memory-employee-registration.repository.js';
import { InMemoryUserRepository } from '../../../../../test/fakes/in-memory-user.repository.js';
import { flushBackground } from '../../../../../test/helpers/async.js';
import { SharedErrorCode } from '../../../../shared/domain/errors/shared.error.js';
import { UserType } from '../../../user/domain/enums/user-type.enum.js';
import { UserErrorCode } from '../../../user/domain/errors/user.error.js';
import { EmployeeRole } from '../../domain/enums/employee-role.enum.js';
import { EmployeeErrorCode } from '../../domain/errors/employee.error.js';
import { CreateEmployeeUseCase } from './create-employee.use-case.js';

describe('CreateEmployeeUseCase', () => {
  let users: InMemoryUserRepository;
  let employees: InMemoryEmployeeRepository;
  let tokens: FakeAccessLinkTokenService;
  let mailer: FakeAccessLinkMailer;
  let useCase: CreateEmployeeUseCase;

  const input = {
    name: 'Maria Souza',
    email: 'Maria@Oficina.com',
    role: EmployeeRole.MECHANIC,
  };

  beforeEach(() => {
    users = new InMemoryUserRepository();
    employees = new InMemoryEmployeeRepository();
    tokens = new FakeAccessLinkTokenService();
    mailer = new FakeAccessLinkMailer();
    useCase = new CreateEmployeeUseCase(
      users,
      new InMemoryEmployeeRegistrationRepository(users, employees),
      new FakePasswordHasher(),
      tokens,
      mailer,
    );
  });

  it('cria User EMPLOYEE + Employee ligados, com o e-mail normalizado', async () => {
    const employee = await useCase.execute(input);

    const [user] = users.items;
    expect(user?.typeValue).toBe(UserType.EMPLOYEE);
    expect(user?.emailValue).toBe('maria@oficina.com');
    expect(employees.items).toStrictEqual([employee]);
    expect(employee.userIdValue).toBe(user?.idValue as string);
    expect(employee.roleValue).toBe(EmployeeRole.MECHANIC);
  });

  it('a senha inicial é aleatória: nada previsível vai pro hash', async () => {
    await useCase.execute(input);
    await useCase.execute({ ...input, email: 'joao@oficina.com' });

    const [first, second] = users.items.map((user) => user.hashedPassword);
    expect(first).not.toBe(second);
  });

  it('envia o link de redefinição preso ao carimbo da senha inicial', async () => {
    await useCase.execute(input);
    await flushBackground();

    const user = users.items[0];
    expect(mailer.sent).toHaveLength(1);
    expect(mailer.sent[0]).toMatchObject({
      kind: 'employee-access',
      to: 'maria@oficina.com',
    });
    await expect(tokens.verify(mailer.lastToken)).resolves.toStrictEqual({
      kind: 'password-reset',
      userId: user?.idValue,
      passwordStamp: user?.passwordStamp,
    });
  });

  describe('falha no envio do e-mail', () => {
    let consoleError: ReturnType<typeof spyOn>;
    beforeEach(() => {
      consoleError = spyOn(console, 'error').mockImplementation(() => {});
    });
    afterEach(() => consoleError.mockRestore());

    it('o cadastro fica gravado e a falha só é logada', async () => {
      mailer.failNext = true;

      await expect(useCase.execute(input)).resolves.toBeDefined();
      await flushBackground();

      expect(employees.items).toHaveLength(1);
      expect(consoleError).toHaveBeenCalled();
    });
  });

  it('rejeita e-mail que já é login de alguém, sem gravar nada', async () => {
    users.items.push(makeUser({ email: 'maria@oficina.com' }));

    await expect(useCase.execute(input)).rejects.toThrow(
      expect.objectContaining({ code: UserErrorCode.EMAIL_ALREADY_IN_USE }),
    );
    expect(employees.items).toHaveLength(0);
  });

  it('rejeita e-mail inválido', async () => {
    await expect(
      useCase.execute({ ...input, email: 'nao-e-email' }),
    ).rejects.toThrow(
      expect.objectContaining({ code: SharedErrorCode.INVALID_EMAIL }),
    );
  });

  it('rejeita nome vazio, sem gravar nada', async () => {
    await expect(useCase.execute({ ...input, name: '  ' })).rejects.toThrow(
      expect.objectContaining({ code: EmployeeErrorCode.INVALID_NAME }),
    );
    expect(users.items).toHaveLength(0);
  });
});
