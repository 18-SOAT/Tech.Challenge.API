import type { Vehicle } from '../../../vehicle/domain/entities/vehicle.entity.js';
import type { VehicleRepository } from '../../../vehicle/domain/repositories/vehicle.repository.js';
import type { Order } from '../../domain/entities/order.entity.js';
import type { ServiceOrder } from '../../domain/entities/service-order.entity.js';
import type { ProgressStage } from '../../domain/enums/progress-stage.enum.js';
import type { QuoteLine } from '../../domain/ports/service-order.mailer.js';
import type { ServiceOrderRepository } from '../../domain/repositories/service-order.repository.js';
import { OrderProgress } from '../../domain/services/order-progress.js';

// Andamento de uma Ordem como o cliente vê (read model "Consultar andamento").
export interface OrderProgressView {
  order: Order;
  vehicle: Vehicle | null;
  stage: ProgressStage;
  serviceOrders: {
    serviceOrder: ServiceOrder;
    stage: ProgressStage;
    // Só no detalhe: a lista não carrega o catálogo.
    lines?: QuoteLine[];
  }[];
}

// Monta a visão de uma Ordem: OS dela, veículo e o estágio de cada uma.
export async function loadOrderProgress(
  order: Order,
  serviceOrders: ServiceOrderRepository,
  vehicles: VehicleRepository,
): Promise<OrderProgressView> {
  const items = await serviceOrders.findByOrderId(order.idValue);
  return {
    order,
    vehicle: await vehicles.findById(order.vehicleIdValue),
    stage: OrderProgress.ofOrder(order, items),
    serviceOrders: items.map((serviceOrder) => ({
      serviceOrder,
      stage: OrderProgress.ofServiceOrder(serviceOrder),
    })),
  };
}
