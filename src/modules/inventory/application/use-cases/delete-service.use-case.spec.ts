import { beforeEach, describe, expect, it } from 'bun:test';
import { InMemoryServiceRepository } from '../../../../../test/fakes/in-memory-service.repository.js';
import { Service } from '../../domain/entities/service.entity.js';
import { ServiceErrorCode } from '../../domain/errors/service.error.js';
import { DeleteServiceUseCase } from './delete-service.use-case.js';

describe('DeleteServiceUseCase', () => {
  let services: InMemoryServiceRepository;
  let useCase: DeleteServiceUseCase;

  beforeEach(async () => {
    services = new InMemoryServiceRepository();
    useCase = new DeleteServiceUseCase(services);
    await services.save(
      Service.restore({
        id: 'service-1',
        name: 'Troca de óleo',
        description: null,
        price: 89.9,
        estimatedDurationMinutes: null,
        active: true,
      }),
    );
  });

  it('exclui serviço nunca usado em OS', async () => {
    await useCase.execute('service-1');

    expect(services.items).toHaveLength(0);
  });

  it('bloqueia serviço já usado em OS', async () => {
    services.usedInServiceOrders.add('service-1');

    await expect(useCase.execute('service-1')).rejects.toThrow(
      expect.objectContaining({ code: ServiceErrorCode.IN_USE }),
    );
    expect(services.items).toHaveLength(1);
  });

  it('serviço inexistente → notFound', async () => {
    await expect(useCase.execute('nao-existe')).rejects.toThrow(
      expect.objectContaining({ code: ServiceErrorCode.NOT_FOUND }),
    );
  });
});
