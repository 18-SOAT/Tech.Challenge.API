import type {
  Page,
  PageRequest,
} from '../../../../shared/domain/pagination.js';
import type { PrismaClient } from '../../../../shared/infrastructure/prisma/client.js';
import type { StockMovement } from '../../domain/entities/stock-movement.entity.js';
import { ProductError } from '../../domain/errors/product.error.js';
import type { StockMovementRepository } from '../../domain/ports/stock-movement.repository.js';
import { StockMovementMapper } from './stock-movement.mapper.js';

export class PrismaStockMovementRepository implements StockMovementRepository {
  constructor(private readonly prisma: PrismaClient) {}

  // Transação interativa: o lançamento só é criado se o update condicional do
  // saldo passou. Toda query usa o `tx` — com `this.prisma` ela ficaria fora do rollback.
  async record(movement: StockMovement): Promise<void> {
    const { delta } = movement;
    await this.prisma.$transaction(async (tx) => {
      // Update condicional: quando o delta tira unidades, só atualiza se o saldo
      // ATUAL do banco cobre a saída. Fecha a corrida entre duas requisições sem
      // subir o isolamento para SERIALIZABLE.
      const { count } = await tx.product.updateMany({
        where: {
          id: movement.productIdValue,
          ...(delta < 0 ? { stockQuantity: { gte: -delta } } : {}),
        },
        data: { stockQuantity: { increment: delta } },
      });
      if (count === 0) {
        const exists = await tx.product.count({
          where: { id: movement.productIdValue },
        });
        throw exists
          ? ProductError.insufficientStock()
          : ProductError.notFound();
      }

      await tx.stockMovement.create({
        data: StockMovementMapper.toObject(movement),
      });
    });
  }

  async findByProduct(
    productId: string,
    page: PageRequest,
  ): Promise<Page<StockMovement>> {
    const where = { productId };
    const [total, records] = await this.prisma.$transaction([
      this.prisma.stockMovement.count({ where }),
      this.prisma.stockMovement.findMany({
        where,
        // UUID v7 desempata lançamentos no mesmo milissegundo, em ordem de criação.
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        skip: (page.page - 1) * page.limit,
        take: page.limit,
      }),
    ]);
    return { items: records.map(StockMovementMapper.toEntity), total };
  }
}
