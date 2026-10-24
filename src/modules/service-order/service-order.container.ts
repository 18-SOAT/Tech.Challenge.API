import type { SharedContainer } from '../../shared/shared.container.js';
import type { CustomerRepository } from '../customer/domain/repositories/customer.repository.js';
import { PrismaCustomerRepository } from '../customer/infrastructure/persistence/prisma-customer.repository.js';
import type { EmployeeRepository } from '../employee/domain/repositories/employee.repository.js';
import { PrismaEmployeeRepository } from '../employee/infrastructure/persistence/prisma-employee.repository.js';
import type { ProductRepository } from '../inventory/domain/repositories/product.repository.js';
import type { ServiceRepository } from '../inventory/domain/repositories/service.repository.js';
import { PrismaProductRepository } from '../inventory/infrastructure/persistence/prisma-product.repository.js';
import { PrismaServiceRepository } from '../inventory/infrastructure/persistence/prisma-service.repository.js';
import type { VehicleRepository } from '../vehicle/domain/repositories/vehicle.repository.js';
import { PrismaVehicleRepository } from '../vehicle/infrastructure/persistence/prisma-vehicle.repository.js';
import { AddProductItemUseCase } from './application/use-cases/add-product-item.use-case.js';
import { AddServiceItemUseCase } from './application/use-cases/add-service-item.use-case.js';
import { ApproveQuoteUseCase } from './application/use-cases/approve-quote.use-case.js';
import { AssignMechanicUseCase } from './application/use-cases/assign-mechanic.use-case.js';
import { ChangeItemQuantityUseCase } from './application/use-cases/change-item-quantity.use-case.js';
import { CompleteDiagnosisUseCase } from './application/use-cases/complete-diagnosis.use-case.js';
import { DeliverOrderUseCase } from './application/use-cases/deliver-order.use-case.js';
import { FindMyOrderUseCase } from './application/use-cases/find-my-order.use-case.js';
import { FindServiceOrderByIdUseCase } from './application/use-cases/find-service-order-by-id.use-case.js';
import { FinishServiceOrderUseCase } from './application/use-cases/finish-service-order.use-case.js';
import { ListMyOrdersUseCase } from './application/use-cases/list-my-orders.use-case.js';
import { OpenAdditionalServiceOrderUseCase } from './application/use-cases/open-additional-service-order.use-case.js';
import { OpenOrderUseCase } from './application/use-cases/open-order.use-case.js';
import { RejectQuoteUseCase } from './application/use-cases/reject-quote.use-case.js';
import { RemoveItemUseCase } from './application/use-cases/remove-item.use-case.js';
import type { OrderDeliveryRepository } from './domain/ports/order-delivery.repository.js';
import type { OrderOpeningRepository } from './domain/ports/order-opening.repository.js';
import type { ServiceOrderMailer } from './domain/ports/service-order.mailer.js';
import type { ServiceOrderApprovalRepository } from './domain/ports/service-order-approval.repository.js';
import type { OrderRepository } from './domain/repositories/order.repository.js';
import type { ServiceOrderRepository } from './domain/repositories/service-order.repository.js';
import { ServiceOrderEmailMailer } from './infrastructure/mailers/service-order.mailer.js';
import { PrismaOrderRepository } from './infrastructure/persistence/prisma-order.repository.js';
import { PrismaOrderDeliveryRepository } from './infrastructure/persistence/prisma-order-delivery.repository.js';
import { PrismaOrderOpeningRepository } from './infrastructure/persistence/prisma-order-opening.repository.js';
import { PrismaServiceOrderRepository } from './infrastructure/persistence/prisma-service-order.repository.js';
import { PrismaServiceOrderApprovalRepository } from './infrastructure/persistence/prisma-service-order-approval.repository.js';

// Composition root do módulo: o único arquivo que liga port → adapter. Os
// repositórios dos outros contextos entram só para leitura (referência por ID).
export function makeServiceOrderContainer(shared: SharedContainer) {
  const customers: CustomerRepository = new PrismaCustomerRepository(
    shared.prisma,
  );
  const vehicles: VehicleRepository = new PrismaVehicleRepository(
    shared.prisma,
  );
  const services: ServiceRepository = new PrismaServiceRepository(
    shared.prisma,
  );
  const products: ProductRepository = new PrismaProductRepository(
    shared.prisma,
  );
  const employees: EmployeeRepository = new PrismaEmployeeRepository(
    shared.prisma,
  );
  const orders: OrderRepository = new PrismaOrderRepository(shared.prisma);
  const serviceOrders: ServiceOrderRepository =
    new PrismaServiceOrderRepository(shared.prisma);
  const orderOpening: OrderOpeningRepository = new PrismaOrderOpeningRepository(
    shared.prisma,
  );
  const delivery: OrderDeliveryRepository = new PrismaOrderDeliveryRepository(
    shared.prisma,
  );
  const approval: ServiceOrderApprovalRepository =
    new PrismaServiceOrderApprovalRepository(shared.prisma);
  const mailer: ServiceOrderMailer = new ServiceOrderEmailMailer(
    shared.emailSender,
  );

  return {
    openOrder: new OpenOrderUseCase(
      customers,
      vehicles,
      services,
      orders,
      orderOpening,
    ),
    openAdditionalServiceOrder: new OpenAdditionalServiceOrderUseCase(
      orders,
      serviceOrders,
    ),
    assignMechanic: new AssignMechanicUseCase(serviceOrders, employees),
    addServiceItem: new AddServiceItemUseCase(serviceOrders, services),
    addProductItem: new AddProductItemUseCase(serviceOrders, products),
    changeItemQuantity: new ChangeItemQuantityUseCase(serviceOrders),
    removeItem: new RemoveItemUseCase(serviceOrders),
    completeDiagnosis: new CompleteDiagnosisUseCase(
      serviceOrders,
      orders,
      customers,
      services,
      products,
      mailer,
    ),
    findServiceOrderById: new FindServiceOrderByIdUseCase(serviceOrders),
    approveQuote: new ApproveQuoteUseCase(
      serviceOrders,
      orders,
      products,
      approval,
    ),
    rejectQuote: new RejectQuoteUseCase(serviceOrders, orders, approval),
    finishServiceOrder: new FinishServiceOrderUseCase(serviceOrders),
    deliverOrder: new DeliverOrderUseCase(orders, serviceOrders, delivery),
    listMyOrders: new ListMyOrdersUseCase(orders, serviceOrders, vehicles),
    findMyOrder: new FindMyOrderUseCase(
      orders,
      serviceOrders,
      vehicles,
      services,
      products,
    ),
  };
}

export type ServiceOrderUseCases = ReturnType<typeof makeServiceOrderContainer>;
