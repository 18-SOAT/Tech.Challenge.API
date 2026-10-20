import { beforeEach, describe, expect, it } from 'bun:test';
import { InMemoryProductRepository } from '../../../../../test/fakes/in-memory-product.repository.js';
import { InMemoryStockMovementRepository } from '../../../../../test/fakes/in-memory-stock-movement.repository.js';
import { Money } from '../../../../shared/domain/value-objects/money.vo.js';
import { Product } from '../../domain/entities/product.entity.js';
import { ProductType } from '../../domain/enums/product-type.enum.js';
import { StockMovementType } from '../../domain/enums/stock-movement-type.enum.js';
import { ProductErrorCode } from '../../domain/errors/product.error.js';
import { ReceiveStockUseCase } from './receive-stock.use-case.js';

describe('ReceiveStockUseCase', () => {
  let products: InMemoryProductRepository;
  let movements: InMemoryStockMovementRepository;
  let useCase: ReceiveStockUseCase;
  let productId: string;

  beforeEach(async () => {
    products = new InMemoryProductRepository();
    movements = new InMemoryStockMovementRepository(products);
    useCase = new ReceiveStockUseCase(products, movements);
    const product = Product.create({
      sku: 'OL-1',
      name: 'Óleo 5W30',
      type: ProductType.SUPPLY,
      price: Money.fromReais(39.9),
    });
    await products.save(product);
    productId = product.idValue;
  });

  it('grava a movimentação IN e soma ao saldo gravado', async () => {
    await useCase.execute({ productId, quantity: 4 });
    const product = await useCase.execute({
      productId,
      quantity: 6,
      reason: 'NF 4512',
    });

    expect(product.stockQuantityValue).toBe(10);
    expect((await products.findById(productId))?.stockQuantityValue).toBe(10);
    expect(movements.items.map((m) => m.typeValue)).toStrictEqual([
      StockMovementType.IN,
      StockMovementType.IN,
    ]);
    expect(movements.items[1]?.reasonValue).toBe('NF 4512');
  });

  it('quantidade inválida não grava nada', async () => {
    await expect(useCase.execute({ productId, quantity: 0 })).rejects.toThrow(
      expect.objectContaining({ code: ProductErrorCode.INVALID_QUANTITY }),
    );
    expect(movements.items).toHaveLength(0);
  });

  it('lança notFound se o produto não existir', async () => {
    await expect(
      useCase.execute({ productId: 'missing', quantity: 1 }),
    ).rejects.toThrow(
      expect.objectContaining({ code: ProductErrorCode.NOT_FOUND }),
    );
  });
});
