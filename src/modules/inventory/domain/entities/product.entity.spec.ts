import { describe, expect, it } from 'bun:test';
import { Money } from '../../../../shared/domain/value-objects/money.vo.js';
import { ProductType } from '../enums/product-type.enum.js';
import { StockMovementType } from '../enums/stock-movement-type.enum.js';
import { ProductErrorCode } from '../errors/product.error.js';
import { Product } from './product.entity.js';

const make = (
  overrides: Partial<{
    sku: string;
    name: string;
    description: string | null;
    minimumStock: number;
  }> = {},
) =>
  Product.create({
    sku: ' pf-123 ',
    name: ' Pastilha de freio ',
    description: ' Jogo dianteiro ',
    type: ProductType.PART,
    price: Money.fromReais(149.9),
    minimumStock: 4,
    ...overrides,
  });

const withStock = (quantity: number) => {
  const product = make();
  product.receive(quantity);
  return product;
};

describe('Product', () => {
  it('create gera id, normaliza SKU, faz trim e nasce ativo com saldo 0', () => {
    const product = make();

    expect(product.idValue).toBeTruthy();
    expect(product.skuValue).toBe('PF-123');
    expect(product.nameValue).toBe('Pastilha de freio');
    expect(product.descriptionValue).toBe('Jogo dianteiro');
    expect(product.typeValue).toBe(ProductType.PART);
    expect(product.priceValue.cents).toBe(14990);
    expect(product.stockQuantityValue).toBe(0);
    expect(product.minimumStockValue).toBe(4);
    expect(product.isActive).toBe(true);
  });

  it('descrição e mínimo são opcionais: descrição em branco vira null, mínimo 0', () => {
    const product = Product.create({
      sku: 'OLEO-5W30',
      name: 'Óleo 5W30 1L',
      description: '  ',
      type: ProductType.SUPPLY,
      price: Money.fromReais(39.9),
    });

    expect(product.descriptionValue).toBeNull();
    expect(product.minimumStockValue).toBe(0);
    expect(product.isBelowMinimum).toBe(false);
  });

  it.each(['', '   ', 'PF 123', 'PF_123', 'Ç-1', 'A'.repeat(41)])(
    'rejeita SKU inválido %p',
    (sku) => {
      expect(() => make({ sku })).toThrow(
        expect.objectContaining({ code: ProductErrorCode.INVALID_SKU }),
      );
    },
  );

  it('rejeita nome vazio', () => {
    expect(() => make({ name: '  ' })).toThrow(
      expect.objectContaining({ code: ProductErrorCode.INVALID_NAME }),
    );
  });

  it.each([-1, 1.5])('rejeita estoque mínimo %p', (minimumStock) => {
    expect(() => make({ minimumStock })).toThrow(
      expect.objectContaining({ code: ProductErrorCode.INVALID_MINIMUM_STOCK }),
    );
  });

  it('restore reconstrói o estado sem validar de novo', () => {
    const product = Product.restore({
      id: 'product-1',
      sku: 'PF-123',
      name: 'Pastilha',
      description: null,
      type: ProductType.PART,
      price: 149.9,
      stockQuantity: 2,
      minimumStock: 4,
      active: false,
    });

    expect(product.idValue).toBe('product-1');
    expect(product.priceValue.cents).toBe(14990);
    expect(product.stockQuantityValue).toBe(2);
    expect(product.isActive).toBe(false);
    expect(product.isBelowMinimum).toBe(true);
  });

  describe('update', () => {
    it('altera só os campos enviados; null limpa a descrição', () => {
      const product = make();

      product.update({
        sku: 'pf-999',
        description: null,
        type: ProductType.SUPPLY,
        price: Money.fromReais(10),
        minimumStock: 0,
      });

      expect(product.skuValue).toBe('PF-999');
      expect(product.nameValue).toBe('Pastilha de freio');
      expect(product.descriptionValue).toBeNull();
      expect(product.typeValue).toBe(ProductType.SUPPLY);
      expect(product.priceValue.cents).toBe(1000);
      expect(product.minimumStockValue).toBe(0);
    });

    it('não altera nada se algum campo for inválido', () => {
      const product = make();

      expect(() =>
        product.update({ name: 'Outro nome', minimumStock: -1 }),
      ).toThrow(
        expect.objectContaining({
          code: ProductErrorCode.INVALID_MINIMUM_STOCK,
        }),
      );
      expect(product.nameValue).toBe('Pastilha de freio');
      expect(product.minimumStockValue).toBe(4);
    });

    it('não mexe no saldo', () => {
      const product = withStock(7);

      product.update({ name: 'Pastilha cerâmica' });

      expect(product.stockQuantityValue).toBe(7);
    });
  });

  it('deactivate/activate alternam o status', () => {
    const product = make();

    product.deactivate();
    expect(product.isActive).toBe(false);

    product.activate();
    expect(product.isActive).toBe(true);
  });

  describe('receive', () => {
    it('soma ao saldo e devolve a movimentação IN', () => {
      const product = make();

      const movement = product.receive(10, ' NF 4512 ');

      expect(product.stockQuantityValue).toBe(10);
      expect(movement.productIdValue).toBe(product.idValue);
      expect(movement.typeValue).toBe(StockMovementType.IN);
      expect(movement.quantityValue).toBe(10);
      expect(movement.delta).toBe(10);
      expect(movement.reasonValue).toBe('NF 4512');
    });

    it('motivo é opcional na entrada', () => {
      expect(make().receive(1).reasonValue).toBeNull();
    });

    it.each([0, -2, 1.5])('rejeita quantidade %p', (quantity) => {
      const product = make();

      expect(() => product.receive(quantity)).toThrow(
        expect.objectContaining({ code: ProductErrorCode.INVALID_QUANTITY }),
      );
      expect(product.stockQuantityValue).toBe(0);
    });
  });

  describe('adjust', () => {
    it('aplica o delta com sinal e devolve a movimentação ADJUSTMENT', () => {
      const product = withStock(10);

      const movement = product.adjust(-3, ' Avaria na prateleira ');

      expect(product.stockQuantityValue).toBe(7);
      expect(movement.typeValue).toBe(StockMovementType.ADJUSTMENT);
      expect(movement.quantityValue).toBe(-3);
      expect(movement.delta).toBe(-3);
      expect(movement.reasonValue).toBe('Avaria na prateleira');
    });

    it('aceita ajuste positivo (contagem achou a mais)', () => {
      const product = withStock(1);

      product.adjust(2, 'Inventário');

      expect(product.stockQuantityValue).toBe(3);
    });

    it('zera o saldo, mas não deixa negativo', () => {
      const product = withStock(3);

      product.adjust(-3, 'Perda');
      expect(product.stockQuantityValue).toBe(0);

      expect(() => product.adjust(-1, 'Perda')).toThrow(
        expect.objectContaining({ code: ProductErrorCode.INSUFFICIENT_STOCK }),
      );
      expect(product.stockQuantityValue).toBe(0);
    });

    it.each([0, 1.5])('rejeita delta %p', (delta) => {
      expect(() => withStock(5).adjust(delta, 'Inventário')).toThrow(
        expect.objectContaining({ code: ProductErrorCode.INVALID_QUANTITY }),
      );
    });

    it('exige motivo', () => {
      const product = withStock(5);

      expect(() => product.adjust(-1, '   ')).toThrow(
        expect.objectContaining({
          code: ProductErrorCode.ADJUSTMENT_REASON_REQUIRED,
        }),
      );
      expect(product.stockQuantityValue).toBe(5);
    });
  });

  it('isBelowMinimum compara saldo com o mínimo (estritamente menor)', () => {
    const product = make({ minimumStock: 4 });
    expect(product.isBelowMinimum).toBe(true);

    product.receive(4);
    expect(product.isBelowMinimum).toBe(false);
  });
});
