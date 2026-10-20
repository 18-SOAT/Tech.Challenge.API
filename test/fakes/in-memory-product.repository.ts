import { Product } from '../../src/modules/inventory/domain/entities/product.entity.js';
import { ProductError } from '../../src/modules/inventory/domain/errors/product.error.js';
import type {
  ProductFilter,
  ProductRepository,
} from '../../src/modules/inventory/domain/repositories/product.repository.js';
import type { Page } from '../../src/shared/domain/pagination.js';

// Cópia do estado, como um SELECT faria: quem altera a entity carregada não altera
// o "banco" sem passar pelo save()/record(). Sem isso, o saldo mutado em memória
// pelo Product.receive() vazaria para cá e o fake esconderia bugs de persistência.
export const cloneProduct = (
  product: Product,
  stockQuantity = product.stockQuantityValue,
): Product =>
  Product.restore({
    id: product.idValue,
    sku: product.skuValue,
    name: product.nameValue,
    description: product.descriptionValue,
    type: product.typeValue,
    price: product.priceValue.value,
    stockQuantity,
    minimumStock: product.minimumStockValue,
    active: product.isActive,
  });

export class InMemoryProductRepository implements ProductRepository {
  readonly items: Product[] = [];
  // Ids referenciados por movimentação ou OS: simula as FKs que o adapter Prisma traduz em erro.
  readonly referenced = new Set<string>();

  async findById(id: string): Promise<Product | null> {
    const product = this.items.find((p) => p.idValue === id);
    return product ? cloneProduct(product) : null;
  }

  async findBySku(sku: string): Promise<Product | null> {
    const product = this.items.find((p) => p.skuValue === sku);
    return product ? cloneProduct(product) : null;
  }

  async findMany(filter: ProductFilter): Promise<Page<Product>> {
    const name = filter.name?.toLowerCase();
    const sku = filter.sku?.toUpperCase();
    const matches = this.items
      .filter(
        (p) =>
          (!name || p.nameValue.toLowerCase().includes(name)) &&
          (!sku || p.skuValue.includes(sku)) &&
          (filter.type === undefined || p.typeValue === filter.type) &&
          (filter.active === undefined || p.isActive === filter.active) &&
          (filter.belowMinimum === undefined ||
            p.isBelowMinimum === filter.belowMinimum),
      )
      .sort((a, b) => a.nameValue.localeCompare(b.nameValue));
    const start = (filter.page - 1) * filter.limit;
    return {
      items: matches
        .slice(start, start + filter.limit)
        .map((p) => cloneProduct(p)),
      total: matches.length,
    };
  }

  // Como o adapter: no update, o saldo gravado prevalece sobre o da entity.
  async save(product: Product): Promise<void> {
    const index = this.items.findIndex((p) => p.idValue === product.idValue);
    const stored = this.items[index];
    if (!stored) {
      this.items.push(cloneProduct(product));
      return;
    }
    this.items[index] = cloneProduct(product, stored.stockQuantityValue);
  }

  async delete(product: Product): Promise<void> {
    if (this.referenced.has(product.idValue)) throw ProductError.inUse();
    const index = this.items.findIndex((p) => p.idValue === product.idValue);
    if (index !== -1) this.items.splice(index, 1);
  }

  // Usado pelo fake de movimentação: troca o saldo gravado.
  setStock(productId: string, stockQuantity: number): void {
    const index = this.items.findIndex((p) => p.idValue === productId);
    const stored = this.items[index];
    if (stored) this.items[index] = cloneProduct(stored, stockQuantity);
  }
}
