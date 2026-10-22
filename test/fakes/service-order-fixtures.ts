import { EmployeeRole } from '../../src/modules/employee/domain/enums/employee-role.enum.js';
import { Product } from '../../src/modules/inventory/domain/entities/product.entity.js';
import { Service } from '../../src/modules/inventory/domain/entities/service.entity.js';
import { ProductType } from '../../src/modules/inventory/domain/enums/product-type.enum.js';
import type { ServiceOrderActor } from '../../src/modules/service-order/domain/entities/service-order.entity.js';
import { Vehicle } from '../../src/modules/vehicle/domain/entities/vehicle.entity.js';
import { makeCustomer, makeEmployee } from './auth-fixtures.js';
import { FakeServiceOrderMailer } from './fake-service-order.mailer.js';
import { InMemoryCustomerRepository } from './in-memory-customer.repository.js';
import { InMemoryEmployeeRepository } from './in-memory-employee.repository.js';
import { InMemoryOrderRepository } from './in-memory-order.repository.js';
import { InMemoryOrderOpeningRepository } from './in-memory-order-opening.repository.js';
import { InMemoryProductRepository } from './in-memory-product.repository.js';
import { InMemoryServiceRepository } from './in-memory-service.repository.js';
import { InMemoryServiceOrderRepository } from './in-memory-service-order.repository.js';
import { InMemoryServiceOrderApprovalRepository } from './in-memory-service-order-approval.repository.js';
import { InMemoryStockMovementRepository } from './in-memory-stock-movement.repository.js';
import { InMemoryVehicleRepository } from './in-memory-vehicle.repository.js';

// Documento e placa do cenário padrão (customer-1 é dono do vehicle-1).
export const CUSTOMER_DOCUMENT = '529.982.247-25';
export const VEHICLE_PLATE = 'ABC1D23';

export const ADMIN_ACTOR: ServiceOrderActor = {
  employeeId: 'admin-1',
  role: EmployeeRole.ADMIN,
};
export const MECHANIC_ACTOR: ServiceOrderActor = {
  employeeId: 'mechanic-1',
  role: EmployeeRole.MECHANIC,
};
export const OTHER_MECHANIC_ACTOR: ServiceOrderActor = {
  employeeId: 'mechanic-2',
  role: EmployeeRole.MECHANIC,
};

export const makeVehicle = (customerId = 'customer-1', id = 'vehicle-1') =>
  Vehicle.restore({
    id,
    customerId,
    plate: VEHICLE_PLATE,
    brand: 'Fiat',
    model: 'Uno',
    year: 2015,
  });

export const makeService = (id = 'service-1', price = 89.9, active = true) =>
  Service.restore({
    id,
    name: 'Troca de óleo',
    description: null,
    price,
    estimatedDurationMinutes: 30,
    active,
  });

export const makeProduct = (id = 'product-1', price = 35.5, active = true) =>
  Product.restore({
    id,
    sku: 'FILTRO-01',
    name: 'Filtro de óleo',
    description: null,
    type: ProductType.PART,
    price,
    stockQuantity: 10,
    minimumStock: 2,
    active,
  });

// Mundo in-memory do contexto Atendimento, já com cliente, veículo, catálogo e equipe.
export function makeServiceOrderWorld() {
  const customers = new InMemoryCustomerRepository();
  const vehicles = new InMemoryVehicleRepository();
  const services = new InMemoryServiceRepository();
  const products = new InMemoryProductRepository();
  const employees = new InMemoryEmployeeRepository();
  const orders = new InMemoryOrderRepository();
  const serviceOrders = new InMemoryServiceOrderRepository();
  const orderOpening = new InMemoryOrderOpeningRepository(
    orders,
    serviceOrders,
  );
  const mailer = new FakeServiceOrderMailer();
  const stockMovements = new InMemoryStockMovementRepository(products);
  const approval = new InMemoryServiceOrderApprovalRepository(
    serviceOrders,
    orders,
    products,
    stockMovements,
  );

  customers.items.push(makeCustomer(null));
  vehicles.items.push(makeVehicle());
  services.items.push(makeService());
  products.items.push(makeProduct());
  employees.items.push(
    makeEmployee('user-1', EmployeeRole.ADMIN, 'admin-1'),
    makeEmployee('user-2', EmployeeRole.MECHANIC, 'mechanic-1'),
    makeEmployee('user-3', EmployeeRole.MECHANIC, 'mechanic-2'),
  );

  return {
    customers,
    vehicles,
    services,
    products,
    employees,
    orders,
    serviceOrders,
    orderOpening,
    mailer,
    stockMovements,
    approval,
  };
}
