import { beforeEach, describe, expect, it } from 'bun:test';
import {
  makeCustomer,
  makeUser,
} from '../../../../../test/fakes/auth-fixtures.js';
import { FakeAccessLinkTokenService } from '../../../../../test/fakes/fake-access-link-token-service.js';
import { FakePasswordHasher } from '../../../../../test/fakes/fake-password-hasher.js';
import { InMemoryCustomerRepository } from '../../../../../test/fakes/in-memory-customer.repository.js';
import { InMemoryCustomerAccessActivationRepository } from '../../../../../test/fakes/in-memory-customer-access-activation.repository.js';
import { InMemoryUserRepository } from '../../../../../test/fakes/in-memory-user.repository.js';
import { UserType } from '../../../user/domain/enums/user-type.enum.js';
import { UserErrorCode } from '../../../user/domain/errors/user.error.js';
import { AuthErrorCode } from '../../domain/errors/auth.error.js';
import { SetPasswordUseCase } from './set-password.use-case.js';

describe('SetPasswordUseCase', () => {
  let users: InMemoryUserRepository;
  let customers: InMemoryCustomerRepository;
  let activation: InMemoryCustomerAccessActivationRepository;
  let tokens: FakeAccessLinkTokenService;
  let hasher: FakePasswordHasher;
  let useCase: SetPasswordUseCase;

  const invalidLink = expect.objectContaining({
    code: AuthErrorCode.ACCESS_LINK_INVALID,
  });

  beforeEach(() => {
    users = new InMemoryUserRepository();
    customers = new InMemoryCustomerRepository();
    activation = new InMemoryCustomerAccessActivationRepository(
      users,
      customers,
    );
    tokens = new FakeAccessLinkTokenService();
    hasher = new FakePasswordHasher();
    useCase = new SetPasswordUseCase(
      tokens,
      customers,
      users,
      activation,
      hasher,
    );
  });

  const firstAccessToken = () =>
    tokens.sign({ kind: 'first-access', customerId: 'customer-1' });

  describe('primeiro acesso', () => {
    beforeEach(() => {
      customers.items.push(makeCustomer(null));
    });

    it('cria o User CUSTOMER com o e-mail do cliente e liga ao Customer', async () => {
      await useCase.execute({
        token: await firstAccessToken(),
        password: 'nova-senha',
      });

      const [user] = users.items;
      expect(user?.emailValue).toBe('joao@oficina.com');
      expect(user?.typeValue).toBe(UserType.CUSTOMER);
      expect(user?.hashedPassword).toBe('hashed:nova-senha');
      expect(customers.items[0]?.userIdValue).toBe(user?.idValue ?? '');
    });

    it('o link vale uma vez: o segundo uso é recusado', async () => {
      const token = await firstAccessToken();
      await useCase.execute({ token, password: 'nova-senha' });

      await expect(
        useCase.execute({ token, password: 'outra-senha' }),
      ).rejects.toThrow(invalidLink);
      expect(users.items).toHaveLength(1);
    });

    it('cliente inexistente (ex: excluído depois do envio): link inválido', async () => {
      customers.items.length = 0;
      await expect(
        useCase.execute({
          token: await firstAccessToken(),
          password: 'nova-senha',
        }),
      ).rejects.toThrow(invalidLink);
    });

    it('e-mail do cliente já é login de outra conta: 409 e nada é gravado', async () => {
      users.items.push(makeUser({ id: 'user-9' }));

      await expect(
        useCase.execute({
          token: await firstAccessToken(),
          password: 'nova-senha',
        }),
      ).rejects.toThrow(
        expect.objectContaining({ code: UserErrorCode.EMAIL_ALREADY_IN_USE }),
      );
      expect(customers.items[0]?.userIdValue).toBeNull();
    });

    it('perdeu a corrida pra outro uso do mesmo link: link inválido', async () => {
      activation.raceLost = true;
      await expect(
        useCase.execute({
          token: await firstAccessToken(),
          password: 'nova-senha',
        }),
      ).rejects.toThrow(invalidLink);
      expect(users.items).toHaveLength(0);
    });
  });

  describe('redefinição de senha', () => {
    const resetToken = (stamp: string) =>
      tokens.sign({
        kind: 'password-reset',
        userId: 'user-1',
        passwordStamp: stamp,
      });

    it('troca a senha e o link antigo deixa de valer', async () => {
      const user = makeUser();
      users.items.push(user);
      const token = await resetToken(user.passwordStamp);

      await useCase.execute({ token, password: 'nova-senha' });

      expect(users.items[0]?.hashedPassword).toBe('hashed:nova-senha');
      await expect(
        useCase.execute({ token, password: 'outra-senha' }),
      ).rejects.toThrow(invalidLink);
    });

    it('carimbo diferente (senha trocada depois do envio): link inválido', async () => {
      users.items.push(makeUser());
      await expect(
        useCase.execute({
          token: await resetToken('carimbo-velho'),
          password: 'nova-senha',
        }),
      ).rejects.toThrow(invalidLink);
    });

    it('login inativo ou inexistente: link inválido', async () => {
      const inactive = makeUser({ active: false });
      users.items.push(inactive);
      await expect(
        useCase.execute({
          token: await resetToken(inactive.passwordStamp),
          password: 'nova-senha',
        }),
      ).rejects.toThrow(invalidLink);

      users.items.length = 0;
      await expect(
        useCase.execute({
          token: await resetToken(inactive.passwordStamp),
          password: 'nova-senha',
        }),
      ).rejects.toThrow(invalidLink);
    });

    it('update condicional não bateu (corrida): link inválido', async () => {
      const user = makeUser();
      users.items.push(user);
      users.rejectNextReplace = true;

      await expect(
        useCase.execute({
          token: await resetToken(user.passwordStamp),
          password: 'nova-senha',
        }),
      ).rejects.toThrow(invalidLink);
    });
  });

  it('token adulterado, expirado ou de outra finalidade: link inválido', async () => {
    await expect(
      useCase.execute({ token: 'fake.qualquer', password: 'nova-senha' }),
    ).rejects.toThrow(invalidLink);

    const token = await firstAccessToken();
    tokens.expired = true;
    await expect(
      useCase.execute({ token, password: 'nova-senha' }),
    ).rejects.toThrow(invalidLink);
  });

  it('senha curta: erro de validação antes de olhar o link', async () => {
    await expect(
      useCase.execute({ token: 'qualquer', password: 'curta' }),
    ).rejects.toThrow(
      expect.objectContaining({ code: UserErrorCode.INVALID_PASSWORD }),
    );
  });
});
