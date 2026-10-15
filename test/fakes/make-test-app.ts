import { createApp } from '../../src/app.js';
import { AuthClaimsResolver } from '../../src/modules/auth/application/services/auth-claims.resolver.js';
import { GetMeUseCase } from '../../src/modules/auth/application/use-cases/get-me.use-case.js';
import { LoginUseCase } from '../../src/modules/auth/application/use-cases/login.use-case.js';
import { RegisterCustomerUseCase } from '../../src/modules/auth/application/use-cases/register-customer.use-case.js';
import { FakeDatabaseHealthCheck } from './fake-database-health.js';
import { FakePasswordHasher } from './fake-password-hasher.js';
import { FakeTokenService } from './fake-token-service.js';
import { InMemoryCustomerRepository } from './in-memory-customer.repository.js';
import { InMemoryCustomerRegistrationRepository } from './in-memory-customer-registration.repository.js';
import { InMemoryEmployeeRepository } from './in-memory-employee.repository.js';
import { InMemoryUserRepository } from './in-memory-user.repository.js';

// Composition root de teste: mesma app do server.ts, com fakes no lugar dos adapters.
// Sem banco, sem servidor HTTP — chama via app.handle(new Request(...)).
export function makeTestApp() {
  const users = new InMemoryUserRepository();
  const customers = new InMemoryCustomerRepository();
  const employees = new InMemoryEmployeeRepository();
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
  });

  return { app, users, customers, employees, tokens, database };
}
