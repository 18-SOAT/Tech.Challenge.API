import { createApp } from '../../src/app.js';
import { AuthClaimsResolver } from '../../src/modules/auth/application/services/auth-claims.resolver.js';
import { GetMeUseCase } from '../../src/modules/auth/application/use-cases/get-me.use-case.js';
import { LoginUseCase } from '../../src/modules/auth/application/use-cases/login.use-case.js';
import { RegisterCustomerUseCase } from '../../src/modules/auth/application/use-cases/register-customer.use-case.js';
import { RequestFirstAccessUseCase } from '../../src/modules/auth/application/use-cases/request-first-access.use-case.js';
import { RequestPasswordResetUseCase } from '../../src/modules/auth/application/use-cases/request-password-reset.use-case.js';
import { SetPasswordUseCase } from '../../src/modules/auth/application/use-cases/set-password.use-case.js';
import { CreateCustomerUseCase } from '../../src/modules/customer/application/use-cases/create-customer.use-case.js';
import { DeleteCustomerUseCase } from '../../src/modules/customer/application/use-cases/delete-customer.use-case.js';
import { FindCustomerByIdUseCase } from '../../src/modules/customer/application/use-cases/find-customer-by-id.use-case.js';
import { ListCustomersUseCase } from '../../src/modules/customer/application/use-cases/list-customers.use-case.js';
import { UpdateCustomerUseCase } from '../../src/modules/customer/application/use-cases/update-customer.use-case.js';
import { ChangeEmployeeRoleUseCase } from '../../src/modules/employee/application/use-cases/change-employee-role.use-case.js';
import { CreateEmployeeUseCase } from '../../src/modules/employee/application/use-cases/create-employee.use-case.js';
import { FindEmployeeByIdUseCase } from '../../src/modules/employee/application/use-cases/find-employee-by-id.use-case.js';
import { ListEmployeesUseCase } from '../../src/modules/employee/application/use-cases/list-employees.use-case.js';
import { AdjustStockUseCase } from '../../src/modules/inventory/application/use-cases/adjust-stock.use-case.js';
import { CreateProductUseCase } from '../../src/modules/inventory/application/use-cases/create-product.use-case.js';
import { CreateServiceUseCase } from '../../src/modules/inventory/application/use-cases/create-service.use-case.js';
import { DeleteProductUseCase } from '../../src/modules/inventory/application/use-cases/delete-product.use-case.js';
import { DeleteServiceUseCase } from '../../src/modules/inventory/application/use-cases/delete-service.use-case.js';
import { FindProductByIdUseCase } from '../../src/modules/inventory/application/use-cases/find-product-by-id.use-case.js';
import { FindServiceByIdUseCase } from '../../src/modules/inventory/application/use-cases/find-service-by-id.use-case.js';
import { ListProductsUseCase } from '../../src/modules/inventory/application/use-cases/list-products.use-case.js';
import { ListServicesUseCase } from '../../src/modules/inventory/application/use-cases/list-services.use-case.js';
import { ListStockMovementsUseCase } from '../../src/modules/inventory/application/use-cases/list-stock-movements.use-case.js';
import { ReceiveStockUseCase } from '../../src/modules/inventory/application/use-cases/receive-stock.use-case.js';
import { UpdateProductUseCase } from '../../src/modules/inventory/application/use-cases/update-product.use-case.js';
import { UpdateServiceUseCase } from '../../src/modules/inventory/application/use-cases/update-service.use-case.js';
import { AddProductItemUseCase } from '../../src/modules/service-order/application/use-cases/add-product-item.use-case.js';
import { AddServiceItemUseCase } from '../../src/modules/service-order/application/use-cases/add-service-item.use-case.js';
import { ApproveQuoteUseCase } from '../../src/modules/service-order/application/use-cases/approve-quote.use-case.js';
import { AssignMechanicUseCase } from '../../src/modules/service-order/application/use-cases/assign-mechanic.use-case.js';
import { ChangeItemQuantityUseCase } from '../../src/modules/service-order/application/use-cases/change-item-quantity.use-case.js';
import { CompleteDiagnosisUseCase } from '../../src/modules/service-order/application/use-cases/complete-diagnosis.use-case.js';
import { DeliverOrderUseCase } from '../../src/modules/service-order/application/use-cases/deliver-order.use-case.js';
import { FindMyOrderUseCase } from '../../src/modules/service-order/application/use-cases/find-my-order.use-case.js';
import { FindServiceOrderByIdUseCase } from '../../src/modules/service-order/application/use-cases/find-service-order-by-id.use-case.js';
import { FinishServiceOrderUseCase } from '../../src/modules/service-order/application/use-cases/finish-service-order.use-case.js';
import { ListMyOrdersUseCase } from '../../src/modules/service-order/application/use-cases/list-my-orders.use-case.js';
import { OpenAdditionalServiceOrderUseCase } from '../../src/modules/service-order/application/use-cases/open-additional-service-order.use-case.js';
import { OpenOrderUseCase } from '../../src/modules/service-order/application/use-cases/open-order.use-case.js';
import { RejectQuoteUseCase } from '../../src/modules/service-order/application/use-cases/reject-quote.use-case.js';
import { RemoveItemUseCase } from '../../src/modules/service-order/application/use-cases/remove-item.use-case.js';
import { CreateVehicleUseCase } from '../../src/modules/vehicle/application/use-cases/create-vehicle.use-case.js';
import { DeleteVehicleUseCase } from '../../src/modules/vehicle/application/use-cases/delete-vehicle.use-case.js';
import { FindVehicleByIdUseCase } from '../../src/modules/vehicle/application/use-cases/find-vehicle-by-id.use-case.js';
import { ListVehiclesUseCase } from '../../src/modules/vehicle/application/use-cases/list-vehicles.use-case.js';
import { UpdateVehicleUseCase } from '../../src/modules/vehicle/application/use-cases/update-vehicle.use-case.js';
import { FakeAccessLinkMailer } from './fake-access-link-mailer.js';
import { FakeAccessLinkTokenService } from './fake-access-link-token-service.js';
import { FakeDatabaseHealthCheck } from './fake-database-health.js';
import { FakePasswordHasher } from './fake-password-hasher.js';
import { FakeServiceOrderMailer } from './fake-service-order.mailer.js';
import { FakeTokenService } from './fake-token-service.js';
import { InMemoryCustomerRepository } from './in-memory-customer.repository.js';
import { InMemoryCustomerAccessActivationRepository } from './in-memory-customer-access-activation.repository.js';
import { InMemoryCustomerRegistrationRepository } from './in-memory-customer-registration.repository.js';
import { InMemoryEmployeeRepository } from './in-memory-employee.repository.js';
import { InMemoryEmployeeRegistrationRepository } from './in-memory-employee-registration.repository.js';
import { InMemoryOrderRepository } from './in-memory-order.repository.js';
import { InMemoryOrderDeliveryRepository } from './in-memory-order-delivery.repository.js';
import { InMemoryOrderOpeningRepository } from './in-memory-order-opening.repository.js';
import { InMemoryProductRepository } from './in-memory-product.repository.js';
import { InMemoryServiceRepository } from './in-memory-service.repository.js';
import { InMemoryServiceOrderRepository } from './in-memory-service-order.repository.js';
import { InMemoryServiceOrderApprovalRepository } from './in-memory-service-order-approval.repository.js';
import { InMemoryStockMovementRepository } from './in-memory-stock-movement.repository.js';
import { InMemoryUserRepository } from './in-memory-user.repository.js';
import { InMemoryVehicleRepository } from './in-memory-vehicle.repository.js';

