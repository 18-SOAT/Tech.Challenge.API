import type { UseCase } from '../../../../shared/application/use-case.interface.js';
import { CustomerError } from '../../../customer/domain/errors/customer.error.js';
import type { CustomerRepository } from '../../../customer/domain/repositories/customer.repository.js';
import { Document } from '../../../customer/domain/value-objects/document.vo.js';
import { ServiceError } from '../../../inventory/domain/errors/service.error.js';
import type { ServiceRepository } from '../../../inventory/domain/repositories/service.repository.js';
import { VehicleError } from '../../../vehicle/domain/errors/vehicle.error.js';
import type { VehicleRepository } from '../../../vehicle/domain/repositories/vehicle.repository.js';
import { LicensePlate } from '../../../vehicle/domain/value-objects/license-plate.vo.js';
import { Order } from '../../domain/entities/order.entity.js';
import { ServiceOrder } from '../../domain/entities/service-order.entity.js';
import { OrderError } from '../../domain/errors/order.error.js';
import type { OrderOpeningRepository } from '../../domain/ports/order-opening.repository.js';
import type { OrderRepository } from '../../domain/repositories/order.repository.js';

export interface OpenOrderInput {
  document: string;
  plate: string;
  notes?: string | null;
  description?: string | null;
  // Serviços que o cliente pediu no balcão; o mecânico completa no diagnóstico.
  services?: { serviceId: string; quantity: number }[];
  openedById: string;
}

export interface OpenOrderOutput {
  order: Order;
  serviceOrder: ServiceOrder;
}

// "Abrir ordem" (Recebida) ⟶ "Criar OS" (Em diagnóstico). As regras que cruzam
// agregados (veículo do cliente, uma ordem aberta por veículo) ficam aqui: nenhuma
// entity enxerga os dois lados.
export class OpenOrderUseCase
  implements UseCase<OpenOrderInput, OpenOrderOutput>
{
  constructor(
    private readonly customerRepository: CustomerRepository,
    private readonly vehicleRepository: VehicleRepository,
    private readonly serviceRepository: ServiceRepository,
    private readonly orderRepository: OrderRepository,
    private readonly orderOpening: OrderOpeningRepository,
  ) {}

  async execute(input: OpenOrderInput): Promise<OpenOrderOutput> {
    // VOs primeiro: documento ou placa inválidos são 400, antes de ir ao banco.
    const document = Document.create(input.document);
    const plate = LicensePlate.create(input.plate);

    const customer = await this.customerRepository.findByDocument(
      document.value,
    );
    if (!customer) throw CustomerError.notFound();
    const vehicle = await this.vehicleRepository.findByPlate(plate.value);
    if (!vehicle) throw VehicleError.notFound();
    if (vehicle.customerIdValue !== customer.idValue) {
      throw OrderError.vehicleNotOwnedByCustomer();
    }
    if (await this.orderRepository.hasOpenForVehicle(vehicle.idValue)) {
      throw OrderError.vehicleHasOpenOrder();
    }

    const order = Order.open({
      customerId: customer.idValue,
      vehicleId: vehicle.idValue,
      notes: input.notes,
    });
    const serviceOrder = ServiceOrder.create({
      orderId: order.idValue,
      description: input.description,
      createdById: input.openedById,
    });
    for (const requested of input.services ?? []) {
      const service = await this.serviceRepository.findById(
        requested.serviceId,
      );
      if (!service) throw ServiceError.notFound();
      serviceOrder.addService(service, requested.quantity);
    }

    const saved = await this.orderOpening.open(order, serviceOrder);
    return { order: saved, serviceOrder };
  }
}
