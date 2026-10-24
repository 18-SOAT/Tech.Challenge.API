import type { UseCase } from '../../../../shared/application/use-case.interface.js';
import type { StockMovement } from '../../../inventory/domain/entities/stock-movement.entity.js';
import { ProductError } from '../../../inventory/domain/errors/product.error.js';
import type { ProductRepository } from '../../../inventory/domain/repositories/product.repository.js';
import type { QuoteDecider } from '../../domain/entities/order.entity.js';
import type { ServiceOrder } from '../../domain/entities/service-order.entity.js';
import type { ServiceOrderApprovalRepository } from '../../domain/ports/service-order-approval.repository.js';
import type { OrderRepository } from '../../domain/repositories/order.repository.js';
import type { ServiceOrderRepository } from '../../domain/repositories/service-order.repository.js';
import { loadQuoteForDecision, quoteDeciderId } from './quote-decision.js';

export interface ApproveQuoteInput {
  serviceOrderId: string;
  decider: QuoteDecider;
}

// "Aprovar orçamento" ⟶ "Baixar estoque" e "Iniciar ordem", numa transação só.
export class ApproveQuoteUseCase
  implements UseCase<ApproveQuoteInput, ServiceOrder>
{
  constructor(
    private readonly serviceOrderRepository: ServiceOrderRepository,
    private readonly orderRepository: OrderRepository,
    private readonly productRepository: ProductRepository,
    private readonly approvalRepository: ServiceOrderApprovalRepository,
  ) {}

  async execute(input: ApproveQuoteInput): Promise<ServiceOrder> {
    const { serviceOrder, order } = await loadQuoteForDecision(
      this.serviceOrderRepository,
      this.orderRepository,
      input,
    );

    serviceOrder.approve(quoteDeciderId(input.decider));
    const movements: StockMovement[] = [];
    for (const item of serviceOrder.productsValue) {
      const product = await this.productRepository.findById(
        item.productIdValue,
      );
      if (!product) throw ProductError.notFound();
      movements.push(
        product.withdraw(item.quantityValue, serviceOrder.idValue),
      );
    }
    order.start();

    await this.approvalRepository.approve(serviceOrder, order, movements);
    return serviceOrder;
  }
}
