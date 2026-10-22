import { IdGenerator } from '../../../../shared/domain/id-generator.js';
import { Money } from '../../../../shared/domain/value-objects/money.vo.js';
import { EmployeeRole } from '../../../employee/domain/enums/employee-role.enum.js';
import type { Product } from '../../../inventory/domain/entities/product.entity.js';
import type { Service } from '../../../inventory/domain/entities/service.entity.js';
import { ServiceOrderStatus } from '../enums/service-order-status.enum.js';
import { ServiceOrderError } from '../errors/service-order.error.js';
import { ProductItem } from './product-item.entity.js';
import { ServiceItem } from './service-item.entity.js';
import { ServiceOrderStatusHistory } from './service-order-status-history.entity.js';

// Quem age sobre a OS, como vem das claims do token (employeeId + role).
export interface ServiceOrderActor {
  employeeId: string;
  role: EmployeeRole;
}

export const TERMINAL_STATUSES: readonly ServiceOrderStatus[] = [
  ServiceOrderStatus.FINISHED,
  ServiceOrderStatus.REJECTED,
];

// Raiz do agregado: itens e histórico só mudam por aqui. Nasce como orçamento
// (IN_DIAGNOSIS) e, aprovada, vira a OS executada. Toda transição de status
// passa por `transitionTo`, que grava a linha do histórico.
export class ServiceOrder {
  private constructor(
    private readonly id: string,
    private readonly orderId: string,
    private assigneeId: string | null,
    private status: ServiceOrderStatus,
    private readonly description: string | null,
    private approvedAmount: Money | null,
    private approvedAt: Date | null,
    private readonly createdAt: Date,
    private readonly services: ServiceItem[],
    private readonly products: ProductItem[],
    private readonly history: ServiceOrderStatusHistory[],
    // Status com que o agregado foi lido do banco (null = ainda não gravado). O
    // save() só grava se o banco continua nesse status: lock otimista, que barra
    // duas transições simultâneas (ex: finalizar duas vezes) sem travar a linha.
    private readonly loadedStatus: ServiceOrderStatus | null,
  ) {}

  // "OS criada" (Em diagnóstico): a primeira da Ordem ou um reparo adicional.
  static create(input: {
    orderId: string;
    description?: string | null;
    createdById: string | null;
  }): ServiceOrder {
    return new ServiceOrder(
      IdGenerator.generate(),
      input.orderId,
      null,
      ServiceOrderStatus.IN_DIAGNOSIS,
      input.description?.trim() || null,
      null,
      null,
      new Date(),
      [],
      [],
      [
        ServiceOrderStatusHistory.create({
          status: ServiceOrderStatus.IN_DIAGNOSIS,
          changedById: input.createdById,
        }),
      ],
      null,
    );
  }

  static restore(props: {
    id: string;
    orderId: string;
    assigneeId: string | null;
    status: ServiceOrderStatus;
    description: string | null;
    approvedAmount: number | null;
    approvedAt: Date | null;
    createdAt: Date;
    services: ServiceItem[];
    products: ProductItem[];
    history: ServiceOrderStatusHistory[];
  }): ServiceOrder {
    return new ServiceOrder(
      props.id,
      props.orderId,
      props.assigneeId,
      props.status,
      props.description,
      props.approvedAmount === null
        ? null
        : Money.fromReais(props.approvedAmount),
      props.approvedAt,
      props.createdAt,
      [...props.services],
      [...props.products],
      [...props.history],
      props.status,
    );
  }

  // Regra de quem trabalha na OS: o ADMIN (atendente) sempre; o MECHANIC só na OS
  // atribuída a ele. Fica aqui, não no handler, para valer em qualquer use case.
  assertCanBeWorkedBy(actor: ServiceOrderActor): void {
    if (actor.role === EmployeeRole.ADMIN) return;
    if (this.assigneeId !== actor.employeeId) {
      throw ServiceOrderError.notAssignedToYou();
    }
  }

  // "Mecânico atribuído". Pode trocar de responsável enquanto a OS não fechou.
  assign(mechanic: { id: string; role: EmployeeRole }): void {
    this.assertNotClosed();
    if (mechanic.role !== EmployeeRole.MECHANIC) {
      throw ServiceOrderError.assigneeNotMechanic();
    }
    this.assigneeId = mechanic.id;
  }

  // "Serviço incluído": copia o preço do catálogo agora (snapshot). O mesmo serviço
  // de novo soma na quantidade, em vez de duplicar a linha.
  addService(service: Service, quantity: number): ServiceItem {
    this.assertEditable();
    ServiceOrder.assertValidQuantity(quantity);
    if (!service.isActive) throw ServiceOrderError.inactiveCatalogItem();

    const existing = this.services.find(
      (item) => item.serviceIdValue === service.idValue,
    );
    if (existing) {
      existing.changeQuantity(existing.quantityValue + quantity);
      return existing;
    }
    const item = ServiceItem.create({
      serviceId: service.idValue,
      quantity,
      unitPrice: service.priceValue,
    });
    this.services.push(item);
    return item;
  }

