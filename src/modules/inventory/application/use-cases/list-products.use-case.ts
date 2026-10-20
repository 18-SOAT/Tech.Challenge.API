import type { UseCase } from '../../../../shared/application/use-case.interface.js';
import type { Page } from '../../../../shared/domain/pagination.js';
import type { Product } from '../../domain/entities/product.entity.js';
import type {
  ProductFilter,
  ProductRepository,
} from '../../domain/repositories/product.repository.js';

export class ListProductsUseCase
  implements UseCase<ProductFilter, Page<Product>>
{
  constructor(private readonly productRepository: ProductRepository) {}

  async execute(filter: ProductFilter): Promise<Page<Product>> {
    return this.productRepository.findMany({
      ...filter,
      name: filter.name?.trim() || undefined,
      sku: filter.sku?.trim().toUpperCase() || undefined,
    });
  }
}
