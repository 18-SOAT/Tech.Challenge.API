import type { ProductRepository } from '../../../inventory/domain/repositories/product.repository.js';
import type { ServiceRepository } from '../../../inventory/domain/repositories/service.repository.js';
import type { ServiceOrder } from '../../domain/entities/service-order.entity.js';
import type { QuoteLine } from '../../domain/ports/service-order.mailer.js';

// Linhas do orçamento com o nome atual do catálogo e o preço congelado do item.
// Usado no e-mail do orçamento e na consulta do cliente. Item que sumiu do
// catálogo ainda aparece, com nome genérico.
export async function buildQuoteLines(
  serviceOrder: ServiceOrder,
  services: ServiceRepository,
  products: ProductRepository,
): Promise<QuoteLine[]> {
  const lines: QuoteLine[] = [];
  for (const item of serviceOrder.servicesValue) {
    const service = await services.findById(item.serviceIdValue);
    lines.push({
      name: service?.nameValue ?? 'Serviço',
      quantity: item.quantityValue,
      unitPrice: item.unitPriceValue,
      subtotal: item.subtotal,
    });
  }
  for (const item of serviceOrder.productsValue) {
    const product = await products.findById(item.productIdValue);
    lines.push({
      name: product?.nameValue ?? 'Produto',
      quantity: item.quantityValue,
      unitPrice: item.unitPriceValue,
      subtotal: item.subtotal,
    });
  }
  return lines;
}
