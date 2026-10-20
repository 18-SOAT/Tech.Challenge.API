import { beforeEach, describe, expect, it } from 'bun:test';
import { InMemoryCustomerRepository } from '../../../../../test/fakes/in-memory-customer.repository.js';
import { Customer } from '../../domain/entities/customer.entity.js';
import { CustomerErrorCode } from '../../domain/errors/customer.error.js';
import { UpdateCustomerUseCase } from './update-customer.use-case.js';

describe('UpdateCustomerUseCase', () => {
  let customers: InMemoryCustomerRepository;
  let useCase: UpdateCustomerUseCase;

  beforeEach(async () => {
    customers = new InMemoryCustomerRepository();
    useCase = new UpdateCustomerUseCase(customers);
    await customers.save(
      Customer.restore({
        id: 'customer-1',
        userId: null,
        name: 'João Silva',
        document: '52998224725',
        email: 'joao@oficina.com',
        phone: '11987654321',
      }),
    );
  });

  it('altera e persiste só os campos informados', async () => {
    const customer = await useCase.execute({
      id: 'customer-1',
      email: 'Novo@Oficina.com',
      phone: '(21) 3333-4444',
    });

    expect(customer.nameValue).toBe('João Silva');
    expect(customer.emailValue).toBe('novo@oficina.com');
    expect(customer.phoneValue).toBe('2133334444');
    expect((await customers.findById('customer-1'))?.emailValue).toBe(
      'novo@oficina.com',
    );
  });

  it('phone null remove o telefone', async () => {
    const customer = await useCase.execute({ id: 'customer-1', phone: null });

    expect(customer.phoneValue).toBeNull();
  });

  it('cliente inexistente → notFound', async () => {
    await expect(
      useCase.execute({ id: 'nao-existe', name: 'X' }),
    ).rejects.toThrow(
      expect.objectContaining({ code: CustomerErrorCode.NOT_FOUND }),
    );
  });
});
