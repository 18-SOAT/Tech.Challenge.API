import {
  createPrismaClient,
  type PrismaClient,
} from '../../src/shared/infrastructure/prisma/client.js';

// Banco SÓ dos testes de integração: o nome precisa terminar em `_test`, para um
// TRUNCATE nunca apagar o banco de desenvolvimento por engano de configuração.
export const TEST_DATABASE_URL =
  process.env.TEST_DATABASE_URL ??
  'postgresql://postgres:postgres@localhost:5432/mechanic_system_test';

// Cria o banco se faltar e aplica as migrations versionadas (o mesmo `migrate
// deploy` do container `migrate`), para o schema do teste ser o da entrega.
export async function prepareTestDatabase(): Promise<PrismaClient> {
  const url = new URL(TEST_DATABASE_URL);
  const name = url.pathname.slice(1);
  if (!/^[a-z0-9_]+_test$/.test(name)) {
    throw new Error(
      `TEST_DATABASE_URL deve apontar para um banco *_test (recebido: "${name}").`,
    );
  }
  await createDatabaseIfMissing(url, name);

  const migrate = Bun.spawnSync(['bunx', 'prisma', 'migrate', 'deploy'], {
    env: { ...process.env, DATABASE_URL: TEST_DATABASE_URL },
    stdout: 'pipe',
    stderr: 'pipe',
  });
  if (migrate.exitCode !== 0) {
    throw new Error(
      `prisma migrate deploy falhou:\n${migrate.stderr.toString()}`,
    );
  }
  return createPrismaClient(TEST_DATABASE_URL);
}

// Esvazia todas as tabelas (menos o controle de migrations) entre um teste e outro.
export async function resetDatabase(prisma: PrismaClient): Promise<void> {
  const tables = await prisma.$queryRaw<{ tablename: string }[]>`
    SELECT tablename FROM pg_tables
    WHERE schemaname = 'public' AND tablename <> '_prisma_migrations'`;
  const list = tables.map(({ tablename }) => `"${tablename}"`).join(', ');
  await prisma.$executeRawUnsafe(`TRUNCATE ${list} RESTART IDENTITY CASCADE`);
}

async function createDatabaseIfMissing(url: URL, name: string): Promise<void> {
  const adminUrl = new URL(url);
  adminUrl.pathname = '/postgres';
  const admin = createPrismaClient(adminUrl.toString());
  try {
    const [row] = await admin.$queryRaw<{ found: boolean }[]>`
      SELECT EXISTS (SELECT 1 FROM pg_database WHERE datname = ${name}) AS found`;
    // Nome já validado pela regex: identificador não aceita parâmetro ($1).
    if (!row?.found) await admin.$executeRawUnsafe(`CREATE DATABASE "${name}"`);
  } finally {
    await admin.$disconnect();
  }
}
