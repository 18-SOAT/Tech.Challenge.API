import type {
  Prisma,
  StockMovement as PrismaStockMovement,
} from '../../../../generated/prisma/client.js';
import { StockMovement } from '../../domain/entities/stock-movement.entity.js';
import type { StockMovementType } from '../../domain/enums/stock-movement-type.enum.js';

export class StockMovementMapper {
  static toEntity(record: PrismaStockMovement): StockMovement {
    return StockMovement.restore({
      id: record.id,
      productId: record.productId,
      type: record.type as StockMovementType,
      quantity: record.quantity,
      reason: record.reason,
      serviceOrderId: record.serviceOrderId,
      createdAt: record.createdAt,
    });
  }

  static toObject(
    entity: StockMovement,
  ): Prisma.StockMovementUncheckedCreateInput {
    return {
      id: entity.idValue,
      productId: entity.productIdValue,
      type: entity.typeValue,
      quantity: entity.quantityValue,
      reason: entity.reasonValue,
      serviceOrderId: entity.serviceOrderIdValue,
      createdAt: entity.createdAtValue,
    };
  }
}
