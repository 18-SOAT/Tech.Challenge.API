import { buildApp } from './build-app.js';
import { readEnv } from './shared/infrastructure/config/env.js';

// Único ponto que lê o ambiente do processo e sobe o servidor.
const env = readEnv();
const app = buildApp(env).listen(env.PORT);

console.log(
  `🚀 API em http://localhost:${app.server?.port} — docs em /openapi`,
);
