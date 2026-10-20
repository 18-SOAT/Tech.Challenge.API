import type { UseCase } from '../../../../shared/application/use-case.interface.js';
import type { Product } from '../../domain/entities/product.entity.js';
import { ProductError } from '../../domain/errors/product.error.js';
import type { StockMovementRepository } from '../../domain/ports/stock-movement.repository.js';
import type { ProductRepository } from '../../domain/repositories/product.repository.js';

export interface AdjustStockInput {
  productId: string;
  // Delta com sinal: -3 tira 3 unidades, 2 acrescenta 2.
  quantity: number;
  reason: string;
}

export class AdjustStockUseCase implements UseCase<AdjustStockInput, Product> {
  constructor(
    private readonly productRepository: ProductRepository,
    private readonly stockMovementRepository: StockMovementRepository,
  ) {}

  async execute(input: AdjustStockInput): Promise<Product> {
    const product = await this.productRepository.findById(input.productId);
    if (!product) throw ProductError.notFound();

    // A entity barra saldo negativo pelo que leu; o adapter barra de novo no banco
    // (update condicional), caso outra movimentação tenha entrado no meio.
    const movement = product.adjust(input.quantity, input.reason);
    await this.stockMovementRepository.record(movement);
    return product;
  }
}
