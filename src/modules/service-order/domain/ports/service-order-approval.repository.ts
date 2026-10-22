import type { StockMovement } from '../../../inventory/domain/entities/stock-movement.entity.js';
import type { Order } from '../entities/order.entity.js';
import type { ServiceOrder } from '../entities/service-order.entity.js';

// Decisão do orçamento, atômica. Port nomeado pela operação (ver
// docs/code/patterns/repository.md#transações-port-nomeado-pela-operação).
export interface ServiceOrderApprovalRepository {
  // Valor aprovado + status + histórico da OS, baixa de cada peça e início da Ordem:
  // tudo ou nada. Lança ServiceOrderError.notAwaitingApproval se outra requisição
  // já decidiu o orçamento, e ProductError.insufficientStock se, no banco, o saldo
  // de alguma peça não cobre a baixa.
  approve(
    serviceOrder: ServiceOrder,
    order: Order,
    movements: StockMovement[],
  ): Promise<void>;
  // Status + histórico. Mesma proteção contra decisão concorrente.
  reject(serviceOrder: ServiceOrder): Promise<void>;
}
