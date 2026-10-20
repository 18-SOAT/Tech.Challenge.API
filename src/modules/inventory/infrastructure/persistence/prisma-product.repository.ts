import type { Prisma } from '../../../../generated/prisma/client.js';
import type { Page } from '../../../../shared/domain/pagination.js';
import type { PrismaClient } from '../../../../shared/infrastructure/prisma/client.js';
import {
  isForeignKeyViolation,
  isRecordNotFound,
  uniqueViolationFields,
} from '../../../../shared/infrastructure/prisma/prisma-errors.js';
import type { Product } from '../../domain/entities/product.entity.js';
import { ProductError } from '../../domain/errors/product.error.js';
import type {
  ProductFilter,
  ProductRepository,
} from '../../domain/repositories/product.repository.js';
import { ProductMapper } from './product.mapper.js';

export class PrismaProductRepository implements ProductRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findById(id: string): Promise<Product | null> {
    const record = await this.prisma.product.findUnique({ where: { id } });
    return record ? ProductMapper.toEntity(record) : null;
  }

  async findBySku(sku: string): Promise<Product | null> {
    const record = await this.prisma.product.findUnique({ where: { sku } });
    return record ? ProductMapper.toEntity(record) : null;
  }

  async findMany(filter: ProductFilter): Promise<Page<Product>> {
    // Field reference: compara duas colunas da mesma linha (saldo × mínimo) no
    // próprio WHERE, sem trazer a tabela inteira para filtrar em memória.
    const minimumStock = this.prisma.product.fields.minimumStock;
    const where: Prisma.ProductWhereInput = {
      name: filter.name
        ? { contains: filter.name, mode: 'insensitive' }
        : undefined,
      sku: filter.sku ? { contains: filter.sku } : undefined,
      type: filter.type,
      active: filter.active,
      stockQuantity:
        filter.belowMinimum === undefined
          ? undefined
          : filter.belowMinimum
            ? { lt: minimumStock }
            : { gte: minimumStock },
    };
    // Lote na mesma transação: total e página vêm do mesmo snapshot.
    const [total, records] = await this.prisma.$transaction([
      this.prisma.product.count({ where }),
      this.prisma.product.findMany({
        where,
        orderBy: { name: 'asc' },
        skip: (filter.page - 1) * filter.limit,
        take: filter.limit,
      }),
    ]);
    return { items: records.map(ProductMapper.toEntity), total };
  }

  async save(product: Product): Promise<void> {
    try {
      await this.prisma.product.upsert({
        where: { id: product.idValue },
        create: ProductMapper.toObject(product),
        update: ProductMapper.toCatalogObject(product),
      });
    } catch (error) {
      // Corrida com o check do use case: o unique do banco é a última barreira.
      if (uniqueViolationFields(error)?.includes('sku')) {
        throw ProductError.skuAlreadyInUse();
      }
      throw error;
    }
  }

  async delete(product: Product): Promise<void> {
    try {
      await this.prisma.product.delete({ where: { id: product.idValue } });
    } catch (error) {
      // FK de stock_movements ou product_items: o produto tem histórico.
      if (isForeignKeyViolation(error)) throw ProductError.inUse();
      if (isRecordNotFound(error)) throw ProductError.notFound();
      throw error;
    }
  }
}
