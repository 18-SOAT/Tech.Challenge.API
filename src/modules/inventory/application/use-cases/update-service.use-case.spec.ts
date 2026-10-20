import { beforeEach, describe, expect, it } from 'bun:test';
import { InMemoryServiceRepository } from '../../../../../test/fakes/in-memory-service.repository.js';
import { Service } from '../../domain/entities/service.entity.js';
import { ServiceErrorCode } from '../../domain/errors/service.error.js';
import { UpdateServiceUseCase } from './update-service.use-case.js';

const makeService = (id: string, name: string) =>
  Service.restore({
    id,
    name,
    description: null,
    price: 89.9,
    estimatedDurationMinutes: 30,
    active: true,
  });

describe('UpdateServiceUseCase', () => {
  let services: InMemoryServiceRepository;
  let useCase: UpdateServiceUseCase;

  beforeEach(async () => {
    services = new InMemoryServiceRepository();
    useCase = new UpdateServiceUseCase(services);
    await services.save(makeService('service-1', 'Troca de óleo'));
    await services.save(makeService('service-2', 'Alinhamento'));
  });

  it('altera o preço e persiste', async () => {
    const service = await useCase.execute({ id: 'service-1', price: 99.5 });

    expect(service.priceValue.cents).toBe(9950);
    expect((await services.findById('service-1'))?.priceValue.cents).toBe(9950);
  });

  it('reenviar o próprio nome (outra caixa) não é conflito', async () => {
    const service = await useCase.execute({
      id: 'service-1',
      name: 'TROCA DE ÓLEO',
    });

    expect(service.nameValue).toBe('TROCA DE ÓLEO');
  });

  it('rejeita nome de outro serviço', async () => {
    await expect(
      useCase.execute({ id: 'service-1', name: 'alinhamento' }),
    ).rejects.toThrow(
      expect.objectContaining({ code: ServiceErrorCode.NAME_ALREADY_IN_USE }),
    );
  });

  it('desativa e reativa pelo campo active', async () => {
    expect(
      (await useCase.execute({ id: 'service-1', active: false })).isActive,
    ).toBe(false);
    expect(
      (await useCase.execute({ id: 'service-1', active: true })).isActive,
    ).toBe(true);
  });

  it('serviço inexistente → notFound', async () => {
    await expect(
      useCase.execute({ id: 'nao-existe', price: 10 }),
    ).rejects.toThrow(
      expect.objectContaining({ code: ServiceErrorCode.NOT_FOUND }),
    );
  });
});
