import type { Order } from '../entities/order.entity.js';
import type { ServiceOrder } from '../entities/service-order.entity.js';

// "Abrir ordem" ⟶ "Criar OS": Order + a primeira ServiceOrder (com itens e
// histórico) numa transação — nunca sobra uma ordem sem OS. Port nomeado pela
// operação (ver docs/code/patterns/repository.md#transações-port-nomeado-pela-operação).
export interface OrderOpeningRepository {
  // Devolve a Order gravada, já com o `number` gerado pelo banco. Lança
  // OrderError.vehicleHasOpenOrder se outra ordem do veículo foi aberta na corrida.
  open(order: Order, serviceOrder: ServiceOrder): Promise<Order>;
}
