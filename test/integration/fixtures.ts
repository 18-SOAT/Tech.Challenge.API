import { PrismaCustomerRepository } from '../../src/modules/customer/infrastructure/persistence/prisma-customer.repository.js';
import { EmployeeRole } from '../../src/modules/employee/domain/enums/employee-role.enum.js';
import { PrismaEmployeeRepository } from '../../src/modules/employee/infrastructure/persistence/prisma-employee.repository.js';
import { PrismaProductRepository } from '../../src/modules/inventory/infrastructure/persistence/prisma-product.repository.js';
import { PrismaServiceRepository } from '../../src/modules/inventory/infrastructure/persistence/prisma-service.repository.js';
import { AddProductItemUseCase } from '../../src/modules/service-order/application/use-cases/add-product-item.use-case.js';
import { AssignMechanicUseCase } from '../../src/modules/service-order/application/use-cases/assign-mechanic.use-case.js';
import { CompleteDiagnosisUseCase } from '../../src/modules/service-order/application/use-cases/complete-diagnosis.use-case.js';
import { OpenOrderUseCase } from '../../src/modules/service-order/application/use-cases/open-order.use-case.js';
import { PrismaOrderRepository } from '../../src/modules/service-order/infrastructure/persistence/prisma-order.repository.js';
import { PrismaOrderOpeningRepository } from '../../src/modules/service-order/infrastructure/persistence/prisma-order-opening.repository.js';
import { PrismaServiceOrderRepository } from '../../src/modules/service-order/infrastructure/persistence/prisma-service-order.repository.js';
import { PrismaVehicleRepository } from '../../src/modules/vehicle/infrastructure/persistence/prisma-vehicle.repository.js';
import type { PrismaClient } from '../../src/shared/infrastructure/prisma/client.js';
import { FakeServiceOrderMailer } from '../fakes/fake-service-order.mailer.js';

// Cenário comum dos testes de integração: oficina com ADMIN, MECHANIC, cliente,
// veículo, um serviço e um produto (saldo 10).
export const ADMIN_USER_ID = '01920000-0000-7000-8000-00000000b001';
export const MECHANIC_USER_ID = '01920000-0000-7000-8000-00000000b002';
export const ADMIN_ID = '01920000-0000-7000-8000-00000000a001';
export const MECHANIC_ID = '01920000-0000-7000-8000-00000000a002';
export const CUSTOMER_ID = '01920000-0000-7000-8000-00000000c001';
export const VEHICLE_ID = '01920000-0000-7000-8000-00000000d001';
export const SERVICE_ID = '01920000-0000-7000-8000-00000000e001';
export const PRODUCT_ID = '01920000-0000-7000-8000-00000000f001';
export const OWNER = { customerId: CUSTOMER_ID };
export const ADMIN = { employeeId: ADMIN_ID, role: EmployeeRole.ADMIN };
export const MECHANIC = {
  employeeId: MECHANIC_ID,
  role: EmployeeRole.MECHANIC,
};

export async function seedWorkshop(prisma: PrismaClient): Promise<void> {
  await prisma.user.createMany({
    data: [
      {
        id: ADMIN_USER_ID,
        email: 'admin@oficina.com',
        emailCanonical: 'admin@oficina.com',
        hashedPassword: 'x',
        type: 'EMPLOYEE',
      },
      {
        id: MECHANIC_USER_ID,
        email: 'mecanico@oficina.com',
        emailCanonical: 'mecanico@oficina.com',
        hashedPassword: 'x',
        type: 'EMPLOYEE',
      },
    ],
  });
  await prisma.employee.createMany({
    data: [
      {
        id: ADMIN_ID,
        userId: ADMIN_USER_ID,
        name: 'Ana',
        role: 'ADMIN',
      },
      {
        id: MECHANIC_ID,
        userId: MECHANIC_USER_ID,
        name: 'Beto',
        role: 'MECHANIC',
      },
    ],
  });
  await prisma.customer.create({
    data: {
      id: CUSTOMER_ID,
      document: '52998224725',
      email: 'joao@cliente.com',
    },
  });
  await prisma.vehicle.create({
    data: {
      id: VEHICLE_ID,
      customerId: CUSTOMER_ID,
      plate: 'ABC1D23',
      brand: 'Fiat',
      model: 'Uno',
      year: 2015,
    },
  });
  await prisma.service.create({
    data: { id: SERVICE_ID, name: 'Troca de óleo', price: '89.90' },
  });
  await prisma.product.create({
    data: {
      id: PRODUCT_ID,
      sku: 'FILTRO-01',
      name: 'Filtro de óleo',
      type: 'PART',
      price: '35.50',
      stockQuantity: 10,
    },
  });
}

// Mesmo fluxo da API, com os adapters Prisma: abrir → atribuir → peça → orçamento.
export async function openQuote(
  prisma: PrismaClient,
): Promise<{ orderId: string; serviceOrderId: string }> {
  const orders = new PrismaOrderRepository(prisma);
  const serviceOrders = new PrismaServiceOrderRepository(prisma);
  const products = new PrismaProductRepository(prisma);
  const customers = new PrismaCustomerRepository(prisma);
  const services = new PrismaServiceRepository(prisma);
  const { order, serviceOrder } = await new OpenOrderUseCase(
    customers,
    new PrismaVehicleRepository(prisma),
    services,
    orders,
    new PrismaOrderOpeningRepository(prisma),
  ).execute({
    document: '52998224725',
    plate: 'ABC1D23',
    openedById: ADMIN_ID,
    services: [{ serviceId: SERVICE_ID, quantity: 1 }],
  });
  await new AssignMechanicUseCase(
    serviceOrders,
    new PrismaEmployeeRepository(prisma),
  ).execute({
    serviceOrderId: serviceOrder.idValue,
    mechanicId: MECHANIC_ID,
  });
  await new AddProductItemUseCase(serviceOrders, products).execute({
    serviceOrderId: serviceOrder.idValue,
    productId: PRODUCT_ID,
    quantity: 2,
    actor: MECHANIC,
  });
  await new CompleteDiagnosisUseCase(
    serviceOrders,
    orders,
    customers,
    services,
    products,
    new FakeServiceOrderMailer(),
  ).execute({ serviceOrderId: serviceOrder.idValue, actor: MECHANIC });
  return { orderId: order.idValue, serviceOrderId: serviceOrder.idValue };
}
