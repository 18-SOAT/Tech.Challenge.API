import { beforeEach, describe, expect, it } from 'bun:test';
import { InMemoryServiceRepository } from '../../../../../test/fakes/in-memory-service.repository.js';
import { SharedErrorCode } from '../../../../shared/domain/errors/shared.error.js';
import { ServiceErrorCode } from '../../domain/errors/service.error.js';
import {
  type CreateServiceInput,
  CreateServiceUseCase,
} from './create-service.use-case.js';

describe('CreateServiceUseCase', () => {
  let services: InMemoryServiceRepository;
  let useCase: CreateServiceUseCase;

  const input: CreateServiceInput = {
    name: 'Troca de óleo',
    price: 89.9,
    estimatedDurationMinutes: 30,
  };

  beforeEach(() => {
    services = new InMemoryServiceRepository();
    useCase = new CreateServiceUseCase(services);
  });

  it('cadastra o serviço ativo com o preço em centavos', async () => {
    const service = await useCase.execute(input);

    expect(services.items).toStrictEqual([service]);
    expect(service.priceValue.cents).toBe(8990);
    expect(service.isActive).toBe(true);
  });

  it('rejeita nome já cadastrado, mesmo com outra caixa e espaços', async () => {
    await useCase.execute(input);

    await expect(
      useCase.execute({ ...input, name: '  TROCA DE ÓLEO ' }),
    ).rejects.toThrow(
      expect.objectContaining({ code: ServiceErrorCode.NAME_ALREADY_IN_USE }),
    );
  });

  it('rejeita preço com mais de 2 casas sem gravar nada', async () => {
    await expect(useCase.execute({ ...input, price: 10.005 })).rejects.toThrow(
      expect.objectContaining({ code: SharedErrorCode.INVALID_MONEY }),
    );
    expect(services.items).toHaveLength(0);
  });
});
