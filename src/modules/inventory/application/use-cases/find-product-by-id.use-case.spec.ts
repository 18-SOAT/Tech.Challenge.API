import { beforeEach, describe, expect, it } from 'bun:test';
import { InMemoryProductRepository } from '../../../../../test/fakes/in-memory-product.repository.js';
import { Money } from '../../../../shared/domain/value-objects/money.vo.js';
import { Product } from '../../domain/entities/product.entity.js';
import { ProductType } from '../../domain/enums/product-type.enum.js';
import { ProductErrorCode } from '../../domain/errors/product.error.js';
import { FindProductByIdUseCase } from './find-product-by-id.use-case.js';

describe('FindProductByIdUseCase', () => {
  let products: InMemoryProductRepository;
  let useCase: FindProductByIdUseCase;

  beforeEach(() => {
    products = new InMemoryProductRepository();
    useCase = new FindProductByIdUseCase(products);
  });

  it('devolve o produto', async () => {
    const product = Product.create({
      sku: 'PF-1',
      name: 'Pastilha',
      type: ProductType.PART,
      price: Money.fromReais(10),
    });
    await products.save(product);

    expect((await useCase.execute(product.idValue)).skuValue).toBe('PF-1');
  });

  it('lança notFound se não existir', async () => {
    await expect(useCase.execute('missing')).rejects.toThrow(
      expect.objectContaining({ code: ProductErrorCode.NOT_FOUND }),
    );
  });
});