  // "Peça/insumo incluído": mesma regra do serviço. O saldo de estoque não é
  // checado aqui: a baixa (e o erro de saldo) é na aprovação.
  addProduct(product: Product, quantity: number): ProductItem {
    this.assertEditable();
    ServiceOrder.assertValidQuantity(quantity);
    if (!product.isActive) throw ServiceOrderError.inactiveCatalogItem();

    const existing = this.products.find(
      (item) => item.productIdValue === product.idValue,
    );
    if (existing) {
      existing.changeQuantity(existing.quantityValue + quantity);
      return existing;
    }
    const item = ProductItem.create({
      productId: product.idValue,
      quantity,
      unitPrice: product.priceValue,
    });
    this.products.push(item);
    return item;
  }

  // Corrige a quantidade de um item (serviço ou produto) durante o diagnóstico.
  // O preço unitário não muda: continua o do momento em que o item entrou.
  changeItemQuantity(itemId: string, quantity: number): void {
    this.assertEditable();
    ServiceOrder.assertValidQuantity(quantity);
    this.findItem(itemId).changeQuantity(quantity);
  }

  removeItem(itemId: string): void {
    this.assertEditable();
    const serviceIndex = this.services.findIndex(
      (item) => item.idValue === itemId,
    );
    if (serviceIndex >= 0) {
      this.services.splice(serviceIndex, 1);
      return;
    }
    const productIndex = this.products.findIndex(
      (item) => item.idValue === itemId,
    );
    if (productIndex < 0) throw ServiceOrderError.itemNotFound();
    this.products.splice(productIndex, 1);
  }

  // "Diagnóstico concluído" → "Orçamento gerado" (Aguardando aprovação). O
  // orçamento é o `total` dos itens; o envio ao cliente é do use case.
  completeDiagnosis(changedById: string): void {
    this.assertEditable();
    if (!this.assigneeId) throw ServiceOrderError.noAssignee();
    if (this.services.length === 0 && this.products.length === 0) {
      throw ServiceOrderError.emptyQuote();
    }
    this.transitionTo(ServiceOrderStatus.AWAITING_APPROVAL, changedById);
  }

  // "Orçamento aprovado" (Em execução): o total vira o valor aprovado, congelado —
  // mudar o catálogo ou os itens depois não altera o que o cliente aceitou. A baixa
  // de estoque e o início da Ordem são do use case, na mesma transação.
  approve(changedById: string | null): void {
    this.assertAwaitingApproval();
    this.approvedAmount = this.total;
    this.approvedAt = new Date();
    this.transitionTo(ServiceOrderStatus.IN_EXECUTION, changedById);
  }

  // "Orçamento rejeitado": status terminal, nada é executado nem baixado.
  reject(changedById: string | null): void {
    this.assertAwaitingApproval();
    this.transitionTo(ServiceOrderStatus.REJECTED, changedById);
  }

  // "OS finalizada": fecha o tempo de execução (o histórico guarda o instante).
  finish(changedById: string): void {
    if (this.status !== ServiceOrderStatus.IN_EXECUTION) {
      throw ServiceOrderError.notInExecution();
    }
    this.transitionTo(ServiceOrderStatus.FINISHED, changedById);
  }

  private transitionTo(
    status: ServiceOrderStatus,
    changedById: string | null,
  ): void {
    this.status = status;
    this.history.push(
      ServiceOrderStatusHistory.create({ status, changedById }),
    );
  }

  private findItem(itemId: string): ServiceItem | ProductItem {
    const item =
      this.services.find((service) => service.idValue === itemId) ??
      this.products.find((product) => product.idValue === itemId);
    if (!item) throw ServiceOrderError.itemNotFound();
    return item;
  }

  // Itens só mudam antes do orçamento: depois disso o cliente está avaliando um valor.
  private assertEditable(): void {
    if (this.status !== ServiceOrderStatus.IN_DIAGNOSIS) {
      throw ServiceOrderError.notInDiagnosis();
    }
  }

  private assertAwaitingApproval(): void {
    if (this.status !== ServiceOrderStatus.AWAITING_APPROVAL) {
      throw ServiceOrderError.notAwaitingApproval();
    }
  }

  private assertNotClosed(): void {
    if (this.isClosed) throw ServiceOrderError.alreadyClosed();
  }

  private static assertValidQuantity(quantity: number): void {
    if (!Number.isInteger(quantity) || quantity <= 0) {
      throw ServiceOrderError.invalidQuantity();
    }
  }

  // Orçamento: soma em centavos inteiros (Money), sem erro de ponto flutuante.
  get total(): Money {
    const cents = [...this.services, ...this.products].reduce(
      (sum, item) => sum + item.subtotal.cents,
      0,
    );
    return Money.fromCents(cents);
  }

  get isClosed(): boolean {
    return TERMINAL_STATUSES.includes(this.status);
  }

  get idValue(): string {
    return this.id;
  }

  get loadedStatusValue(): ServiceOrderStatus | null {
    return this.loadedStatus;
  }

  get orderIdValue(): string {
    return this.orderId;
  }

  get assigneeIdValue(): string | null {
    return this.assigneeId;
  }

  get statusValue(): ServiceOrderStatus {
    return this.status;
  }

  get descriptionValue(): string | null {
    return this.description;
  }

  get approvedAmountValue(): Money | null {
    return this.approvedAmount;
  }

  get approvedAtValue(): Date | null {
    return this.approvedAt;
  }

  get createdAtValue(): Date {
    return this.createdAt;
  }

  get servicesValue(): readonly ServiceItem[] {
    return this.services;
  }

  get productsValue(): readonly ProductItem[] {
    return this.products;
  }

  get historyValue(): readonly ServiceOrderStatusHistory[] {
    return this.history;
  }
}
