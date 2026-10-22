import type { StockMovement } from '../../src/modules/inventory/domain/entities/stock-movement.entity.js';
import { ProductError } from '../../src/modules/inventory/domain/errors/product.error.js';
import type { Order } from '../../src/modules/service-order/domain/entities/order.entity.js';
import type { ServiceOrder } from '../../src/modules/service-order/domain/entities/service-order.entity.js';
import { ServiceOrderStatus } from '../../src/modules/service-order/domain/enums/service-order-status.enum.js';
import { ServiceOrderError } from '../../src/modules/service-order/domain/errors/service-order.error.js';
import type { ServiceOrderApprovalRepository } from '../../src/modules/service-order/domain/ports/service-order-approval.repository.js';
import type { InMemoryOrderRepository } from './in-memory-order.repository.js';
import type { InMemoryProductRepository } from './in-memory-product.repository.js';
import type { InMemoryServiceOrderRepository } from './in-memory-service-order.repository.js';
import type { InMemoryStockMovementRepository } from './in-memory-stock-movement.repository.js';

// Atômico como o adapter: confere o status GRAVADO da OS e o saldo GRAVADO de cada
// peça antes de mutar qualquer coleção — ou tudo é gravado, ou nada.
export class InMemoryServiceOrderApprovalRepository
  implements ServiceOrderApprovalRepository
{
  constructor(
    private readonly serviceOrders: InMemoryServiceOrderRepository,
    private readonly orders: InMemoryOrderRepository,
    private readonly products: InMemoryProductRepository,
    private readonly stockMovements: InMemoryStockMovementRepository,
  ) {}

  async approve(
    serviceOrder: ServiceOrder,
    order: Order,
    movements: StockMovement[],
  ): Promise<void> {
    this.assertStillAwaiting(serviceOrder);
    for (const movement of movements) {
      const stored = this.products.items.find(
        (p) => p.idValue === movement.productIdValue,
      );
      if (!stored) throw ProductError.notFound();
      if (stored.stockQuantityValue + movement.delta < 0) {
        throw ProductError.insufficientStock();
      }
    }

    await this.serviceOrders.save(serviceOrder);
    for (const movement of movements) {
      await this.stockMovements.record(movement);
    }
    this.orders.replace(order);
  }

  async reject(serviceOrder: ServiceOrder): Promise<void> {
    this.assertStillAwaiting(serviceOrder);
    await this.serviceOrders.save(serviceOrder);
  }

  // O "update condicional" do fake: outra decisão já gravada → 409.
  private assertStillAwaiting(serviceOrder: ServiceOrder): void {
    const stored = this.serviceOrders.items.find(
      (item) => item.idValue === serviceOrder.idValue,
    );
    if (stored?.statusValue !== ServiceOrderStatus.AWAITING_APPROVAL) {
      throw ServiceOrderError.notAwaitingApproval();
    }
  }
}
