import type {
  Page,
  PageRequest,
} from '../../../../shared/domain/pagination.js';
import type { StockMovement } from '../entities/stock-movement.entity.js';

// Port nomeado pela operação: registrar uma movimentação grava o lançamento E
// muda o saldo do produto, atomicamente — ou os dois, ou nenhum.
export interface StockMovementRepository {
  // Lança ProductError.insufficientStock se, no banco, o saldo ficaria negativo
  // (corrida com outra movimentação), e ProductError.notFound se o produto sumiu.
  record(movement: StockMovement): Promise<void>;
  // Extrato do produto, do lançamento mais recente para o mais antigo.
  findByProduct(
    productId: string,
    page: PageRequest,
  ): Promise<Page<StockMovement>>;
}
