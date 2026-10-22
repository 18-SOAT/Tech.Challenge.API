import type { UseCase } from '../../../../shared/application/use-case.interface.js';
import type { ProductRepository } from '../../../inventory/domain/repositories/product.repository.js';
import type { ServiceRepository } from '../../../inventory/domain/repositories/service.repository.js';
import type { VehicleRepository } from '../../../vehicle/domain/repositories/vehicle.repository.js';
import { OrderError } from '../../domain/errors/order.error.js';
import type { OrderRepository } from '../../domain/repositories/order.repository.js';
import type { ServiceOrderRepository } from '../../domain/repositories/service-order.repository.js';
import { loadOrderProgress, type OrderProgressView } from './my-orders.js';
import { buildQuoteLines } from './quote-lines.js';

export interface FindMyOrderInput {
  customerId: string;
  orderId: string;
}

// "Consultar andamento" (detalhe): cada OS com itens, valores e histórico — o
// cliente vê o orçamento antes de aprovar. Ordem de outro cliente responde como
// inexistente (404), para não revelar que ela existe.
export class FindMyOrderUseCase
  implements UseCase<FindMyOrderInput, OrderProgressView>
{
  constructor(
    private readonly orderRepository: OrderRepository,
    private readonly serviceOrderRepository: ServiceOrderRepository,
    private readonly vehicleRepository: VehicleRepository,
    private readonly serviceRepository: ServiceRepository,
    private readonly productRepository: ProductRepository,
  ) {}

  async execute(input: FindMyOrderInput): Promise<OrderProgressView> {
    const order = await this.orderRepository.findById(input.orderId);
    if (!order?.belongsTo(input.customerId)) throw OrderError.notFound();

    const view = await loadOrderProgress(
      order,
      this.serviceOrderRepository,
      this.vehicleRepository,
    );
    for (const item of view.serviceOrders) {
      item.lines = await buildQuoteLines(
        item.serviceOrder,
        this.serviceRepository,
        this.productRepository,
      );
    }
    return view;
  }
}
