import { createApp } from '../../src/app.js';
import { AuthClaimsResolver } from '../../src/modules/auth/application/services/auth-claims.resolver.js';
import { GetMeUseCase } from '../../src/modules/auth/application/use-cases/get-me.use-case.js';
import { LoginUseCase } from '../../src/modules/auth/application/use-cases/login.use-case.js';
import { RegisterCustomerUseCase } from '../../src/modules/auth/application/use-cases/register-customer.use-case.js';
import { CreateCustomerUseCase } from '../../src/modules/customer/application/use-cases/create-customer.use-case.js';
import { DeleteCustomerUseCase } from '../../src/modules/customer/application/use-cases/delete-customer.use-case.js';
import { FindCustomerByIdUseCase } from '../../src/modules/customer/application/use-cases/find-customer-by-id.use-case.js';
import { ListCustomersUseCase } from '../../src/modules/customer/application/use-cases/list-customers.use-case.js';
import { UpdateCustomerUseCase } from '../../src/modules/customer/application/use-cases/update-customer.use-case.js';
import { CreateVehicleUseCase } from '../../src/modules/vehicle/application/use-cases/create-vehicle.use-case.js';
import { DeleteVehicleUseCase } from '../../src/modules/vehicle/application/use-cases/delete-vehicle.use-case.js';
import { FindVehicleByIdUseCase } from '../../src/modules/vehicle/application/use-cases/find-vehicle-by-id.use-case.js';
import { ListVehiclesUseCase } from '../../src/modules/vehicle/application/use-cases/list-vehicles.use-case.js';
import { UpdateVehicleUseCase } from '../../src/modules/vehicle/application/use-cases/update-vehicle.use-case.js';
import { FakeDatabaseHealthCheck } from './fake-database-health.js';
import { FakePasswordHasher } from './fake-password-hasher.js';
import { FakeTokenService } from './fake-token-service.js';
import { InMemoryCustomerRepository } from './in-memory-customer.repository.js';
import { InMemoryCustomerRegistrationRepository } from './in-memory-customer-registration.repository.js';
import { InMemoryEmployeeRepository } from './in-memory-employee.repository.js';
import { InMemoryUserRepository } from './in-memory-user.repository.js';
import { InMemoryVehicleRepository } from './in-memory-vehicle.repository.js';

// Composition root de teste: mesma app do server.ts, com fakes no lugar dos adapters.
// Sem banco, sem servidor HTTP — chama via app.handle(new Request(...)).
export function makeTestApp() {
  const users = new InMemoryUserRepository();
  const customers = new InMemoryCustomerRepository();
  const employees = new InMemoryEmployeeRepository();
  const vehicles = new InMemoryVehicleRepository();
  const hasher = new FakePasswordHasher();
  const tokens = new FakeTokenService();
  const claims = new AuthClaimsResolver(customers, employees);
  const database = new FakeDatabaseHealthCheck();

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
  });

  return { app, users, customers, employees, vehicles, tokens, database };
}
