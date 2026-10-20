import { describe, expect, it } from 'bun:test';
import { StockMovementType } from '../enums/stock-movement-type.enum.js';
import { StockMovement } from './stock-movement.entity.js';

describe('StockMovement', () => {
  it('create gera id e data; motivo e OS são opcionais', () => {
    const movement = StockMovement.create({
      productId: 'product-1',
      type: StockMovementType.IN,
      quantity: 5,
    });

    expect(movement.idValue).toBeTruthy();
    expect(movement.createdAtValue).toBeInstanceOf(Date);
    expect(movement.reasonValue).toBeNull();
    expect(movement.serviceOrderIdValue).toBeNull();
  });

  it('restore reconstrói o lançamento', () => {
    const createdAt = new Date('2026-10-20T10:00:00Z');
    const movement = StockMovement.restore({
      id: 'movement-1',
      productId: 'product-1',
      type: StockMovementType.OUT,
      quantity: 2,
      reason: null,
      serviceOrderId: 'order-1',
      createdAt,
    });

    expect(movement.idValue).toBe('movement-1');
    expect(movement.productIdValue).toBe('product-1');
    expect(movement.typeValue).toBe(StockMovementType.OUT);
    expect(movement.quantityValue).toBe(2);
    expect(movement.serviceOrderIdValue).toBe('order-1');
    expect(movement.createdAtValue).toBe(createdAt);
  });

  it.each([
    [StockMovementType.IN, 4, 4],
    [StockMovementType.OUT, 4, -4],
    [StockMovementType.ADJUSTMENT, -3, -3],
    [StockMovementType.ADJUSTMENT, 2, 2],
  ])('delta de %s com quantity %p é %p', (type, quantity, delta) => {
    const movement = StockMovement.create({
      productId: 'product-1',
      type,
      quantity,
    });

    expect(movement.delta).toBe(delta);
  });
});
