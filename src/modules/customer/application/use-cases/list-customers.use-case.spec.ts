import { beforeEach, describe, expect, it } from 'bun:test';
import { InMemoryCustomerRepository } from '../../../../../test/fakes/in-memory-customer.repository.js';
import { Email } from '../../../../shared/domain/value-objects/email.vo.js';
import { Customer } from '../../domain/entities/customer.entity.js';
import { Document } from '../../domain/value-objects/document.vo.js';
import { ListCustomersUseCase } from './list-customers.use-case.js';

describe('ListCustomersUseCase', () => {
  let customers: InMemoryCustomerRepository;
  let useCase: ListCustomersUseCase;

  const add = (name: string, document: string) =>
    customers.save(
      Customer.create({
        name,
        document: Document.create(document),
        email: Email.create('cliente@oficina.com'),
      }),
    );

  beforeEach(async () => {
    customers = new InMemoryCustomerRepository();
    useCase = new ListCustomersUseCase(customers);
    await add('João Silva', '52998224725');
    await add('Maria Souza', '11222333000181');
    await add('Joana Lima', '39053344705');
  });

  it('pagina e devolve o total geral', async () => {
    const page = await useCase.execute({ page: 2, limit: 2 });

    expect(page.total).toBe(3);
    expect(page.items.map((c) => c.nameValue)).toStrictEqual(['Joana Lima']);
  });

  it('filtra por documento com máscara', async () => {
    const page = await useCase.execute({
      page: 1,
      limit: 10,
      document: '529.982.247-25',
    });

    expect(page.items.map((c) => c.nameValue)).toStrictEqual(['João Silva']);
  });

  it('filtra por parte do nome, sem diferenciar maiúsculas', async () => {
    const page = await useCase.execute({ page: 1, limit: 10, name: ' JO ' });

    expect(page.total).toBe(2);
  });
});
