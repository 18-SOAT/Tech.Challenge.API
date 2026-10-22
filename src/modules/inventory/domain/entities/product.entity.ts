import { IdGenerator } from '../../../../shared/domain/id-generator.js';
import { Money } from '../../../../shared/domain/value-objects/money.vo.js';
import type { ProductType } from '../enums/product-type.enum.js';
import { StockMovementType } from '../enums/stock-movement-type.enum.js';
import { ProductError } from '../errors/product.error.js';
import { StockMovement } from './stock-movement.entity.js';

const SKU_PATTERN = /^[A-Z0-9-]{1,40}$/;

// Peça (PART) ou insumo (SUPPLY), vendido em unidades inteiras. O saldo só muda
// por movimentação (receive/adjust/withdraw): `update()` não aceita saldo, e todo método
// que mexe nele devolve o StockMovement que o use case grava na mesma transação.
export class Product {
  private constructor(
    private readonly id: string,
    private sku: string,
    private name: string,
    private description: string | null,
    private type: ProductType,
    private price: Money,
    private stockQuantity: number,
    private minimumStock: number,
    private active: boolean,
  ) {}

  // Nasce com saldo 0: a primeira entrada é uma movimentação IN, não um campo.
  static create(input: {
    sku: string;
    name: string;
    description?: string | null;
    type: ProductType;
    price: Money;
    minimumStock?: number;
  }): Product {
    return new Product(
      IdGenerator.generate(),
      Product.normalizeSku(input.sku),
      Product.validName(input.name),
      Product.normalizeDescription(input.description ?? null),
      input.type,
      input.price,
      0,
      Product.validMinimumStock(input.minimumStock ?? 0),
      true,
    );
  }

  static restore(props: {
    id: string;
    sku: string;
    name: string;
    description: string | null;
    type: ProductType;
    price: number;
    stockQuantity: number;
    minimumStock: number;
    active: boolean;
  }): Product {
    return new Product(
      props.id,
      props.sku,
      props.name,
      props.description,
      props.type,
      Money.fromReais(props.price),
      props.stockQuantity,
      props.minimumStock,
      props.active,
    );
  }

  // Normalização do SKU exposta para o use case buscar a unicidade com a mesma regra.
  static normalizeSku(raw: string): string {
    const sku = raw.trim().toUpperCase();
    if (!SKU_PATTERN.test(sku)) throw ProductError.invalidSku();
    return sku;
  }

  // Dados de catálogo. `undefined` mantém o valor atual; `null` limpa a descrição.
  update(changes: {
    sku?: string;
    name?: string;
    description?: string | null;
    type?: ProductType;
    price?: Money;
    minimumStock?: number;
  }): void {
    // Valida tudo antes de mutar: um campo inválido não deixa o produto pela metade.
    const sku =
      changes.sku === undefined ? this.sku : Product.normalizeSku(changes.sku);
    const name =
      changes.name === undefined ? this.name : Product.validName(changes.name);
    const description =
      changes.description === undefined
        ? this.description
        : Product.normalizeDescription(changes.description);
    const minimumStock =
      changes.minimumStock === undefined
        ? this.minimumStock
        : Product.validMinimumStock(changes.minimumStock);

    this.sku = sku;
    this.name = name;
    this.description = description;
    this.type = changes.type ?? this.type;
    this.price = changes.price ?? this.price;
    this.minimumStock = minimumStock;
  }

  // Inativo continua existindo (OS e movimentações antigas apontam para ele), mas
  // não entra em orçamento novo — quem barra é o ServiceOrder.addProduct() da #11.
  deactivate(): void {
    this.active = false;
  }

  activate(): void {
    this.active = true;
  }

  // Entrada de estoque (compra, devolução do fornecedor...).
  receive(quantity: number, reason?: string | null): StockMovement {
    if (!Number.isInteger(quantity) || quantity <= 0) {
      throw ProductError.invalidQuantity();
    }
    this.stockQuantity += quantity;
    return StockMovement.create({
      productId: this.id,
      type: StockMovementType.IN,
      quantity,
      reason: Product.normalizeDescription(reason ?? null),
    });
  }

  // Ajuste de inventário: delta com sinal (contagem achou 3 a menos → -3).
  // Motivo obrigatório: é o que justifica o saldo mudar sem compra nem OS.
  adjust(delta: number, reason: string): StockMovement {
    if (!Number.isInteger(delta) || delta === 0) {
      throw ProductError.invalidQuantity();
    }
    const justification = reason.trim();
    if (!justification) throw ProductError.adjustmentReasonRequired();
    if (this.stockQuantity + delta < 0) throw ProductError.insufficientStock();

    this.stockQuantity += delta;
    return StockMovement.create({
      productId: this.id,
      type: StockMovementType.ADJUSTMENT,
      quantity: delta,
      reason: justification,
    });
  }

  // Baixa das peças de uma OS aprovada. O saldo lido aqui pode estar velho: quem
  // garante o "nunca negativo" na corrida é o update condicional do adapter.
  withdraw(quantity: number, serviceOrderId: string): StockMovement {
    if (!Number.isInteger(quantity) || quantity <= 0) {
      throw ProductError.invalidQuantity();
    }
    if (this.stockQuantity < quantity) throw ProductError.insufficientStock();

    this.stockQuantity -= quantity;
    return StockMovement.create({
      productId: this.id,
      type: StockMovementType.OUT,
      quantity,
      serviceOrderId,
    });
  }

  private static validName(raw: string): string {
    const name = raw.trim();
    if (!name) throw ProductError.invalidName();
    return name;
  }

  private static normalizeDescription(raw: string | null): string | null {
    return raw?.trim() || null;
  }

  private static validMinimumStock(value: number): number {
    if (!Number.isInteger(value) || value < 0) {
      throw ProductError.invalidMinimumStock();
    }
    return value;
  }

  get idValue(): string {
    return this.id;
  }

  get skuValue(): string {
    return this.sku;
  }

  get nameValue(): string {
    return this.name;
  }

  get descriptionValue(): string | null {
    return this.description;
  }

  get typeValue(): ProductType {
    return this.type;
  }

  get priceValue(): Money {
    return this.price;
  }

  get stockQuantityValue(): number {
    return this.stockQuantity;
  }

  get minimumStockValue(): number {
    return this.minimumStock;
  }

  get isActive(): boolean {
    return this.active;
  }

  // Critério de "Produtos abaixo do mínimo" (mesmo do filtro no banco).
  get isBelowMinimum(): boolean {
    return this.stockQuantity < this.minimumStock;
  }
}
