import { describe, expect, it } from 'bun:test';
import { InMemoryCustomerRepository } from '../../../../../test/fakes/in-memory-customer.repository.js';
import { Customer } from '../../domain/entities/customer.entity.js';
import { CustomerErrorCode } from '../../domain/errors/customer.error.js';
import { FindCustomerByIdUseCase } from './find-customer-by-id.use-case.js';

describe('FindCustomerByIdUseCase', () => {
  it('devolve o cliente ou lança notFound', async () => {
    const customers = new InMemoryCustomerRepository();
    await customers.save(
      Customer.restore({
        id: 'customer-1',
        userId: null,
        name: 'João Silva',
        document: '52998224725',
        email: 'joao@oficina.com',
        phone: null,
      }),
    );
    const useCase = new FindCustomerByIdUseCase(customers);

    expect((await useCase.execute('customer-1')).idValue).toBe('customer-1');
    await expect(useCase.execute('nao-existe')).rejects.toThrow(
      expect.objectContaining({ code: CustomerErrorCode.NOT_FOUND }),
    );
  });
});
