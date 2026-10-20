import { afterEach, beforeEach, describe, expect, it, spyOn } from 'bun:test';
import { makeCustomer } from '../../../../../test/fakes/auth-fixtures.js';
import { FakeAccessLinkMailer } from '../../../../../test/fakes/fake-access-link-mailer.js';
import { FakeAccessLinkTokenService } from '../../../../../test/fakes/fake-access-link-token-service.js';
import { InMemoryCustomerRepository } from '../../../../../test/fakes/in-memory-customer.repository.js';
import { flushBackground } from '../../../../../test/helpers/async.js';
import { CustomerErrorCode } from '../../../customer/domain/errors/customer.error.js';
import { RequestFirstAccessUseCase } from './request-first-access.use-case.js';

describe('RequestFirstAccessUseCase', () => {
  let customers: InMemoryCustomerRepository;
  let tokens: FakeAccessLinkTokenService;
  let mailer: FakeAccessLinkMailer;
  let useCase: RequestFirstAccessUseCase;

  beforeEach(() => {
    customers = new InMemoryCustomerRepository();
    tokens = new FakeAccessLinkTokenService();
    mailer = new FakeAccessLinkMailer();
    useCase = new RequestFirstAccessUseCase(customers, tokens, mailer);
  });

  it('cliente do balcão sem login: envia o link ao e-mail cadastrado', async () => {
    customers.items.push(makeCustomer(null));

    await useCase.execute({ document: '529.982.247-25' });
    await flushBackground();

    expect(mailer.sent).toHaveLength(1);
    expect(mailer.sent[0]?.to).toBe('joao@oficina.com');
    await expect(tokens.verify(mailer.lastToken)).resolves.toStrictEqual({
      kind: 'first-access',
      customerId: 'customer-1',
    });
  });

  it('CPF sem cadastro: termina igual, sem enviar nada', async () => {
    await expect(
      useCase.execute({ document: '529.982.247-25' }),
    ).resolves.toBeUndefined();
    await flushBackground();

    expect(mailer.sent).toHaveLength(0);
  });

  it('cliente que já tem login: não envia (o caminho é a redefinição de senha)', async () => {
    customers.items.push(makeCustomer('user-1'));

    await useCase.execute({ document: '52998224725' });
    await flushBackground();

    expect(mailer.sent).toHaveLength(0);
  });

  it('CPF/CNPJ inválido: erro de validação', async () => {
    await expect(useCase.execute({ document: '123' })).rejects.toThrow(
      expect.objectContaining({ code: CustomerErrorCode.INVALID_DOCUMENT }),
    );
  });

  describe('falha no envio', () => {
    const consoleError = spyOn(console, 'error').mockImplementation(() => {});
    afterEach(() => consoleError.mockClear());

    it('não vira erro pra quem pediu: só fica no log', async () => {
      customers.items.push(makeCustomer(null));
      mailer.failNext = true;

      await expect(
        useCase.execute({ document: '52998224725' }),
      ).resolves.toBeUndefined();
      await flushBackground();

      expect(consoleError).toHaveBeenCalledTimes(1);
    });
  });
});
