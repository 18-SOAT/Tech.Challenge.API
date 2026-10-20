import type { UseCase } from '../../../../shared/application/use-case.interface.js';
import type {
  Page,
  PageRequest,
} from '../../../../shared/domain/pagination.js';
import type { StockMovement } from '../../domain/entities/stock-movement.entity.js';
import { ProductError } from '../../domain/errors/product.error.js';
import type { StockMovementRepository } from '../../domain/ports/stock-movement.repository.js';
import type { ProductRepository } from '../../domain/repositories/product.repository.js';

export interface ListStockMovementsInput extends PageRequest {
  productId: string;
}

export class ListStockMovementsUseCase
  implements UseCase<ListStockMovementsInput, Page<StockMovement>>
{
  constructor(
    private readonly productRepository: ProductRepository,
    private readonly stockMovementRepository: StockMovementRepository,
  ) {}

  async execute(input: ListStockMovementsInput): Promise<Page<StockMovement>> {
    // 404 em vez de página vazia: produto inexistente não é "sem movimentação".
    if (!(await this.productRepository.findById(input.productId))) {
      throw ProductError.notFound();
    }
    return this.stockMovementRepository.findByProduct(input.productId, {
      page: input.page,
      limit: input.limit,
    });
  }
}
