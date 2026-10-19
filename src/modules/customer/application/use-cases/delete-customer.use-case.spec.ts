import { beforeEach, describe, expect, it } from 'bun:test';
import { InMemoryCustomerRepository } from '../../../../../test/fakes/in-memory-customer.repository.js';
import { Customer } from '../../domain/entities/customer.entity.js';
import { CustomerErrorCode } from '../../domain/errors/customer.error.js';
import { DeleteCustomerUseCase } from './delete-customer.use-case.js';

const makeCustomer = (id: string, userId: string | null = null) =>
  Customer.restore({
    id,
    userId,
    name: 'João Silva',
    document: '52998224725',
    email: 'joao@oficina.com',
    phone: null,
  });

describe('DeleteCustomerUseCase', () => {
  let customers: InMemoryCustomerRepository;
  let useCase: DeleteCustomerUseCase;

  beforeEach(() => {
    customers = new InMemoryCustomerRepository();
    useCase = new DeleteCustomerUseCase(customers);
  });

  it('exclui cliente sem login e sem vínculos', async () => {
    await customers.save(makeCustomer('customer-1'));

    await useCase.execute('customer-1');

    expect(customers.items).toHaveLength(0);
  });

  it('bloqueia cliente com login vinculado', async () => {
    await customers.save(makeCustomer('customer-1', 'user-1'));

    await expect(useCase.execute('customer-1')).rejects.toThrow(
      expect.objectContaining({ code: CustomerErrorCode.HAS_LINKED_ACCESS }),
    );
    expect(customers.items).toHaveLength(1);
  });

  it('bloqueia cliente com veículo/OS vinculados', async () => {
    await customers.save(makeCustomer('customer-1'));
    customers.withDependencies.add('customer-1');

    await expect(useCase.execute('customer-1')).rejects.toThrow(
      expect.objectContaining({ code: CustomerErrorCode.HAS_DEPENDENCIES }),
    );
    expect(customers.items).toHaveLength(1);
  });

  it('cliente inexistente → notFound', async () => {
    await expect(useCase.execute('nao-existe')).rejects.toThrow(
      expect.objectContaining({ code: CustomerErrorCode.NOT_FOUND }),
    );
  });
});
