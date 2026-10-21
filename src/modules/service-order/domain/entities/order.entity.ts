import { IdGenerator } from '../../../../shared/domain/id-generator.js';
import { OrderStatus } from '../enums/order-status.enum.js';
import { OrderError } from '../errors/order.error.js';

// Estadia do veículo na oficina, da chegada à entrega. Agrupa as OS da visita, que
// são outro agregado e a referenciam pelo `orderId`.
export class Order {
  // `number` é o número legível gerado pelo banco (autoincrement): null até gravar.
  private constructor(
    private readonly id: string,
    private readonly number: number | null,
    private readonly customerId: string,
    private readonly vehicleId: string,
    private status: OrderStatus,
    private readonly notes: string | null,
    private readonly receivedAt: Date,
    private deliveredAt: Date | null,
  ) {}

  // "Ordem aberta" (Recebida). Quem garante cliente, veículo e a regra de uma ordem
  // aberta por veículo é o OpenOrderUseCase, que enxerga os outros agregados.
  static open(input: {
    customerId: string;
    vehicleId: string;
    notes?: string | null;
  }): Order {
    return new Order(
      IdGenerator.generate(),
      null,
      input.customerId,
      input.vehicleId,
      OrderStatus.RECEIVED,
      input.notes?.trim() || null,
      new Date(),
      null,
    );
  }

  static restore(props: {
    id: string;
    number: number;
    customerId: string;
    vehicleId: string;
    status: OrderStatus;
    notes: string | null;
    receivedAt: Date;
    deliveredAt: Date | null;
  }): Order {
    return new Order(
      props.id,
      props.number,
      props.customerId,
      props.vehicleId,
      props.status,
      props.notes,
      props.receivedAt,
      props.deliveredAt,
    );
  }

  // Reparo adicional: só enquanto o veículo ainda está na oficina.
  assertAcceptsServiceOrders(): void {
    if (this.isDelivered) throw OrderError.alreadyDelivered();
  }

  get isDelivered(): boolean {
    return this.status === OrderStatus.DELIVERED;
  }

  get idValue(): string {
    return this.id;
  }

  get numberValue(): number | null {
    return this.number;
  }

  get customerIdValue(): string {
    return this.customerId;
  }

  get vehicleIdValue(): string {
    return this.vehicleId;
  }

  get statusValue(): OrderStatus {
    return this.status;
  }

  get notesValue(): string | null {
    return this.notes;
  }

  get receivedAtValue(): Date {
    return this.receivedAt;
  }

  get deliveredAtValue(): Date | null {
    return this.deliveredAt;
  }
}
