import type { UseCase } from '../../../../shared/application/use-case.interface.js';
import { Money } from '../../../../shared/domain/value-objects/money.vo.js';
import { Product } from '../../domain/entities/product.entity.js';
import type { ProductType } from '../../domain/enums/product-type.enum.js';
import { ProductError } from '../../domain/errors/product.error.js';
import type { ProductRepository } from '../../domain/repositories/product.repository.js';

// Sem campo de saldo: saldo muda só por entrada ou ajuste de estoque.
export interface UpdateProductInput {
  id: string;
  sku?: string;
  name?: string;
  description?: string | null;
  type?: ProductType;
  price?: number;
  minimumStock?: number;
  active?: boolean;
}

export class UpdateProductUseCase
  implements UseCase<UpdateProductInput, Product>
{
  constructor(private readonly productRepository: ProductRepository) {}

  async execute(input: UpdateProductInput): Promise<Product> {
    const product = await this.productRepository.findById(input.id);
    if (!product) throw ProductError.notFound();

    // Checa antes de mutar: unicidade só importa se o SKU é o de outro produto.
    if (input.sku !== undefined) {
      const owner = await this.productRepository.findBySku(
        Product.normalizeSku(input.sku),
      );
      if (owner && owner.idValue !== product.idValue) {
        throw ProductError.skuAlreadyInUse();
      }
    }

    product.update({
      sku: input.sku,
      name: input.name,
      description: input.description,
      type: input.type,
      price:
        input.price === undefined ? undefined : Money.fromReais(input.price),
      minimumStock: input.minimumStock,
    });

    // Desativar é a saída para o produto com histórico, que não pode ser excluído.
    if (input.active === true) product.activate();
    if (input.active === false) product.deactivate();

    await this.productRepository.save(product);
    return product;
  }
}
