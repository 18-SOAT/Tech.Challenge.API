import type {
  Order,
  QuoteDecider,
} from '../../domain/entities/order.entity.js';
import type { ServiceOrder } from '../../domain/entities/service-order.entity.js';
import { OrderError } from '../../domain/errors/order.error.js';
import { ServiceOrderError } from '../../domain/errors/service-order.error.js';
import type { OrderRepository } from '../../domain/repositories/order.repository.js';
import type { ServiceOrderRepository } from '../../domain/repositories/service-order.repository.js';

// Passo comum de aprovar e rejeitar: carrega a OS e a Ordem dela e confere quem
// decide ANTES do status — quem não pode decidir recebe 403, não um 409 que
// revelaria o andamento da OS de outro cliente.
export async function loadQuoteForDecision(
  serviceOrders: ServiceOrderRepository,
  orders: OrderRepository,
  input: { serviceOrderId: string; decider: QuoteDecider },
): Promise<{ serviceOrder: ServiceOrder; order: Order }> {
  const serviceOrder = await serviceOrders.findById(input.serviceOrderId);
  if (!serviceOrder) throw ServiceOrderError.notFound();
  const order = await orders.findById(serviceOrder.orderIdValue);
  if (!order) throw OrderError.notFound();
  order.assertQuoteCanBeDecidedBy(input.decider);
  return { serviceOrder, order };
}

// Autor da linha do histórico: o funcionário; o cliente fica como null, o "cliente
// ou sistema" do schema (o FK de changed_by_id aponta para employees).
export const quoteDeciderId = (decider: QuoteDecider): string | null =>
  'employeeId' in decider ? decider.employeeId : null;
