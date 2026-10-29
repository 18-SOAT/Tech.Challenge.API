import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
} from 'bun:test';
import { PrismaCustomerRegistrationRepository } from '../../src/modules/auth/infrastructure/persistence/prisma-customer-registration.repository.js';
import { Customer } from '../../src/modules/customer/domain/entities/customer.entity.js';
import { Document } from '../../src/modules/customer/domain/value-objects/document.vo.js';
import { User } from '../../src/modules/user/domain/entities/user.entity.js';
import { UserType } from '../../src/modules/user/domain/enums/user-type.enum.js';
import { UserErrorCode } from '../../src/modules/user/domain/errors/user.error.js';
import { PrismaUserRepository } from '../../src/modules/user/infrastructure/persistence/prisma-user.repository.js';
import { Email } from '../../src/shared/domain/value-objects/email.vo.js';
import type { PrismaClient } from '../../src/shared/infrastructure/prisma/client.js';
import { prepareTestDatabase, resetDatabase } from './database.js';

// Contra Postgres real: o `@unique` de `email_canonical` é a última barreira contra
// dois cadastros simultâneos com aliases, e o P2002 dele precisa virar o mesmo 409.

const registrationOf = (rawEmail: string, document: string) => {
  const email = Email.create(rawEmail);
  const user = User.create({
    email,
    hashedPassword: 'x',
    type: UserType.CUSTOMER,
  });
  const customer = Customer.create({
    document: Document.create(document),
    email,
    userId: user.idValue,
  });
  return { user, customer };
};

describe('E-mail canônico (Postgres)', () => {
  let prisma: PrismaClient;
  let registrations: PrismaCustomerRegistrationRepository;
  let users: PrismaUserRepository;

  beforeAll(async () => {
    prisma = await prepareTestDatabase();
    registrations = new PrismaCustomerRegistrationRepository(prisma);
    users = new PrismaUserRepository(prisma);
  });

  beforeEach(() => resetDatabase(prisma));

  afterAll(() => prisma.$disconnect());

  it('grava o e-mail digitado e a forma canônica', async () => {
    const { user, customer } = registrationOf(
      'J.oao+1@googlemail.com',
      '52998224725',
    );
    await registrations.register(user, customer);

    const record = await prisma.user.findUniqueOrThrow({
      where: { id: user.idValue },
    });
    expect(record.email).toBe('j.oao+1@googlemail.com');
    expect(record.emailCanonical).toBe('joao@gmail.com');
  });

  it('findByEmail acha o login por qualquer alias', async () => {
    const { user, customer } = registrationOf(
      'joaosilva@gmail.com',
      '52998224725',
    );
    await registrations.register(user, customer);

    const found = await users.findByEmail(
      Email.create('joao.silva+x@googlemail.com'),
    );
    expect(found?.idValue).toBe(user.idValue);
  });

  it('corrida de dois cadastros com aliases: um passa, o outro vira o 409 do e-mail', async () => {
    const first = registrationOf('joaosilva@gmail.com', '52998224725');
    const second = registrationOf(
      'j.o.a.o.silva+2@gmail.com',
      '11222333000181',
    );

    const results = await Promise.allSettled([
      registrations.register(first.user, first.customer),
      registrations.register(second.user, second.customer),
    ]);

    expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
    const [rejected] = results.filter((r) => r.status === 'rejected');
    expect(rejected?.reason).toMatchObject({
      code: UserErrorCode.EMAIL_ALREADY_IN_USE,
    });
    expect(await prisma.user.count()).toBe(1);
    expect(await prisma.customer.count()).toBe(1);
  });
});
