import type { UseCase } from '../../../../shared/application/use-case.interface.js';
import type { Page } from '../../../../shared/domain/pagination.js';
import type { Order } from '../../domain/entities/order.entity.js';
import type {
  OrderFilter,
  OrderRepository,
} from '../../domain/repositories/order.repository.js';

// Listagem administrativa das Ordens (estadias), mais recentes primeiro.
export class ListOrdersUseCase implements UseCase<OrderFilter, Page<Order>> {
  constructor(private readonly orderRepository: OrderRepository) {}

  async execute(input: OrderFilter): Promise<Page<Order>> {
    return this.orderRepository.findMany(input);
  }
}
