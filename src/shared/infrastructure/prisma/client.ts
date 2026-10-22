import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../../../generated/prisma/client.js';

// Conexão lazy: sem $connect no boot — o Prisma conecta na primeira query.
// Assim a aplicação (e o e2e do CI) sobe sem banco; o erro de conexão aparece na
// primeira query em vez de no boot. Ver docs/code/infra/database.md.
export const createPrismaClient = (connectionString: string): PrismaClient =>
  new PrismaClient({ adapter: new PrismaPg({ connectionString }) });

export type { PrismaClient };

// Client recebido por `$transaction(async (tx) => ...)`: o adapter que participa de
// uma transação aberta por outro recebe este tipo, não o PrismaClient.
export type PrismaTransaction = Parameters<
  Parameters<PrismaClient['$transaction']>[0]
>[0];
