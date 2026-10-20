import { t } from 'elysia';
import type { Product } from '../../domain/entities/product.entity.js';
import { ProductType } from '../../domain/enums/product-type.enum.js';

export class ProductResponseDto {
  private constructor(
    readonly id: string,
    readonly sku: string,
    readonly name: string,
    readonly description: string | null,
    readonly type: ProductType,
    readonly price: number,
    readonly stockQuantity: number,
    readonly minimumStock: number,
    readonly belowMinimum: boolean,
    readonly active: boolean,
  ) {}

  static fromEntity(product: Product): ProductResponseDto {
    return new ProductResponseDto(
      product.idValue,
      product.skuValue,
      product.nameValue,
      product.descriptionValue,
      product.typeValue,
      product.priceValue.value,
      product.stockQuantityValue,
      product.minimumStockValue,
      product.isBelowMinimum,
      product.isActive,
    );
  }
}

export const ProductResponseSchema = t.Object(
  {
    id: t.String({ format: 'uuid', description: 'Id do Product (UUID v7)' }),
    sku: t.String({ examples: ['PF-123'] }),
    name: t.String({ examples: ['Pastilha de freio dianteira'] }),
    description: t.Nullable(t.String({ examples: ['Jogo com 4 unidades'] })),
    type: t.Enum(ProductType),
    price: t.Number({ description: 'Reais por unidade', examples: [149.9] }),
    stockQuantity: t.Integer({
      description: 'Saldo atual, mantido pelas movimentações de estoque',
      examples: [7],
    }),
    minimumStock: t.Integer({ examples: [4] }),
    belowMinimum: t.Boolean({ description: 'stockQuantity < minimumStock' }),
    active: t.Boolean({ description: 'Inativo não entra em orçamento novo' }),
  },
  { title: 'Product' },
);
