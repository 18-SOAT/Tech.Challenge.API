import type {
  PrismaClient,
  PrismaTransaction,
} from '../../../../shared/infrastructure/prisma/client.js';
import type { StockMovement } from '../../../inventory/domain/entities/stock-movement.entity.js';
import { applyStockMovement } from '../../../inventory/infrastructure/persistence/prisma-stock-movement.repository.js';
import type { Order } from '../../domain/entities/order.entity.js';
import type { ServiceOrder } from '../../domain/entities/service-order.entity.js';
import { OrderStatus } from '../../domain/enums/order-status.enum.js';
import { ServiceOrderStatus } from '../../domain/enums/service-order-status.enum.js';
import { ServiceOrderError } from '../../domain/errors/service-order.error.js';
import type { ServiceOrderApprovalRepository } from '../../domain/ports/service-order-approval.repository.js';
import { ServiceOrderMapper } from './service-order.mapper.js';

export class PrismaServiceOrderApprovalRepository
  implements ServiceOrderApprovalRepository
{
  constructor(private readonly prisma: PrismaClient) {}

  // Transação interativa: qualquer erro (decisão concorrente, saldo insuficiente)
  // desfaz o que já foi escrito — a OS continua Aguardando aprovação.
  async approve(
    serviceOrder: ServiceOrder,
    order: Order,
    movements: StockMovement[],
  ): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      await this.decide(tx, serviceOrder);
      for (const movement of movements) {
        await applyStockMovement(tx, movement);
      }
      // Condicional também: só a primeira OS aprovada tira a Ordem de Recebida.
      await tx.order.updateMany({
        where: { id: order.idValue, status: OrderStatus.RECEIVED },
        data: { status: order.statusValue },
      });
    });
  }

  async reject(serviceOrder: ServiceOrder): Promise<void> {
    await this.prisma.$transaction((tx) => this.decide(tx, serviceOrder));
  }

  // Update condicional no status: aprovar e rejeitar ao mesmo tempo (ou aprovar
  // duas vezes) deixa só a primeira passar; a segunda vê count 0 e aborta.
  private async decide(
    tx: PrismaTransaction,
    serviceOrder: ServiceOrder,
  ): Promise<void> {
    const { approvedAmount, approvedAt, status } =
      ServiceOrderMapper.toObject(serviceOrder);
    const { count } = await tx.serviceOrder.updateMany({
      where: {
        id: serviceOrder.idValue,
        status: ServiceOrderStatus.AWAITING_APPROVAL,
      },
      data: { status, approvedAmount, approvedAt },
    });
    if (count === 0) throw ServiceOrderError.notAwaitingApproval();

    await tx.serviceOrderStatusHistory.createMany({
      data: ServiceOrderMapper.toHistory(serviceOrder),
      skipDuplicates: true,
    });
  }
}
