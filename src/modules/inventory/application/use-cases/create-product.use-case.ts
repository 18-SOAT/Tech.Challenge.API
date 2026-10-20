import type { UseCase } from '../../../../shared/application/use-case.interface.js';
import { Money } from '../../../../shared/domain/value-objects/money.vo.js';
import { Product } from '../../domain/entities/product.entity.js';
import type { ProductType } from '../../domain/enums/product-type.enum.js';
import { ProductError } from '../../domain/errors/product.error.js';
import type { ProductRepository } from '../../domain/repositories/product.repository.js';

export interface CreateProductInput {
  sku: string;
  name: string;
  description?: string | null;
  type: ProductType;
  price: number;
  minimumStock?: number;
}

export class CreateProductUseCase
  implements UseCase<CreateProductInput, Product>
{
  constructor(private readonly productRepository: ProductRepository) {}

  async execute(input: CreateProductInput): Promise<Product> {
    const product = Product.create({
      sku: input.sku,
      name: input.name,
      description: input.description,
      type: input.type,
      price: Money.fromReais(input.price),
      minimumStock: input.minimumStock,
    });

    // SKU único é regra do catálogo inteiro (I/O): checado aqui, não na entity.
    if (await this.productRepository.findBySku(product.skuValue)) {
      throw ProductError.skuAlreadyInUse();
    }

    await this.productRepository.save(product);
    return product;
  }
}
