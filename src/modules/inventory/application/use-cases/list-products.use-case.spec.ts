import { beforeEach, describe, expect, it } from 'bun:test';
import { InMemoryProductRepository } from '../../../../../test/fakes/in-memory-product.repository.js';
import { Money } from '../../../../shared/domain/value-objects/money.vo.js';
import { Product } from '../../domain/entities/product.entity.js';
import { ProductType } from '../../domain/enums/product-type.enum.js';
import { ListProductsUseCase } from './list-products.use-case.js';

describe('ListProductsUseCase', () => {
  let products: InMemoryProductRepository;
  let useCase: ListProductsUseCase;

  const add = async (
    sku: string,
    name: string,
    type: ProductType,
    minimumStock: number,
  ) => {
    const product = Product.create({
      sku,
      name,
      type,
      price: Money.fromReais(10),
      minimumStock,
    });
    await products.save(product);
    return product;
  };

  beforeEach(async () => {
    products = new InMemoryProductRepository();
    useCase = new ListProductsUseCase(products);
    await add('PF-1', 'Pastilha de freio', ProductType.PART, 0);
    await add('OL-1', 'Óleo 5W30', ProductType.SUPPLY, 5);
  });

  it('busca por nome e SKU com trim, sem diferenciar maiúscula', async () => {
    const byName = await useCase.execute({
      page: 1,
      limit: 10,
      name: ' óleo ',
    });
    const bySku = await useCase.execute({ page: 1, limit: 10, sku: ' pf ' });

    expect(byName.items.map((p) => p.skuValue)).toStrictEqual(['OL-1']);
    expect(bySku.items.map((p) => p.skuValue)).toStrictEqual(['PF-1']);
  });

  it('filtro em branco é ignorado', async () => {
    const page = await useCase.execute({
      page: 1,
      limit: 10,
      name: '  ',
      sku: ' ',
    });

    expect(page.total).toBe(2);
  });

  it('belowMinimum lista só os produtos com saldo menor que o mínimo', async () => {
    const page = await useCase.execute({
      page: 1,
      limit: 10,
      belowMinimum: true,
    });

    expect(page.items.map((p) => p.skuValue)).toStrictEqual(['OL-1']);
  });

  it('filtra por tipo', async () => {
    const page = await useCase.execute({
      page: 1,
      limit: 10,
      type: ProductType.PART,
    });

    expect(page.items.map((p) => p.skuValue)).toStrictEqual(['PF-1']);
  });
});
