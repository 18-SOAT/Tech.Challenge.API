import { beforeEach, describe, expect, it } from 'bun:test';
import { InMemoryProductRepository } from '../../../../../test/fakes/in-memory-product.repository.js';
import { InMemoryStockMovementRepository } from '../../../../../test/fakes/in-memory-stock-movement.repository.js';
import { Money } from '../../../../shared/domain/value-objects/money.vo.js';
import { Product } from '../../domain/entities/product.entity.js';
import { ProductType } from '../../domain/enums/product-type.enum.js';
import { ProductErrorCode } from '../../domain/errors/product.error.js';
import { UpdateProductUseCase } from './update-product.use-case.js';

describe('UpdateProductUseCase', () => {
  let products: InMemoryProductRepository;
  let useCase: UpdateProductUseCase;
  let product: Product;

  const add = async (sku: string) => {
    const created = Product.create({
      sku,
      name: 'Pastilha de freio',
      type: ProductType.PART,
      price: Money.fromReais(149.9),
      minimumStock: 4,
    });
    await products.save(created);
    return created;
  };

  beforeEach(async () => {
    products = new InMemoryProductRepository();
    useCase = new UpdateProductUseCase(products);
    product = await add('PF-1');
  });

  it('altera os campos enviados e grava', async () => {
    const updated = await useCase.execute({
      id: product.idValue,
      sku: 'pf-2',
      price: 99.9,
      minimumStock: 2,
    });

    expect(updated.skuValue).toBe('PF-2');
    expect(updated.priceValue.cents).toBe(9990);
    expect((await products.findById(product.idValue))?.minimumStockValue).toBe(
      2,
    );
  });

  it('aceita o próprio SKU (com outra caixa)', async () => {
    const updated = await useCase.execute({ id: product.idValue, sku: 'pf-1' });

    expect(updated.skuValue).toBe('PF-1');
  });

  it('rejeita SKU de outro produto', async () => {
    await add('PF-9');

    await expect(
      useCase.execute({ id: product.idValue, sku: 'pf-9' }),
    ).rejects.toThrow(
      expect.objectContaining({ code: ProductErrorCode.SKU_ALREADY_IN_USE }),
    );
  });

  it('desativa e reativa', async () => {
    expect(
      (await useCase.execute({ id: product.idValue, active: false })).isActive,
    ).toBe(false);
    expect(
      (await useCase.execute({ id: product.idValue, active: true })).isActive,
    ).toBe(true);
  });

  it('não sobrescreve o saldo gravado', async () => {
    await new InMemoryStockMovementRepository(products).record(
      product.receive(10),
    );

    await useCase.execute({ id: product.idValue, name: 'Pastilha cerâmica' });

    expect((await products.findById(product.idValue))?.stockQuantityValue).toBe(
      10,
    );
  });

  it('lança notFound se não existir', async () => {
    await expect(useCase.execute({ id: 'missing', name: 'X' })).rejects.toThrow(
      expect.objectContaining({ code: ProductErrorCode.NOT_FOUND }),
    );
  });
});
