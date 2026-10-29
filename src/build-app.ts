import { createApp } from './app.js';
import { makeAuthContainer } from './modules/auth/auth.container.js';
import { makeCustomerContainer } from './modules/customer/customer.container.js';
import { makeEmployeeContainer } from './modules/employee/employee.container.js';
import { makeInventoryContainer } from './modules/inventory/inventory.container.js';
import { makeServiceOrderContainer } from './modules/service-order/service-order.container.js';
import { makeVehicleContainer } from './modules/vehicle/vehicle.container.js';
import type { Env } from './shared/infrastructure/config/env.js';
import { InMemoryRateLimiter } from './shared/infrastructure/rate-limit/in-memory-rate-limiter.js';
import { makeSharedContainer } from './shared/shared.container.js';

// Monta a app com os containers reais, sem subir o servidor. O server.ts chama
// `.listen()`; os testes black-box sobem a mesma montagem com outro ambiente
// (banco de teste, Mailpit) numa porta aleatória.
export function buildApp(env: Env) {
  const shared = makeSharedContainer(env);

  return createApp({
    http: {
      corsOrigins: env.CORS_ORIGINS,
      rateLimit: {
        limiter: new InMemoryRateLimiter({
          max: env.RATE_LIMIT_MAX,
          windowMs: env.RATE_LIMIT_WINDOW_SECONDS * 1000,
        }),
        trustProxy: env.TRUST_PROXY,
      },
    },
    tokenService: shared.tokenService,
    databaseHealth: shared.databaseHealth,
    auth: makeAuthContainer(shared),
    customers: makeCustomerContainer(shared),
    vehicles: makeVehicleContainer(shared),
    inventory: makeInventoryContainer(shared),
    employees: makeEmployeeContainer(shared),
    serviceOrders: makeServiceOrderContainer(shared),
  }).onStop(() => shared.prisma.$disconnect());
}
