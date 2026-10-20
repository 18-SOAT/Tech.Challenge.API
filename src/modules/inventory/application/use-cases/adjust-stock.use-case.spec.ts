import { beforeEach, describe, expect, it } from 'bun:test';
import { InMemoryProductRepository } from '../../../../../test/fakes/in-memory-product.repository.js';
import { InMemoryStockMovementRepository } from '../../../../../test/fakes/in-memory-stock-movement.repository.js';
import { Money } from '../../../../shared/domain/value-objects/money.vo.js';
import { Product } from '../../domain/entities/product.entity.js';
import { ProductType } from '../../domain/enums/product-type.enum.js';
import { StockMovementType } from '../../domain/enums/stock-movement-type.enum.js';
import { ProductErrorCode } from '../../domain/errors/product.error.js';
import { AdjustStockUseCase } from './adjust-stock.use-case.js';

describe('AdjustStockUseCase', () => {
  const useCaseProduct = async (id: string) => {
    const product = await products.findById(id);
    if (!product) throw new Error('produto do setup não encontrado');
    return product;
  };

  let products: InMemoryProductRepository;
  let movements: InMemoryStockMovementRepository;
  let useCase: AdjustStockUseCase;
  let productId: string;

  beforeEach(async () => {
    products = new InMemoryProductRepository();
    movements = new InMemoryStockMovementRepository(products);
    useCase = new AdjustStockUseCase(products, movements);
    const product = Product.create({
      sku: 'PF-1',
      name: 'Pastilha',
      type: ProductType.PART,
      price: Money.fromReais(10),
    });
    await products.save(product);
    await movements.record(product.receive(5));
    productId = product.idValue;
  });

  it('grava o ajuste com motivo e aplica o delta no saldo', async () => {
    const product = await useCase.execute({
      productId,
      quantity: -2,
      reason: 'Avaria',
    });

    expect(product.stockQuantityValue).toBe(3);
    expect((await products.findById(productId))?.stockQuantityValue).toBe(3);
    expect(movements.items[1]?.typeValue).toBe(StockMovementType.ADJUSTMENT);
    expect(movements.items[1]?.quantityValue).toBe(-2);
  });

  it('saldo negativo não grava nada', async () => {
    await expect(
      useCase.execute({ productId, quantity: -6, reason: 'Perda' }),
    ).rejects.toThrow(
      expect.objectContaining({ code: ProductErrorCode.INSUFFICIENT_STOCK }),
    );
    expect(movements.items).toHaveLength(1);
    expect((await products.findById(productId))?.stockQuantityValue).toBe(5);
  });

  it('o port barra saldo negativo mesmo se a entity leu um saldo antigo', async () => {
    // Simula a corrida: a entity foi carregada com 5, mas o banco já está em 1.
    const stale = await useCaseProduct(productId);
    products.setStock(productId, 1);

    await expect(movements.record(stale.adjust(-3, 'Perda'))).rejects.toThrow(
      expect.objectContaining({ code: ProductErrorCode.INSUFFICIENT_STOCK }),
    );
    expect((await products.findById(productId))?.stockQuantityValue).toBe(1);
  });

  it('exige motivo', async () => {
    await expect(
      useCase.execute({ productId, quantity: -1, reason: ' ' }),
    ).rejects.toThrow(
      expect.objectContaining({
        code: ProductErrorCode.ADJUSTMENT_REASON_REQUIRED,
      }),
    );
  });

  it('lança notFound se o produto não existir', async () => {
    await expect(
      useCase.execute({ productId: 'missing', quantity: 1, reason: 'X' }),
    ).rejects.toThrow(
      expect.objectContaining({ code: ProductErrorCode.NOT_FOUND }),
    );
  });
});
