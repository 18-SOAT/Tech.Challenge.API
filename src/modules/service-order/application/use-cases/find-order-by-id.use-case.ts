import type { UseCase } from '../../../../shared/application/use-case.interface.js';
import { Money } from '../../../../shared/domain/value-objects/money.vo.js';
import type { Order } from '../../domain/entities/order.entity.js';
import type { ServiceOrder } from '../../domain/entities/service-order.entity.js';
import type { ProgressStage } from '../../domain/enums/progress-stage.enum.js';
import { OrderError } from '../../domain/errors/order.error.js';
import type { OrderRepository } from '../../domain/repositories/order.repository.js';
import type { ServiceOrderRepository } from '../../domain/repositories/service-order.repository.js';
import { OrderProgress } from '../../domain/services/order-progress.js';

export interface FindOrderByIdInput {
  id: string;
}

// Detalhe da Ordem para a equipe: as OS da estadia, os totais e o andamento.
export interface OrderDetail {
  order: Order;
  serviceOrders: ServiceOrder[];
  stage: ProgressStage;
  // Soma dos orçamentos de todas as OS, inclusive as rejeitadas.
  quotedTotal: Money;
  // Soma dos valores congelados nas aprovações: o que o cliente vai pagar.
  approvedTotal: Money;
}

export class FindOrderByIdUseCase
  implements UseCase<FindOrderByIdInput, OrderDetail>
{
  constructor(
    private readonly orderRepository: OrderRepository,
    private readonly serviceOrderRepository: ServiceOrderRepository,
  ) {}

  async execute(input: FindOrderByIdInput): Promise<OrderDetail> {
    const order = await this.orderRepository.findById(input.id);
    if (!order) throw OrderError.notFound();
    const serviceOrders = await this.serviceOrderRepository.findByOrderId(
      order.idValue,
    );
    const sum = (amounts: (Money | null)[]) =>
      Money.fromCents(
        amounts.reduce((cents, amount) => cents + (amount?.cents ?? 0), 0),
      );
    return {
      order,
      serviceOrders,
      stage: OrderProgress.ofOrder(order, serviceOrders),
      quotedTotal: sum(serviceOrders.map((so) => so.total)),
      approvedTotal: sum(serviceOrders.map((so) => so.approvedAmountValue)),
    };
  }
}
