import { beforeEach, describe, expect, it } from 'bun:test';
import { InMemoryCustomerRepository } from '../../../../../test/fakes/in-memory-customer.repository.js';
import { CustomerErrorCode } from '../../domain/errors/customer.error.js';
import {
  type CreateCustomerInput,
  CreateCustomerUseCase,
} from './create-customer.use-case.js';

describe('CreateCustomerUseCase', () => {
  let customers: InMemoryCustomerRepository;
  let useCase: CreateCustomerUseCase;

  const input: CreateCustomerInput = {
    name: 'João Silva',
    document: '529.982.247-25',
    email: 'Joao@Oficina.com',
    phone: '(11) 98765-4321',
  };

  beforeEach(() => {
    customers = new InMemoryCustomerRepository();
    useCase = new CreateCustomerUseCase(customers);
  });

  it('cadastra cliente sem login, com dados normalizados', async () => {
    const customer = await useCase.execute(input);

    expect(customers.items).toStrictEqual([customer]);
    expect(customer.userIdValue).toBeNull();
    expect(customer.documentValue).toBe('52998224725');
    expect(customer.emailValue).toBe('joao@oficina.com');
    expect(customer.phoneValue).toBe('11987654321');
  });

  it('telefone é opcional', async () => {
    const { phone: _phone, ...withoutPhone } = input;

    const customer = await useCase.execute(withoutPhone);

    expect(customer.phoneValue).toBeNull();
  });

  it('rejeita CPF/CNPJ já cadastrado, mesmo com máscara diferente', async () => {
    await useCase.execute(input);

    await expect(
      useCase.execute({ ...input, document: '52998224725' }),
    ).rejects.toThrow(
      expect.objectContaining({
        code: CustomerErrorCode.DOCUMENT_ALREADY_IN_USE,
      }),
    );
    expect(customers.items).toHaveLength(1);
  });

  it('rejeita documento inválido sem gravar nada', async () => {
    await expect(
      useCase.execute({ ...input, document: '123.456.789-00' }),
    ).rejects.toThrow(
      expect.objectContaining({ code: CustomerErrorCode.INVALID_DOCUMENT }),
    );
    expect(customers.items).toHaveLength(0);
  });
});
