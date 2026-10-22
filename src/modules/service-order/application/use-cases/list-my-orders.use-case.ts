import type { UseCase } from '../../../../shared/application/use-case.interface.js';
import type { VehicleRepository } from '../../../vehicle/domain/repositories/vehicle.repository.js';
import type { OrderRepository } from '../../domain/repositories/order.repository.js';
import type { ServiceOrderRepository } from '../../domain/repositories/service-order.repository.js';
import { loadOrderProgress, type OrderProgressView } from './my-orders.js';

export interface ListMyOrdersInput {
  customerId: string;
}

// "Consultar andamento" (lista): as Ordens do cliente do token, mais recentes primeiro.
export class ListMyOrdersUseCase
  implements UseCase<ListMyOrdersInput, OrderProgressView[]>
{
  constructor(
    private readonly orderRepository: OrderRepository,
    private readonly serviceOrderRepository: ServiceOrderRepository,
    private readonly vehicleRepository: VehicleRepository,
  ) {}

  async execute(input: ListMyOrdersInput): Promise<OrderProgressView[]> {
    const orders = await this.orderRepository.findByCustomer(input.customerId);
    return Promise.all(
      orders.map((order) =>
        loadOrderProgress(
          order,
          this.serviceOrderRepository,
          this.vehicleRepository,
        ),
      ),
    );
  }
}
