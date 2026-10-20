import type { StockMovement } from '../../src/modules/inventory/domain/entities/stock-movement.entity.js';
import { ProductError } from '../../src/modules/inventory/domain/errors/product.error.js';
import type { StockMovementRepository } from '../../src/modules/inventory/domain/ports/stock-movement.repository.js';
import type { Page, PageRequest } from '../../src/shared/domain/pagination.js';
import type { InMemoryProductRepository } from './in-memory-product.repository.js';

// Atômico como o adapter: valida tudo (produto existe, saldo gravado + delta ≥ 0)
// antes de mutar qualquer coleção.
export class InMemoryStockMovementRepository
  implements StockMovementRepository
{
  readonly items: StockMovement[] = [];

  constructor(private readonly products: InMemoryProductRepository) {}

  async record(movement: StockMovement): Promise<void> {
    const stored = this.products.items.find(
      (p) => p.idValue === movement.productIdValue,
    );
    if (!stored) throw ProductError.notFound();
    const balance = stored.stockQuantityValue + movement.delta;
    if (balance < 0) throw ProductError.insufficientStock();

    this.products.setStock(stored.idValue, balance);
    this.products.referenced.add(stored.idValue);
    this.items.push(movement);
  }

  async findByProduct(
    productId: string,
    page: PageRequest,
  ): Promise<Page<StockMovement>> {
    // Mais recente primeiro: inserção em ordem, então basta inverter.
    const matches = this.items
      .filter((m) => m.productIdValue === productId)
      .reverse();
    const start = (page.page - 1) * page.limit;
    return {
      items: matches.slice(start, start + page.limit),
      total: matches.length,
    };
  }
}