// Composition root de teste: mesma app do server.ts, com fakes no lugar dos adapters.
// Sem banco, sem servidor HTTP — chama via app.handle(new Request(...)).
export function makeTestApp() {
  const users = new InMemoryUserRepository();
  const customers = new InMemoryCustomerRepository();
  const employees = new InMemoryEmployeeRepository();
  const vehicles = new InMemoryVehicleRepository();
  const services = new InMemoryServiceRepository();
  const products = new InMemoryProductRepository();
  const stockMovements = new InMemoryStockMovementRepository(products);
  const hasher = new FakePasswordHasher();
  const tokens = new FakeTokenService();
  const accessLinks = new FakeAccessLinkTokenService();
  const mailer = new FakeAccessLinkMailer();
  const claims = new AuthClaimsResolver(customers, employees);
  const database = new FakeDatabaseHealthCheck();
  const orders = new InMemoryOrderRepository();
  const serviceOrders = new InMemoryServiceOrderRepository();
  const quoteMailer = new FakeServiceOrderMailer();
  const approval = new InMemoryServiceOrderApprovalRepository(
    serviceOrders,
    orders,
    products,
    stockMovements,
  );

  const app = createApp({
    tokenService: tokens,
    databaseHealth: database,
    auth: {
      registerCustomer: new RegisterCustomerUseCase(
        users,
        customers,
        new InMemoryCustomerRegistrationRepository(users, customers),
        hasher,
      ),
      login: new LoginUseCase(users, hasher, tokens, claims),
      getMe: new GetMeUseCase(users, claims),
      requestFirstAccess: new RequestFirstAccessUseCase(
        customers,
        accessLinks,
        mailer,
      ),
      requestPasswordReset: new RequestPasswordResetUseCase(
        users,
        accessLinks,
        mailer,
      ),
      setPassword: new SetPasswordUseCase(
        accessLinks,
        customers,
        users,
        new InMemoryCustomerAccessActivationRepository(users, customers),
        hasher,
      ),
    },
    employees: {
      createEmployee: new CreateEmployeeUseCase(
        users,
        new InMemoryEmployeeRegistrationRepository(users, employees),
        hasher,
        accessLinks,
        mailer,
      ),
      listEmployees: new ListEmployeesUseCase(employees),
      findEmployeeById: new FindEmployeeByIdUseCase(employees),
      changeEmployeeRole: new ChangeEmployeeRoleUseCase(employees),
    },
    customers: {
      createCustomer: new CreateCustomerUseCase(customers),
      listCustomers: new ListCustomersUseCase(customers),
      findCustomerById: new FindCustomerByIdUseCase(customers),
      updateCustomer: new UpdateCustomerUseCase(customers),
      deleteCustomer: new DeleteCustomerUseCase(customers),
    },
    vehicles: {
      createVehicle: new CreateVehicleUseCase(vehicles, customers),
      listVehicles: new ListVehiclesUseCase(vehicles),
      findVehicleById: new FindVehicleByIdUseCase(vehicles),
      updateVehicle: new UpdateVehicleUseCase(vehicles),
      deleteVehicle: new DeleteVehicleUseCase(vehicles),
    },
    inventory: {
      createService: new CreateServiceUseCase(services),
      listServices: new ListServicesUseCase(services),
      findServiceById: new FindServiceByIdUseCase(services),
      updateService: new UpdateServiceUseCase(services),
      deleteService: new DeleteServiceUseCase(services),
      createProduct: new CreateProductUseCase(products),
      listProducts: new ListProductsUseCase(products),
      findProductById: new FindProductByIdUseCase(products),
      updateProduct: new UpdateProductUseCase(products),
      deleteProduct: new DeleteProductUseCase(products),
      receiveStock: new ReceiveStockUseCase(products, stockMovements),
      adjustStock: new AdjustStockUseCase(products, stockMovements),
      listStockMovements: new ListStockMovementsUseCase(
        products,
        stockMovements,
      ),
    },
    serviceOrders: {
      openOrder: new OpenOrderUseCase(
        customers,
        vehicles,
        services,
        orders,
        new InMemoryOrderOpeningRepository(orders, serviceOrders),
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
        quoteMailer,
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
      deliverOrder: new DeliverOrderUseCase(
        orders,
        serviceOrders,
        new InMemoryOrderDeliveryRepository(orders, serviceOrders),
      ),
      listMyOrders: new ListMyOrdersUseCase(orders, serviceOrders, vehicles),
      findMyOrder: new FindMyOrderUseCase(
        orders,
        serviceOrders,
        vehicles,
        services,
        products,
      ),
    },
  });

  return {
    app,
    users,
    customers,
    employees,
    vehicles,
    services,
    products,
    stockMovements,
    tokens,
    accessLinks,
    mailer,
    database,
    orders,
    serviceOrders,
    quoteMailer,
  };
}
