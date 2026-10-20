import { beforeEach, describe, expect, it } from 'bun:test';
import { InMemoryServiceRepository } from '../../../../../test/fakes/in-memory-service.repository.js';
import { Money } from '../../../../shared/domain/value-objects/money.vo.js';
import { Service } from '../../domain/entities/service.entity.js';
import { ServiceErrorCode } from '../../domain/errors/service.error.js';
import { FindServiceByIdUseCase } from './find-service-by-id.use-case.js';

describe('FindServiceByIdUseCase', () => {
  let services: InMemoryServiceRepository;
  let useCase: FindServiceByIdUseCase;

  beforeEach(() => {
    services = new InMemoryServiceRepository();
    useCase = new FindServiceByIdUseCase(services);
  });

  it('devolve o serviço', async () => {
    const service = Service.create({
      name: 'Troca de óleo',
      price: Money.fromReais(89.9),
    });
    await services.save(service);

    expect(await useCase.execute(service.idValue)).toBe(service);
  });

  it('serviço inexistente → notFound', async () => {
    await expect(useCase.execute('nao-existe')).rejects.toThrow(
      expect.objectContaining({ code: ServiceErrorCode.NOT_FOUND }),
    );
  });
});
