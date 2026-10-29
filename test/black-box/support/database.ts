import { seedDemoEmployees } from '../../../prisma/seed.js';
import type { PrismaClient } from '../../../src/shared/infrastructure/prisma/client.js';
import {
  prepareTestDatabase,
  resetDatabase,
} from '../../integration/database.js';
import { clearInbox } from './mailpit.js';

export { prepareTestDatabase };

// Ponto de partida de todo cenário: banco vazio + ADMIN e MECHANIC do seed (com
// senha de verdade, para logar via HTTP) + caixa do Mailpit vazia. `env: {}`:
// credenciais padrão do seed, nunca as do `.env` local.
export async function resetWorld(prisma: PrismaClient): Promise<void> {
  await resetDatabase(prisma);
  await seedDemoEmployees(prisma, { env: {}, log: () => {} });
  await clearInbox();
}
