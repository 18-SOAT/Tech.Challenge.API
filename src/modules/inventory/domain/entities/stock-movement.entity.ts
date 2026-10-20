import { IdGenerator } from '../../../../shared/domain/id-generator.js';
import { StockMovementType } from '../enums/stock-movement-type.enum.js';

// Lançamento imutável do livro-razão do estoque. Só nasce por um método do
// Product (receive/adjust; withdraw na #12), que valida a regra antes.
// `quantity`: IN e OUT guardam unidades positivas; ADJUSTMENT guarda o delta com
// sinal (-3 = perda de 3). Assim a soma dos `delta` é sempre o saldo.
export class StockMovement {
  private constructor(
    private readonly id: string,
    private readonly productId: string,
    private readonly type: StockMovementType,
    private readonly quantity: number,
    private readonly reason: string | null,
    private readonly serviceOrderId: string | null,
    private readonly createdAt: Date,
  ) {}

  // Não chame direto: use Product.receive()/adjust(), que guardam o saldo.
  static create(input: {
    productId: string;
    type: StockMovementType;
    quantity: number;
    reason?: string | null;
    serviceOrderId?: string | null;
  }): StockMovement {
    return new StockMovement(
      IdGenerator.generate(),
      input.productId,
      input.type,
      input.quantity,
      input.reason ?? null,
      input.serviceOrderId ?? null,
      new Date(),
    );
  }

  static restore(props: {
    id: string;
    productId: string;
    type: StockMovementType;
    quantity: number;
    reason: string | null;
    serviceOrderId: string | null;
    createdAt: Date;
  }): StockMovement {
    return new StockMovement(
      props.id,
      props.productId,
      props.type,
      props.quantity,
      props.reason,
      props.serviceOrderId,
      props.createdAt,
    );
  }

  // Quanto o lançamento muda o saldo: o adapter usa no `increment` do banco.
  get delta(): number {
    return this.type === StockMovementType.OUT ? -this.quantity : this.quantity;
  }

  get idValue(): string {
    return this.id;
  }

  get productIdValue(): string {
    return this.productId;
  }

  get typeValue(): StockMovementType {
    return this.type;
  }

  get quantityValue(): number {
    return this.quantity;
  }

  get reasonValue(): string | null {
    return this.reason;
  }

  get serviceOrderIdValue(): string | null {
    return this.serviceOrderId;
  }

  get createdAtValue(): Date {
    return this.createdAt;
  }
}
