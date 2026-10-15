import { EmployeeRole } from '../src/modules/employee/domain/enums/employee-role.enum.js';
import { UserType } from '../src/modules/user/domain/enums/user-type.enum.js';
import { Password } from '../src/modules/user/domain/value-objects/password.vo.js';
import { BcryptPasswordHasher } from '../src/modules/user/infrastructure/hashing/bcrypt-password-hasher.js';
import { IdGenerator } from '../src/shared/domain/id-generator.js';
import { Email } from '../src/shared/domain/value-objects/email.vo.js';
import { createPrismaClient } from '../src/shared/infrastructure/prisma/client.js';

// Seed de demonstração: um funcionário ADMIN para autenticar nas rotas administrativas.
// Idempotente: se o e-mail já existe, não mexe em nada (nem na senha) — pode rodar a
// cada `docker compose up` sem duplicar. Roda via `prisma db seed` (prisma.config.ts).
// As credenciais padrão são públicas de propósito (README); troque via env fora da demo.
const email = Email.create(process.env.SEED_ADMIN_EMAIL || 'admin@oficina.com');
const password = Password.create(
  process.env.SEED_ADMIN_PASSWORD || 'admin12345',
);
const name = process.env.SEED_ADMIN_NAME || 'Administrador';

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error('DATABASE_URL não definido. Configure no .env.');
}

const prisma = createPrismaClient(databaseUrl);

try {
  const existing = await prisma.user.findUnique({
    where: { email: email.value },
  });

  if (existing) {
    console.log(`🌱 Seed: ${email.value} já existe, nada a fazer.`);
  } else {
    const hashedPassword = await new BcryptPasswordHasher().hash(
      password.value,
    );
    const userId = IdGenerator.generate();

    // Nested create: User e Employee no mesmo INSERT transacional — nunca sobra
    // um User de funcionário sem Employee.
    await prisma.user.create({
      data: {
        id: userId,
        email: email.value,
        hashedPassword,
        type: UserType.EMPLOYEE,
        employee: {
          create: {
            id: IdGenerator.generate(),
            name,
            role: EmployeeRole.ADMIN,
          },
        },
      },
    });
    console.log(`🌱 Seed: ADMIN ${email.value} criado.`);
  }
} finally {
  await prisma.$disconnect();
}
