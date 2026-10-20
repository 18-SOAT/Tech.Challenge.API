import { t } from 'elysia';
import type { StockMovement } from '../../domain/entities/stock-movement.entity.js';
import { StockMovementType } from '../../domain/enums/stock-movement-type.enum.js';

export class StockMovementResponseDto {
  private constructor(
    readonly id: string,
    readonly type: StockMovementType,
    readonly quantity: number,
    readonly reason: string | null,
    readonly serviceOrderId: string | null,
    readonly createdAt: string,
  ) {}

  static fromEntity(movement: StockMovement): StockMovementResponseDto {
    return new StockMovementResponseDto(
      movement.idValue,
      movement.typeValue,
      movement.quantityValue,
      movement.reasonValue,
      movement.serviceOrderIdValue,
      movement.createdAtValue.toISOString(),
    );
  }
}

export const StockMovementResponseSchema = t.Object(
  {
    id: t.String({ format: 'uuid' }),
    type: t.Enum(StockMovementType, {
      description: 'IN: entrada. OUT: baixa por OS. ADJUSTMENT: ajuste',
    }),
    quantity: t.Integer({
      description: 'IN/OUT: unidades. ADJUSTMENT: delta com sinal',
      examples: [-3],
    }),
    reason: t.Nullable(t.String({ examples: ['Inventário'] })),
    serviceOrderId: t.Nullable(
      t.String({ format: 'uuid', description: 'OS que baixou o estoque' }),
    ),
    createdAt: t.String({ format: 'date-time' }),
  },
  { title: 'StockMovement' },
);
