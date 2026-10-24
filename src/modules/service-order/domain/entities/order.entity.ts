import { IdGenerator } from '../../../../shared/domain/id-generator.js';
import { EmployeeRole } from '../../../employee/domain/enums/employee-role.enum.js';
import { OrderStatus } from '../enums/order-status.enum.js';
import type { ServiceOrderStatus } from '../enums/service-order-status.enum.js';
import { OrderError } from '../errors/order.error.js';
import {
  type ServiceOrderActor,
  TERMINAL_STATUSES,
} from './service-order.entity.js';

// Quem aprova ou rejeita um orçamento, como vem das claims do token: o cliente
// (pelo customerId) ou um funcionário.
export type QuoteDecider = { customerId: string } | ServiceOrderActor;

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

  // Quem decide o orçamento de uma OS desta Ordem: o cliente dono dela, ou o ADMIN
  // registrando a decisão que o cliente deu no balcão ou por telefone. A regra fica
  // aqui porque é a Ordem que sabe quem é o cliente.
  assertQuoteCanBeDecidedBy(decider: QuoteDecider): void {
    if ('customerId' in decider) {
      if (decider.customerId === this.customerId) return;
    } else if (decider.role === EmployeeRole.ADMIN) {
      return;
    }
    throw OrderError.quoteDecisionForbidden();
  }

  // "Ordem em andamento": na primeira OS aprovada. Aprovar um reparo adicional com a
  // Ordem já em andamento não muda nada.
  start(): void {
    if (this.isDelivered) throw OrderError.alreadyDelivered();
    this.status = OrderStatus.IN_PROGRESS;
  }

  // "Ordem entregue": o veículo sai, e só sai com todo trabalho encerrado (OS
  // finalizadas ou rejeitadas). Os status vêm do use case, que enxerga o outro
  // agregado; a regra fica aqui. Se o cliente rejeitou tudo, a Ordem vai de
  // Recebida direto para Entregue.
  deliver(serviceOrderStatuses: readonly ServiceOrderStatus[]): void {
    if (this.isDelivered) throw OrderError.alreadyDelivered();
    if (!serviceOrderStatuses.every((s) => TERMINAL_STATUSES.includes(s))) {
      throw OrderError.hasOpenServiceOrders();
    }
    this.status = OrderStatus.DELIVERED;
    this.deliveredAt = new Date();
  }

  // Consulta do cliente: só a própria Ordem.
  belongsTo(customerId: string): boolean {
    return this.customerId === customerId;
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
