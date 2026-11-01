import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
} from 'bun:test';
import { Customer } from '../../src/modules/customer/domain/entities/customer.entity.js';
import { CustomerErrorCode } from '../../src/modules/customer/domain/errors/customer.error.js';
import { Document } from '../../src/modules/customer/domain/value-objects/document.vo.js';
import { PrismaCustomerRepository } from '../../src/modules/customer/infrastructure/persistence/prisma-customer.repository.js';
import { Product } from '../../src/modules/inventory/domain/entities/product.entity.js';
import { ProductType } from '../../src/modules/inventory/domain/enums/product-type.enum.js';
import { ProductErrorCode } from '../../src/modules/inventory/domain/errors/product.error.js';
import { PrismaProductRepository } from '../../src/modules/inventory/infrastructure/persistence/prisma-product.repository.js';
import { Vehicle } from '../../src/modules/vehicle/domain/entities/vehicle.entity.js';
import { VehicleErrorCode } from '../../src/modules/vehicle/domain/errors/vehicle.error.js';
import { LicensePlate } from '../../src/modules/vehicle/domain/value-objects/license-plate.vo.js';
import { PrismaVehicleRepository } from '../../src/modules/vehicle/infrastructure/persistence/prisma-vehicle.repository.js';
import { Email } from '../../src/shared/domain/value-objects/email.vo.js';
import { Money } from '../../src/shared/domain/value-objects/money.vo.js';
import type { PrismaClient } from '../../src/shared/infrastructure/prisma/client.js';
import { prepareTestDatabase, resetDatabase } from './database.js';
import { CUSTOMER_ID, seedWorkshop } from './fixtures.js';

// Contra Postgres real: dois inserts que passam juntos pelo check do use case batem
// no `@unique`. Com o driver adapter do pg, o P2002 traz só o nome do índice, e ele
// precisa virar o mesmo DomainError (409) que o use case lançaria — não um 500.

// Dispara os dois saves juntos e devolve o erro do que perdeu a corrida.
async function race(saves: [Promise<void>, Promise<void>]): Promise<unknown> {
  const results = await Promise.allSettled(saves);
  expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
  const [rejected] = results.filter((r) => r.status === 'rejected');
  return rejected?.reason;
}

describe('Violação de unique em corrida (Postgres)', () => {
  let prisma: PrismaClient;

  beforeAll(async () => {
    prisma = await prepareTestDatabase();
  });

  beforeEach(async () => {
    await resetDatabase(prisma);
    await seedWorkshop(prisma);
  });

  afterAll(() => prisma.$disconnect());

  it('placa duplicada vira licensePlateAlreadyInUse', async () => {
    const vehicles = new PrismaVehicleRepository(prisma);
    const vehicle = () =>
      Vehicle.create({
        customerId: CUSTOMER_ID,
        plate: LicensePlate.create('XYZ9A87'),
        brand: 'Fiat',
        model: 'Uno',
        year: 2015,
      });

    const error = await race([
      vehicles.save(vehicle()),
      vehicles.save(vehicle()),
    ]);
    expect(error).toMatchObject({
      code: VehicleErrorCode.LICENSE_PLATE_ALREADY_IN_USE,
    });
  });

  it('documento duplicado vira documentAlreadyInUse', async () => {
    const customers = new PrismaCustomerRepository(prisma);
    const customer = (email: string) =>
      Customer.create({
        document: Document.create('11222333000181'),
        email: Email.create(email),
      });

    const error = await race([
      customers.save(customer('um@oficina.com')),
      customers.save(customer('dois@oficina.com')),
    ]);
    expect(error).toMatchObject({
      code: CustomerErrorCode.DOCUMENT_ALREADY_IN_USE,
    });
  });

  it('SKU duplicado vira skuAlreadyInUse', async () => {
    const products = new PrismaProductRepository(prisma);
    const product = () =>
      Product.create({
        sku: 'VELA-01',
        name: 'Vela de ignição',
        type: ProductType.PART,
        price: Money.fromReais(30),
      });

    const error = await race([
      products.save(product()),
      products.save(product()),
    ]);
    expect(error).toMatchObject({ code: ProductErrorCode.SKU_ALREADY_IN_USE });
  });
});
