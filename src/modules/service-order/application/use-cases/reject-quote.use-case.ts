import type { UseCase } from '../../../../shared/application/use-case.interface.js';
import type { QuoteDecider } from '../../domain/entities/order.entity.js';
import type { ServiceOrder } from '../../domain/entities/service-order.entity.js';
import type { ServiceOrderApprovalRepository } from '../../domain/ports/service-order-approval.repository.js';
import type { OrderRepository } from '../../domain/repositories/order.repository.js';
import type { ServiceOrderRepository } from '../../domain/repositories/service-order.repository.js';
import { loadQuoteForDecision, quoteDeciderId } from './quote-decision.js';

export interface RejectQuoteInput {
  serviceOrderId: string;
  decider: QuoteDecider;
}

// "Rejeitar orçamento": a OS encerra sem execução e sem baixa de estoque.
export class RejectQuoteUseCase
  implements UseCase<RejectQuoteInput, ServiceOrder>
{
  constructor(
    private readonly serviceOrderRepository: ServiceOrderRepository,
    private readonly orderRepository: OrderRepository,
    private readonly approvalRepository: ServiceOrderApprovalRepository,
  ) {}

  async execute(input: RejectQuoteInput): Promise<ServiceOrder> {
    const { serviceOrder } = await loadQuoteForDecision(
      this.serviceOrderRepository,
      this.orderRepository,
      input,
    );

    serviceOrder.reject(quoteDeciderId(input.decider));
    await this.approvalRepository.reject(serviceOrder);
    return serviceOrder;
  }
}
