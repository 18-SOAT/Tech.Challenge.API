import { IdGenerator } from '../../../../shared/domain/id-generator.js';
import { Money } from '../../../../shared/domain/value-objects/money.vo.js';

// Linha de peça/insumo da OS, em unidades inteiras, com preço snapshot. O estoque
// não é reservado aqui: a baixa acontece na aprovação do orçamento (#12).
export class ProductItem {
  private constructor(
    private readonly id: string,
    private readonly productId: string,
    private quantity: number,
    private readonly unitPrice: Money,
  ) {}

  // Não chame direto: use ServiceOrder.addProduct(), que valida status e quantidade.
  static create(input: {
    productId: string;
    quantity: number;
    unitPrice: Money;
  }): ProductItem {
    return new ProductItem(
      IdGenerator.generate(),
      input.productId,
      input.quantity,
      input.unitPrice,
    );
  }

  static restore(props: {
    id: string;
    productId: string;
    quantity: number;
    unitPrice: number;
  }): ProductItem {
    return new ProductItem(
      props.id,
      props.productId,
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

  get productIdValue(): string {
    return this.productId;
  }

  get quantityValue(): number {
    return this.quantity;
  }

  get unitPriceValue(): Money {
    return this.unitPrice;
  }
}
