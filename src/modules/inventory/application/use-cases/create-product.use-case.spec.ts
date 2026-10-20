import { beforeEach, describe, expect, it } from 'bun:test';
import { InMemoryProductRepository } from '../../../../../test/fakes/in-memory-product.repository.js';
import { SharedErrorCode } from '../../../../shared/domain/errors/shared.error.js';
import { ProductType } from '../../domain/enums/product-type.enum.js';
import { ProductErrorCode } from '../../domain/errors/product.error.js';
import {
  type CreateProductInput,
  CreateProductUseCase,
} from './create-product.use-case.js';

describe('CreateProductUseCase', () => {
  let products: InMemoryProductRepository;
  let useCase: CreateProductUseCase;

  const input: CreateProductInput = {
    sku: 'pf-123',
    name: 'Pastilha de freio',
    type: ProductType.PART,
    price: 149.9,
    minimumStock: 4,
  };

  beforeEach(() => {
    products = new InMemoryProductRepository();
    useCase = new CreateProductUseCase(products);
  });

  it('cadastra o produto ativo, com SKU normalizado e saldo 0', async () => {
    const product = await useCase.execute(input);

    expect(products.items).toHaveLength(1);
    expect(product.skuValue).toBe('PF-123');
    expect(product.priceValue.cents).toBe(14990);
    expect(product.stockQuantityValue).toBe(0);
    expect(product.isActive).toBe(true);
  });

  it('rejeita SKU já cadastrado, mesmo com outra caixa e espaços', async () => {
    await useCase.execute(input);

    await expect(
      useCase.execute({ ...input, sku: ' PF-123 ', name: 'Outra' }),
    ).rejects.toThrow(
      expect.objectContaining({ code: ProductErrorCode.SKU_ALREADY_IN_USE }),
    );
  });

  it('rejeita preço com mais de 2 casas sem gravar nada', async () => {
    await expect(useCase.execute({ ...input, price: 10.005 })).rejects.toThrow(
      expect.objectContaining({ code: SharedErrorCode.INVALID_MONEY }),
    );
    expect(products.items).toHaveLength(0);
  });
});
