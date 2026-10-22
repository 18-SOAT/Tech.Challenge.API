import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
} from 'bun:test';
import { PrismaCustomerRepository } from '../../src/modules/customer/infrastructure/persistence/prisma-customer.repository.js';
import { EmployeeRole } from '../../src/modules/employee/domain/enums/employee-role.enum.js';
import { PrismaEmployeeRepository } from '../../src/modules/employee/infrastructure/persistence/prisma-employee.repository.js';
import { ProductErrorCode } from '../../src/modules/inventory/domain/errors/product.error.js';
import { PrismaProductRepository } from '../../src/modules/inventory/infrastructure/persistence/prisma-product.repository.js';
import { PrismaServiceRepository } from '../../src/modules/inventory/infrastructure/persistence/prisma-service.repository.js';
import { AddProductItemUseCase } from '../../src/modules/service-order/application/use-cases/add-product-item.use-case.js';
import { ApproveQuoteUseCase } from '../../src/modules/service-order/application/use-cases/approve-quote.use-case.js';
import { AssignMechanicUseCase } from '../../src/modules/service-order/application/use-cases/assign-mechanic.use-case.js';
import { CompleteDiagnosisUseCase } from '../../src/modules/service-order/application/use-cases/complete-diagnosis.use-case.js';
import { OpenOrderUseCase } from '../../src/modules/service-order/application/use-cases/open-order.use-case.js';
import { RejectQuoteUseCase } from '../../src/modules/service-order/application/use-cases/reject-quote.use-case.js';
import { ServiceOrderErrorCode } from '../../src/modules/service-order/domain/errors/service-order.error.js';
import { PrismaOrderRepository } from '../../src/modules/service-order/infrastructure/persistence/prisma-order.repository.js';
import { PrismaOrderOpeningRepository } from '../../src/modules/service-order/infrastructure/persistence/prisma-order-opening.repository.js';
import { PrismaServiceOrderRepository } from '../../src/modules/service-order/infrastructure/persistence/prisma-service-order.repository.js';
import { PrismaServiceOrderApprovalRepository } from '../../src/modules/service-order/infrastructure/persistence/prisma-service-order-approval.repository.js';
import { PrismaVehicleRepository } from '../../src/modules/vehicle/infrastructure/persistence/prisma-vehicle.repository.js';
import type { PrismaClient } from '../../src/shared/infrastructure/prisma/client.js';
import { FakeServiceOrderMailer } from '../fakes/fake-service-order.mailer.js';
import { prepareTestDatabase, resetDatabase } from './database.js';

// Contra Postgres real: prova o que os fakes não provam — a transação do adapter
// desfaz de verdade (rollback) e o update condicional segura a corrida.
// Rodar com `bun run test:integration` (ver README / CLAUDE.md).

const ADMIN_USER_ID = '01920000-0000-7000-8000-00000000b001';
const MECHANIC_USER_ID = '01920000-0000-7000-8000-00000000b002';
const ADMIN_ID = '01920000-0000-7000-8000-00000000a001';
const MECHANIC_ID = '01920000-0000-7000-8000-00000000a002';
const CUSTOMER_ID = '01920000-0000-7000-8000-00000000c001';
const VEHICLE_ID = '01920000-0000-7000-8000-00000000d001';
const SERVICE_ID = '01920000-0000-7000-8000-00000000e001';
const PRODUCT_ID = '01920000-0000-7000-8000-00000000f001';
const OWNER = { customerId: CUSTOMER_ID };
const ADMIN = { employeeId: ADMIN_ID, role: EmployeeRole.ADMIN };
const MECHANIC = { employeeId: MECHANIC_ID, role: EmployeeRole.MECHANIC };
const codeOf = (code: string) => expect.objectContaining({ code });

