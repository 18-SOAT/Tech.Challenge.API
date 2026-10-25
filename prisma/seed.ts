import { EmployeeRole } from '../src/modules/employee/domain/enums/employee-role.enum.js';
import { UserType } from '../src/modules/user/domain/enums/user-type.enum.js';
import { Password } from '../src/modules/user/domain/value-objects/password.vo.js';
import { BcryptPasswordHasher } from '../src/modules/user/infrastructure/hashing/bcrypt-password-hasher.js';
import { IdGenerator } from '../src/shared/domain/id-generator.js';
import { Email } from '../src/shared/domain/value-objects/email.vo.js';
import { createPrismaClient } from '../src/shared/infrastructure/prisma/client.js';

// Seed de demonstração: um ADMIN para autenticar nas rotas administrativas e um
// MECHANIC para demonstrar a divisão de papéis (403 nas rotas de escrita).
// Idempotente: se o e-mail (canônico) já existe, não mexe em nada (nem na senha) — pode rodar a
// cada `docker compose up` sem duplicar. Roda via `prisma db seed` (prisma.config.ts).
// As credenciais padrão são públicas de propósito (README); troque via env fora da demo.
const demoEmployees = [
  {
    email: Email.create(process.env.SEED_ADMIN_EMAIL || 'admin@oficina.com'),
    password: Password.create(process.env.SEED_ADMIN_PASSWORD || 'admin12345'),
    name: process.env.SEED_ADMIN_NAME || 'Administrador',
    role: EmployeeRole.ADMIN,
  },
  {
    email: Email.create(
      process.env.SEED_MECHANIC_EMAIL || 'mecanico@oficina.com',
    ),
    password: Password.create(
      process.env.SEED_MECHANIC_PASSWORD || 'mecanico12345',
    ),
    name: process.env.SEED_MECHANIC_NAME || 'Mecânico',
    role: EmployeeRole.MECHANIC,
  },
];

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error('DATABASE_URL não definido. Configure no .env.');
}

const prisma = createPrismaClient(databaseUrl);
const hasher = new BcryptPasswordHasher();

try {
  for (const { email, password, name, role } of demoEmployees) {
    const existing = await prisma.user.findUnique({
      where: { emailCanonical: email.canonical },
    });
    if (existing) {
      console.log(`🌱 Seed: ${email.value} já existe, nada a fazer.`);
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
    console.log(`🌱 Seed: ${role} ${email.value} criado.`);
  }
} finally {
  await prisma.$disconnect();
}
