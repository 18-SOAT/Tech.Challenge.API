import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../../../generated/prisma/client.js';

// Conexão lazy: sem $connect no boot — o Prisma conecta na primeira query.
// Assim a aplicação (e o e2e do CI) sobe sem banco; o erro de conexão aparece na
// primeira query em vez de no boot. Ver docs/code/infra/database.md.
export const createPrismaClient = (connectionString: string): PrismaClient =>
  new PrismaClient({ adapter: new PrismaPg({ connectionString }) });

export type { PrismaClient };
