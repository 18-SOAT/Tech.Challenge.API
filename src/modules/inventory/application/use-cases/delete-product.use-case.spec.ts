import { beforeEach, describe, expect, it } from 'bun:test';
import { InMemoryProductRepository } from '../../../../../test/fakes/in-memory-product.repository.js';
import { InMemoryStockMovementRepository } from '../../../../../test/fakes/in-memory-stock-movement.repository.js';
import { Money } from '../../../../shared/domain/value-objects/money.vo.js';
import { Product } from '../../domain/entities/product.entity.js';
import { ProductType } from '../../domain/enums/product-type.enum.js';
import { ProductErrorCode } from '../../domain/errors/product.error.js';
import { DeleteProductUseCase } from './delete-product.use-case.js';

describe('DeleteProductUseCase', () => {
  let products: InMemoryProductRepository;
  let useCase: DeleteProductUseCase;
  let product: Product;

  beforeEach(async () => {
    products = new InMemoryProductRepository();
    useCase = new DeleteProductUseCase(products);
    product = Product.create({
      sku: 'PF-1',
      name: 'Pastilha',
      type: ProductType.PART,
      price: Money.fromReais(10),
    });
    await products.save(product);
  });

  it('exclui produto sem histórico', async () => {
    await useCase.execute(product.idValue);

    expect(products.items).toHaveLength(0);
  });

  it('rejeita produto com movimentação de estoque', async () => {
    await new InMemoryStockMovementRepository(products).record(
      product.receive(1),
    );

    await expect(useCase.execute(product.idValue)).rejects.toThrow(
      expect.objectContaining({ code: ProductErrorCode.IN_USE }),
    );
    expect(products.items).toHaveLength(1);
  });

  it('lança notFound se não existir', async () => {
    await expect(useCase.execute('missing')).rejects.toThrow(
      expect.objectContaining({ code: ProductErrorCode.NOT_FOUND }),
    );
  });
});
