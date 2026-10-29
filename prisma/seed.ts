import { EmployeeRole } from '../src/modules/employee/domain/enums/employee-role.enum.js';
import { UserType } from '../src/modules/user/domain/enums/user-type.enum.js';
import { Password } from '../src/modules/user/domain/value-objects/password.vo.js';
import { BcryptPasswordHasher } from '../src/modules/user/infrastructure/hashing/bcrypt-password-hasher.js';
import { IdGenerator } from '../src/shared/domain/id-generator.js';
import { Email } from '../src/shared/domain/value-objects/email.vo.js';
import {
  createPrismaClient,
  type PrismaClient,
} from '../src/shared/infrastructure/prisma/client.js';

type SeedEnv = Record<string, string | undefined>;

// Seed de demonstração: um ADMIN para autenticar nas rotas administrativas e um
// MECHANIC para demonstrar a divisão de papéis (403 nas rotas de escrita).
// Idempotente: se o e-mail (canônico) já existe, não mexe em nada (nem na senha) — pode rodar a
// cada `docker compose up` sem duplicar. Roda via `prisma db seed` (prisma.config.ts).
// As credenciais padrão são públicas de propósito (README); troque via env fora da demo.
// O ambiente é parâmetro (padrão: process.env) para o teste black-box semear com as
// credenciais padrão mesmo quando o `.env` do desenvolvedor (que o Bun carrega
// sozinho) traz outras.
const demoEmployees = (env: SeedEnv) => [
  {
    email: Email.create(env.SEED_ADMIN_EMAIL || 'admin@oficina.com'),
    password: Password.create(env.SEED_ADMIN_PASSWORD || 'admin12345'),
    name: env.SEED_ADMIN_NAME || 'Administrador',
    role: EmployeeRole.ADMIN,
  },
  {
    email: Email.create(env.SEED_MECHANIC_EMAIL || 'mecanico@oficina.com'),
    password: Password.create(env.SEED_MECHANIC_PASSWORD || 'mecanico12345'), // gitleaks:allow (senha de demo)
    name: env.SEED_MECHANIC_NAME || 'Mecânico',
    role: EmployeeRole.MECHANIC,
  },
];

// Exportada para os testes black-box semearem o banco de teste em processo.
export async function seedDemoEmployees(
  prisma: PrismaClient,
  {
    env = process.env,
    log = console.log,
  }: { env?: SeedEnv; log?: (message: string) => void } = {},
): Promise<void> {
  const hasher = new BcryptPasswordHasher();

  for (const { email, password, name, role } of demoEmployees(env)) {
    const existing = await prisma.user.findUnique({
      where: { emailCanonical: email.canonical },
    });
    if (existing) {
      log(`🌱 Seed: ${email.value} já existe, nada a fazer.`);
      continue;
    }

    // Nested create: User e Employee no mesmo INSERT transacional — nunca sobra
    // um User de funcionário sem Employee.
    await prisma.user.create({
      data: {
        id: IdGenerator.generate(),
        email: email.value,
        emailCanonical: email.canonical,
        hashedPassword: await hasher.hash(password.value),
        type: UserType.EMPLOYEE,
        employee: {
          create: { id: IdGenerator.generate(), name, role },
        },
      },
    });
    log(`🌱 Seed: ${role} ${email.value} criado.`);
  }
}

if (import.meta.main) {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error('DATABASE_URL não definido. Configure no .env.');
  }

  const prisma = createPrismaClient(databaseUrl);
  try {
    await seedDemoEmployees(prisma);
  } finally {
    await prisma.$disconnect();
  }
}
