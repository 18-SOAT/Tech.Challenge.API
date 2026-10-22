import type { UseCase } from '../../../../shared/application/use-case.interface.js';
import type { CustomerRepository } from '../../../customer/domain/repositories/customer.repository.js';
import type { ProductRepository } from '../../../inventory/domain/repositories/product.repository.js';
import type { ServiceRepository } from '../../../inventory/domain/repositories/service.repository.js';
import type {
  ServiceOrder,
  ServiceOrderActor,
} from '../../domain/entities/service-order.entity.js';
import { ServiceOrderError } from '../../domain/errors/service-order.error.js';
import type {
  QuoteLine,
  ServiceOrderMailer,
} from '../../domain/ports/service-order.mailer.js';
import type { OrderRepository } from '../../domain/repositories/order.repository.js';
import type { ServiceOrderRepository } from '../../domain/repositories/service-order.repository.js';

export interface CompleteDiagnosisInput {
  serviceOrderId: string;
  actor: ServiceOrderActor;
}

// "Concluir diagnóstico" → "Orçamento gerado" (Aguardando aprovação) ⟶ "Orçamento
// enviado para aprovação" por e-mail ao cliente.
export class CompleteDiagnosisUseCase
  implements UseCase<CompleteDiagnosisInput, ServiceOrder>
{
  constructor(
    private readonly serviceOrderRepository: ServiceOrderRepository,
    private readonly orderRepository: OrderRepository,
    private readonly customerRepository: CustomerRepository,
    private readonly serviceRepository: ServiceRepository,
    private readonly productRepository: ProductRepository,
    private readonly mailer: ServiceOrderMailer,
  ) {}

  async execute(input: CompleteDiagnosisInput): Promise<ServiceOrder> {
    const serviceOrder = await this.serviceOrderRepository.findById(
      input.serviceOrderId,
    );
    if (!serviceOrder) throw ServiceOrderError.notFound();
    serviceOrder.assertCanBeWorkedBy(input.actor);

    serviceOrder.completeDiagnosis(input.actor.employeeId);
    await this.serviceOrderRepository.save(serviceOrder);

    // Depois do commit e fire-and-forget: SMTP fora do ar não desfaz o orçamento.
    // O cliente também acompanha a OS pela API (#13).
    void this.sendQuote(serviceOrder).catch((error) =>
      console.error('[CompleteDiagnosis] falha ao enviar orçamento', error),
    );
    return serviceOrder;
  }

  private async sendQuote(serviceOrder: ServiceOrder): Promise<void> {
    const order = await this.orderRepository.findById(
      serviceOrder.orderIdValue,
    );
    if (!order) return;
    const customer = await this.customerRepository.findById(
      order.customerIdValue,
    );
    if (!customer) return;

    const lines: QuoteLine[] = [];
    for (const item of serviceOrder.servicesValue) {
      const service = await this.serviceRepository.findById(
        item.serviceIdValue,
      );
      lines.push({
        name: service?.nameValue ?? 'Serviço',
        quantity: item.quantityValue,
        unitPrice: item.unitPriceValue,
        subtotal: item.subtotal,
      });
    }
    for (const item of serviceOrder.productsValue) {
      const product = await this.productRepository.findById(
        item.productIdValue,
      );
      lines.push({
        name: product?.nameValue ?? 'Produto',
        quantity: item.quantityValue,
        unitPrice: item.unitPriceValue,
        subtotal: item.subtotal,
      });
    }

    await this.mailer.sendQuote({
      to: customer.emailValue,
      customerName: customer.nameValue,
      orderNumber: order.numberValue ?? 0,
      serviceOrderId: serviceOrder.idValue,
      lines,
      total: serviceOrder.total,
    });
  }
}
