import { afterAll, beforeAll, beforeEach } from 'bun:test';
import type { PrismaClient } from '../../../src/shared/infrastructure/prisma/client.js';
import {
  type Employee,
  loginEmployee,
  SEED_ADMIN,
  SEED_MECHANIC,
} from './actors.js';
import { type Api, startApi } from './api.js';
import { prepareTestDatabase, resetWorld } from './database.js';

export interface Suite {
  api: Api;
  admin: Employee;
  mechanic: Employee; // MECHANIC do seed: o responsável padrão das OS
}

// Ciclo de vida dos arquivos de cenário: uma app por arquivo e um mundo novo por
// teste (banco vazio + seed + caixa vazia). Os logins são refeitos a cada
// teste porque o reset recria os usuários com outro id.
export function blackBoxSuite(): Suite {
  const suite = {} as Suite;
  let prisma: PrismaClient;

  beforeAll(async () => {
    prisma = await prepareTestDatabase();
    suite.api = startApi();
  });

  beforeEach(async () => {
    await resetWorld(prisma);
    suite.admin = await loginEmployee(suite.api, SEED_ADMIN);
    suite.mechanic = await loginEmployee(suite.api, SEED_MECHANIC);
  });

  afterAll(async () => {
    await suite.api?.stop();
    await prisma?.$disconnect();
  });

  return suite;
}
