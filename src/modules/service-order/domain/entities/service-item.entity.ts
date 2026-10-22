import { IdGenerator } from '../../../../shared/domain/id-generator.js';
import { Money } from '../../../../shared/domain/value-objects/money.vo.js';

// Linha de mão de obra da OS. Guarda o serviço só pelo ID (outro contexto) e o
// preço copiado do catálogo quando entrou (snapshot). Só muda pela ServiceOrder.
export class ServiceItem {
  private constructor(
    private readonly id: string,
    private readonly serviceId: string,
    private quantity: number,
    private readonly unitPrice: Money,
  ) {}

  // Não chame direto: use ServiceOrder.addService(), que valida status e quantidade.
  static create(input: {
    serviceId: string;
    quantity: number;
    unitPrice: Money;
  }): ServiceItem {
    return new ServiceItem(
      IdGenerator.generate(),
      input.serviceId,
      input.quantity,
      input.unitPrice,
    );
  }

  static restore(props: {
    id: string;
    serviceId: string;
    quantity: number;
    unitPrice: number;
  }): ServiceItem {
    return new ServiceItem(
      props.id,
      props.serviceId,
      props.quantity,
      Money.fromReais(props.unitPrice),
    );
  }

  changeQuantity(quantity: number): void {
    this.quantity = quantity;
  }

  get subtotal(): Money {
    return Money.fromCents(this.unitPrice.cents * this.quantity);
  }

  get idValue(): string {
    return this.id;
  }

  get serviceIdValue(): string {
    return this.serviceId;
  }

  get quantityValue(): number {
    return this.quantity;
  }

  get unitPriceValue(): Money {
    return this.unitPrice;
  }
}
