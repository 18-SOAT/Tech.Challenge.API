import type { UseCase } from '../../../../shared/application/use-case.interface.js';
import type { Product } from '../../domain/entities/product.entity.js';
import { ProductError } from '../../domain/errors/product.error.js';
import type { StockMovementRepository } from '../../domain/ports/stock-movement.repository.js';
import type { ProductRepository } from '../../domain/repositories/product.repository.js';

export interface ReceiveStockInput {
  productId: string;
  quantity: number;
  reason?: string | null;
}

export class ReceiveStockUseCase
  implements UseCase<ReceiveStockInput, Product>
{
  constructor(
    private readonly productRepository: ProductRepository,
    private readonly stockMovementRepository: StockMovementRepository,
  ) {}

  async execute(input: ReceiveStockInput): Promise<Product> {
    const product = await this.productRepository.findById(input.productId);
    if (!product) throw ProductError.notFound();

    // A entity valida e devolve o lançamento; o port grava lançamento + saldo
    // numa transação. Use case não sabe que existe transação.
    const movement = product.receive(input.quantity, input.reason);
    await this.stockMovementRepository.record(movement);
    return product;
  }
}
