import { createApp } from './app.js';
import { makeAuthContainer } from './modules/auth/auth.container.js';
import { makeCustomerContainer } from './modules/customer/customer.container.js';
import { makeEmployeeContainer } from './modules/employee/employee.container.js';
import { makeInventoryContainer } from './modules/inventory/inventory.container.js';
import { makeServiceOrderContainer } from './modules/service-order/service-order.container.js';
import { makeVehicleContainer } from './modules/vehicle/vehicle.container.js';
import { readEnv } from './shared/infrastructure/config/env.js';
import { InMemoryRateLimiter } from './shared/infrastructure/rate-limit/in-memory-rate-limiter.js';
import { makeSharedContainer } from './shared/shared.container.js';

// Único ponto que lê o ambiente, monta os containers reais e sobe o servidor.
const env = readEnv();
const shared = makeSharedContainer(env);

const app = createApp({
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
})
  .onStop(() => shared.prisma.$disconnect())
  .listen(env.PORT);

console.log(
  `🚀 API em http://localhost:${app.server?.port} — docs em /openapi`,
);
