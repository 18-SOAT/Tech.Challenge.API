import { beforeEach, describe, expect, it } from 'bun:test';
import { InMemoryProductRepository } from '../../../../../test/fakes/in-memory-product.repository.js';
import { InMemoryStockMovementRepository } from '../../../../../test/fakes/in-memory-stock-movement.repository.js';
import { Money } from '../../../../shared/domain/value-objects/money.vo.js';
import { Product } from '../../domain/entities/product.entity.js';
import { ProductType } from '../../domain/enums/product-type.enum.js';
import { ProductErrorCode } from '../../domain/errors/product.error.js';
import { ListStockMovementsUseCase } from './list-stock-movements.use-case.js';

describe('ListStockMovementsUseCase', () => {
  let products: InMemoryProductRepository;
  let movements: InMemoryStockMovementRepository;
  let useCase: ListStockMovementsUseCase;

  beforeEach(() => {
    products = new InMemoryProductRepository();
    movements = new InMemoryStockMovementRepository(products);
    useCase = new ListStockMovementsUseCase(products, movements);
  });

  it('devolve o extrato do produto, mais recente primeiro', async () => {
    const product = Product.create({
      sku: 'PF-1',
      name: 'Pastilha',
      type: ProductType.PART,
      price: Money.fromReais(10),
    });
    await products.save(product);
    await movements.record(product.receive(10));
    await movements.record(product.adjust(-3, 'Avaria'));

    const page = await useCase.execute({
      productId: product.idValue,
      page: 1,
      limit: 10,
    });

    expect(page.total).toBe(2);
    expect(page.items.map((m) => m.quantityValue)).toStrictEqual([-3, 10]);
  });

  it('lança notFound se o produto não existir', async () => {
    await expect(
      useCase.execute({ productId: 'missing', page: 1, limit: 10 }),
    ).rejects.toThrow(
      expect.objectContaining({ code: ProductErrorCode.NOT_FOUND }),
    );
  });
});