describe('Aprovação do orçamento (Postgres)', () => {
  let prisma: PrismaClient;
  let serviceOrders: PrismaServiceOrderRepository;
  let orders: PrismaOrderRepository;
  let products: PrismaProductRepository;
  let approval: PrismaServiceOrderApprovalRepository;
  let approve: ApproveQuoteUseCase;
  let reject: RejectQuoteUseCase;
  let serviceOrderId: string;
  let orderId: string;

  const seed = async () => {
    await prisma.user.createMany({
      data: [
        {
          id: ADMIN_USER_ID,
          email: 'admin@oficina.com',
          hashedPassword: 'x',
          type: 'EMPLOYEE',
        },
        {
          id: MECHANIC_USER_ID,
          email: 'mecanico@oficina.com',
          hashedPassword: 'x',
          type: 'EMPLOYEE',
        },
      ],
    });
    await prisma.employee.createMany({
      data: [
        {
          id: ADMIN_ID,
          userId: ADMIN_USER_ID,
          name: 'Ana',
          role: 'ADMIN',
        },
        {
          id: MECHANIC_ID,
          userId: MECHANIC_USER_ID,
          name: 'Beto',
          role: 'MECHANIC',
        },
      ],
    });
    await prisma.customer.create({
      data: {
        id: CUSTOMER_ID,
        document: '52998224725',
        email: 'joao@cliente.com',
      },
    });
    await prisma.vehicle.create({
      data: {
        id: VEHICLE_ID,
        customerId: CUSTOMER_ID,
        plate: 'ABC1D23',
        brand: 'Fiat',
        model: 'Uno',
        year: 2015,
      },
    });
    await prisma.service.create({
      data: { id: SERVICE_ID, name: 'Troca de óleo', price: '89.90' },
    });
    await prisma.product.create({
      data: {
        id: PRODUCT_ID,
        sku: 'FILTRO-01',
        name: 'Filtro de óleo',
        type: 'PART',
        price: '35.50',
        stockQuantity: 10,
      },
    });
  };

  // Mesmo fluxo da API, com os adapters Prisma: abrir → atribuir → peça → orçamento.
  const openQuote = async () => {
    const customers = new PrismaCustomerRepository(prisma);
    const services = new PrismaServiceRepository(prisma);
    const { order, serviceOrder } = await new OpenOrderUseCase(
      customers,
      new PrismaVehicleRepository(prisma),
      services,
      orders,
      new PrismaOrderOpeningRepository(prisma),
    ).execute({
      document: '52998224725',
      plate: 'ABC1D23',
      openedById: ADMIN_ID,
      services: [{ serviceId: SERVICE_ID, quantity: 1 }],
    });
    await new AssignMechanicUseCase(
      serviceOrders,
      new PrismaEmployeeRepository(prisma),
    ).execute({
      serviceOrderId: serviceOrder.idValue,
      mechanicId: MECHANIC_ID,
    });
    await new AddProductItemUseCase(serviceOrders, products).execute({
      serviceOrderId: serviceOrder.idValue,
      productId: PRODUCT_ID,
      quantity: 2,
      actor: MECHANIC,
    });
    await new CompleteDiagnosisUseCase(
      serviceOrders,
      orders,
      customers,
      services,
      products,
      new FakeServiceOrderMailer(),
    ).execute({ serviceOrderId: serviceOrder.idValue, actor: MECHANIC });
    serviceOrderId = serviceOrder.idValue;
    orderId = order.idValue;
  };

  const snapshot = async () => ({
    serviceOrder: await prisma.serviceOrder.findUniqueOrThrow({
      where: { id: serviceOrderId },
      include: { statusHistory: true },
    }),
    order: await prisma.order.findUniqueOrThrow({ where: { id: orderId } }),
    stock: (
      await prisma.product.findUniqueOrThrow({ where: { id: PRODUCT_ID } })
    ).stockQuantity,
    movements: await prisma.stockMovement.findMany(),
  });

  beforeAll(async () => {
    prisma = await prepareTestDatabase();
    serviceOrders = new PrismaServiceOrderRepository(prisma);
    orders = new PrismaOrderRepository(prisma);
    products = new PrismaProductRepository(prisma);
    approval = new PrismaServiceOrderApprovalRepository(prisma);
    approve = new ApproveQuoteUseCase(
      serviceOrders,
      orders,
      products,
      approval,
    );
    reject = new RejectQuoteUseCase(serviceOrders, orders, approval);
  });

  afterAll(async () => {
    await prisma?.$disconnect();
  });

  beforeEach(async () => {
    await resetDatabase(prisma);
    await seed();
    await openQuote();
  });

  it('aprova: valor, status, histórico, baixa de estoque e Ordem gravados juntos', async () => {
    await approve.execute({ serviceOrderId, decider: OWNER });

    const after = await snapshot();
    expect(after.serviceOrder.status).toBe('IN_EXECUTION');
    expect(after.serviceOrder.approvedAmount?.toNumber()).toBe(160.9);
    expect(after.serviceOrder.approvedAt).toBeInstanceOf(Date);
    expect(
      after.serviceOrder.statusHistory.map((row) => row.status).sort(),
    ).toEqual(['AWAITING_APPROVAL', 'IN_DIAGNOSIS', 'IN_EXECUTION']);
    expect(after.stock).toBe(8);
    expect(after.movements).toHaveLength(1);
    expect(after.movements[0]).toMatchObject({
      type: 'OUT',
      quantity: 2,
      serviceOrderId,
    });
    expect(after.order.status).toBe('IN_PROGRESS');
  });

  it('saldo acabou entre a leitura e a gravação: rollback de tudo', async () => {
    // O use case leu saldo 10 (Product.withdraw passa); outra baixa deixa 1 no
    // banco antes da transação. O update condicional do estoque falha DEPOIS de a
    // OS já ter sido atualizada dentro da transação — o rollback desfaz as duas.
    const serviceOrder = await serviceOrders.findById(serviceOrderId);
    const order = await orders.findById(orderId);
    const product = await products.findById(PRODUCT_ID);
    if (!serviceOrder || !order || !product) throw new Error('seed incompleto');
    serviceOrder.approve(null);
    const movement = product.withdraw(2, serviceOrderId);
    order.start();
    await prisma.product.update({
      where: { id: PRODUCT_ID },
      data: { stockQuantity: 1 },
    });

    await expect(
      approval.approve(serviceOrder, order, [movement]),
    ).rejects.toThrow(codeOf(ProductErrorCode.INSUFFICIENT_STOCK));

    const after = await snapshot();
    expect(after.serviceOrder.status).toBe('AWAITING_APPROVAL');
    expect(after.serviceOrder.approvedAmount).toBeNull();
    expect(after.serviceOrder.statusHistory).toHaveLength(2);
    expect(after.stock).toBe(1);
    expect(after.movements).toHaveLength(0);
    expect(after.order.status).toBe('RECEIVED');
  });

  it('duas aprovações simultâneas: só uma passa e o estoque baixa uma vez', async () => {
    const results = await Promise.allSettled([
      approve.execute({ serviceOrderId, decider: OWNER }),
      approve.execute({ serviceOrderId, decider: OWNER }),
    ]);

    const failed = results.filter((result) => result.status === 'rejected');
    expect(failed).toHaveLength(1);
    expect((failed[0] as PromiseRejectedResult).reason).toEqual(
      codeOf(ServiceOrderErrorCode.NOT_AWAITING_APPROVAL),
    );
    const after = await snapshot();
    expect(after.stock).toBe(8);
    expect(after.movements).toHaveLength(1);
    expect(after.serviceOrder.statusHistory).toHaveLength(3);
  });

  it('aprovar e rejeitar ao mesmo tempo: só a primeira decisão fica', async () => {
    const results = await Promise.allSettled([
      approve.execute({ serviceOrderId, decider: OWNER }),
      reject.execute({ serviceOrderId, decider: ADMIN }),
    ]);

    expect(results.filter((r) => r.status === 'rejected')).toHaveLength(1);
    const after = await snapshot();
    expect(['IN_EXECUTION', 'REJECTED']).toContain(after.serviceOrder.status);
    expect(after.serviceOrder.statusHistory).toHaveLength(3);
    expect(after.stock).toBe(after.serviceOrder.status === 'REJECTED' ? 10 : 8);
  });
});
