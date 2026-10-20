import type {
  Prisma,
  Product as PrismaProduct,
} from '../../../../generated/prisma/client.js';
import { Product } from '../../domain/entities/product.entity.js';
import type { ProductType } from '../../domain/enums/product-type.enum.js';

export class ProductMapper {
  // Decimal(10,2) → number: o Money.fromReais do restore absorve o ruído do float.
  static toEntity(record: PrismaProduct): Product {
    return Product.restore({
      id: record.id,
      sku: record.sku,
      name: record.name,
      description: record.description,
      type: record.type as ProductType,
      price: record.price.toNumber(),
      stockQuantity: record.stockQuantity,
      minimumStock: record.minimumStock,
      active: record.active,
    });
  }

  // Insert: o saldo vai junto (é 0 num produto novo).
  static toObject(entity: Product): Prisma.ProductCreateInput {
    return {
      id: entity.idValue,
      ...ProductMapper.toCatalogObject(entity),
      stockQuantity: entity.stockQuantityValue,
    };
  }

  // Update: só dados de catálogo. Sem `stockQuantity`, um PATCH concorrente com
  // uma entrada de estoque não desfaz a entrada (saldo muda só via movimentação).
  static toCatalogObject(entity: Product) {
    return {
      sku: entity.skuValue,
      name: entity.nameValue,
      description: entity.descriptionValue,
      type: entity.typeValue,
      price: entity.priceValue.toDecimalString(),
      minimumStock: entity.minimumStockValue,
      active: entity.isActive,
    } satisfies Prisma.ProductUpdateInput;
  }
}
