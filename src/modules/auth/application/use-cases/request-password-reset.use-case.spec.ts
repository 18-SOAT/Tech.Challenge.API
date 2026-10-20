import { afterEach, beforeEach, describe, expect, it, spyOn } from 'bun:test';
import { makeUser } from '../../../../../test/fakes/auth-fixtures.js';
import { FakeAccessLinkMailer } from '../../../../../test/fakes/fake-access-link-mailer.js';
import { FakeAccessLinkTokenService } from '../../../../../test/fakes/fake-access-link-token-service.js';
import { InMemoryUserRepository } from '../../../../../test/fakes/in-memory-user.repository.js';
import { flushBackground } from '../../../../../test/helpers/async.js';
import { SharedErrorCode } from '../../../../shared/domain/errors/shared.error.js';
import { RequestPasswordResetUseCase } from './request-password-reset.use-case.js';

describe('RequestPasswordResetUseCase', () => {
  let users: InMemoryUserRepository;
  let tokens: FakeAccessLinkTokenService;
  let mailer: FakeAccessLinkMailer;
  let useCase: RequestPasswordResetUseCase;

  beforeEach(() => {
    users = new InMemoryUserRepository();
    tokens = new FakeAccessLinkTokenService();
    mailer = new FakeAccessLinkMailer();
    useCase = new RequestPasswordResetUseCase(users, tokens, mailer);
  });

  it('login ativo: envia o link com o carimbo da senha atual', async () => {
    const user = makeUser();
    users.items.push(user);

    await useCase.execute({ email: ' Joao@Oficina.com ' });
    await flushBackground();

    expect(mailer.sent[0]?.kind).toBe('password-reset');
    expect(mailer.sent[0]?.to).toBe('joao@oficina.com');
    await expect(tokens.verify(mailer.lastToken)).resolves.toStrictEqual({
      kind: 'password-reset',
      userId: 'user-1',
      passwordStamp: user.passwordStamp,
    });
  });

  it('e-mail sem login ou login inativo: termina igual, sem enviar nada', async () => {
    users.items.push(
      makeUser({ id: 'user-2', email: 'inativo@oficina.com', active: false }),
    );

    await useCase.execute({ email: 'ninguem@oficina.com' });
    await useCase.execute({ email: 'inativo@oficina.com' });
    await flushBackground();

    expect(mailer.sent).toHaveLength(0);
  });

  it('e-mail inválido: erro de validação', async () => {
    await expect(useCase.execute({ email: 'nao-e-email' })).rejects.toThrow(
      expect.objectContaining({ code: SharedErrorCode.INVALID_EMAIL }),
    );
  });

  describe('falha no envio', () => {
    const consoleError = spyOn(console, 'error').mockImplementation(() => {});
    afterEach(() => consoleError.mockClear());

    it('não vira erro pra quem pediu: só fica no log', async () => {
      users.items.push(makeUser());
      mailer.failNext = true;

      await expect(
        useCase.execute({ email: 'joao@oficina.com' }),
      ).resolves.toBeUndefined();
      await flushBackground();

      expect(consoleError).toHaveBeenCalledTimes(1);
    });
  });
});
