import type { UseCase } from '../../../../shared/application/use-case.interface.js';
import type { Product } from '../../domain/entities/product.entity.js';
import { ProductError } from '../../domain/errors/product.error.js';
import type { ProductRepository } from '../../domain/repositories/product.repository.js';

export class FindProductByIdUseCase implements UseCase<string, Product> {
  constructor(private readonly productRepository: ProductRepository) {}

  async execute(id: string): Promise<Product> {
    const product = await this.productRepository.findById(id);
    if (!product) throw ProductError.notFound();
    return product;
  }
}
