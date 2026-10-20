import type {
  Page,
  PageRequest,
} from '../../../../shared/domain/pagination.js';
import type { Product } from '../entities/product.entity.js';
import type { ProductType } from '../enums/product-type.enum.js';

// Filtros opcionais da listagem: `name` e `sku` são busca parcial sem diferenciar
// maiúscula; `belowMinimum: true` é a consulta "Produtos abaixo do mínimo".
export interface ProductFilter extends PageRequest {
  name?: string;
  sku?: string;
  type?: ProductType;
  active?: boolean;
  belowMinimum?: boolean;
}

export interface ProductRepository {
  findById(id: string): Promise<Product | null>;
  // Recebe o SKU já normalizado (Product.normalizeSku).
  findBySku(sku: string): Promise<Product | null>;
  findMany(filter: ProductFilter): Promise<Page<Product>>;
  // Insere ou atualiza os dados de catálogo. NUNCA grava o saldo de produto
  // existente: saldo só muda pelo StockMovementRepository.record().
  // Lança ProductError.skuAlreadyInUse em corrida de SKU.
  save(product: Product): Promise<void>;
  // Lança ProductError.inUse se o produto tem movimentação ou entrou em alguma OS.
  delete(product: Product): Promise<void>;
}
