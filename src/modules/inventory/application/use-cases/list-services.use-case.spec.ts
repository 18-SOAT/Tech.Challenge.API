import { beforeEach, describe, expect, it } from 'bun:test';
import { InMemoryServiceRepository } from '../../../../../test/fakes/in-memory-service.repository.js';
import { Money } from '../../../../shared/domain/value-objects/money.vo.js';
import { Service } from '../../domain/entities/service.entity.js';
import { ListServicesUseCase } from './list-services.use-case.js';

describe('ListServicesUseCase', () => {
  let useCase: ListServicesUseCase;

  beforeEach(async () => {
    const services = new InMemoryServiceRepository();
    useCase = new ListServicesUseCase(services);
    for (const name of ['Troca de óleo', 'Troca de pastilha', 'Alinhamento']) {
      await services.save(Service.create({ name, price: Money.fromReais(50) }));
    }
    services.items[2].deactivate();
  });

  it('busca parcial pelo nome sem diferenciar maiúscula, paginando', async () => {
    const page = await useCase.execute({ page: 1, limit: 1, name: ' troca ' });

    expect(page.total).toBe(2);
    expect(page.items).toHaveLength(1);
  });

  it('filtra pelo status ativo', async () => {
    const page = await useCase.execute({ page: 1, limit: 10, active: false });

    expect(page.items.map((s) => s.nameValue)).toStrictEqual(['Alinhamento']);
  });

  it('nome em branco não filtra', async () => {
    const page = await useCase.execute({ page: 1, limit: 10, name: '  ' });

    expect(page.total).toBe(3);
  });
});
