import { createApp } from './app.js';
import { makeAuthContainer } from './modules/auth/auth.container.js';
import { makeCustomerContainer } from './modules/customer/customer.container.js';
import { readEnv } from './shared/infrastructure/config/env.js';
import { makeSharedContainer } from './shared/shared.container.js';

// Único ponto que lê o ambiente, monta os containers reais e sobe o servidor.
const env = readEnv();
const shared = makeSharedContainer(env);

const app = createApp({
  tokenService: shared.tokenService,
  databaseHealth: shared.databaseHealth,
  auth: makeAuthContainer(shared),
  customers: makeCustomerContainer(shared),
})
  .onStop(() => shared.prisma.$disconnect())
  .listen(env.PORT);

console.log(
  `🚀 API em http://localhost:${app.server?.port} — docs em /openapi`,
);
