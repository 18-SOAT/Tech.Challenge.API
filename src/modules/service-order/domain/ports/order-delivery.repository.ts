import type { Order } from '../entities/order.entity.js';

// "Entregar veículo", atômico com a regra das OS terminais. Port nomeado pela
// operação (ver docs/code/patterns/repository.md#transações-port-nomeado-pela-operação).
export interface OrderDeliveryRepository {
  // Trava a Ordem e reconfere as OS dentro da transação: um reparo adicional aberto
  // na corrida faz a entrega falhar com OrderError.hasOpenServiceOrders.
  deliver(order: Order): Promise<void>;
}
