import type { UseCase } from '../../../../shared/application/use-case.interface.js';
import { ProductError } from '../../../inventory/domain/errors/product.error.js';
import type { ProductRepository } from '../../../inventory/domain/repositories/product.repository.js';
import type {
  ServiceOrder,
  ServiceOrderActor,
} from '../../domain/entities/service-order.entity.js';
import { ServiceOrderError } from '../../domain/errors/service-order.error.js';
import type { ServiceOrderRepository } from '../../domain/repositories/service-order.repository.js';

export interface AddProductItemInput {
  serviceOrderId: string;
  productId: string;
  quantity: number;
  actor: ServiceOrderActor;
}

// "Incluir peça/insumo" → "Peça/insumo incluído". O saldo não é reservado: a
// baixa (e o erro de estoque insuficiente) acontece na aprovação.
export class AddProductItemUseCase
  implements UseCase<AddProductItemInput, ServiceOrder>
{
  constructor(
    private readonly serviceOrderRepository: ServiceOrderRepository,
    private readonly productRepository: ProductRepository,
  ) {}

  async execute(input: AddProductItemInput): Promise<ServiceOrder> {
    const serviceOrder = await this.serviceOrderRepository.findById(
      input.serviceOrderId,
    );
    if (!serviceOrder) throw ServiceOrderError.notFound();
    serviceOrder.assertCanBeWorkedBy(input.actor);

    const product = await this.productRepository.findById(input.productId);
    if (!product) throw ProductError.notFound();

    serviceOrder.addProduct(product, input.quantity);
    await this.serviceOrderRepository.save(serviceOrder);
    return serviceOrder;
  }
}
