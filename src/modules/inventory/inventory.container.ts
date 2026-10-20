import type { SharedContainer } from '../../shared/shared.container.js';
import { AdjustStockUseCase } from './application/use-cases/adjust-stock.use-case.js';
import { CreateProductUseCase } from './application/use-cases/create-product.use-case.js';
import { CreateServiceUseCase } from './application/use-cases/create-service.use-case.js';
import { DeleteProductUseCase } from './application/use-cases/delete-product.use-case.js';
import { DeleteServiceUseCase } from './application/use-cases/delete-service.use-case.js';
import { FindProductByIdUseCase } from './application/use-cases/find-product-by-id.use-case.js';
import { FindServiceByIdUseCase } from './application/use-cases/find-service-by-id.use-case.js';
import { ListProductsUseCase } from './application/use-cases/list-products.use-case.js';
import { ListServicesUseCase } from './application/use-cases/list-services.use-case.js';
import { ListStockMovementsUseCase } from './application/use-cases/list-stock-movements.use-case.js';
import { ReceiveStockUseCase } from './application/use-cases/receive-stock.use-case.js';
import { UpdateProductUseCase } from './application/use-cases/update-product.use-case.js';
import { UpdateServiceUseCase } from './application/use-cases/update-service.use-case.js';
import type { StockMovementRepository } from './domain/ports/stock-movement.repository.js';
import type { ProductRepository } from './domain/repositories/product.repository.js';
import type { ServiceRepository } from './domain/repositories/service.repository.js';
import { PrismaProductRepository } from './infrastructure/persistence/prisma-product.repository.js';
import { PrismaServiceRepository } from './infrastructure/persistence/prisma-service.repository.js';
import { PrismaStockMovementRepository } from './infrastructure/persistence/prisma-stock-movement.repository.js';

// Composition root do módulo: o único arquivo que liga port → adapter.
export function makeInventoryContainer(shared: SharedContainer) {
  const serviceRepository: ServiceRepository = new PrismaServiceRepository(
    shared.prisma,
  );
  const productRepository: ProductRepository = new PrismaProductRepository(
    shared.prisma,
  );
  const stockMovementRepository: StockMovementRepository =
    new PrismaStockMovementRepository(shared.prisma);

  return {
    createService: new CreateServiceUseCase(serviceRepository),
    listServices: new ListServicesUseCase(serviceRepository),
    findServiceById: new FindServiceByIdUseCase(serviceRepository),
    updateService: new UpdateServiceUseCase(serviceRepository),
    deleteService: new DeleteServiceUseCase(serviceRepository),
    createProduct: new CreateProductUseCase(productRepository),
    listProducts: new ListProductsUseCase(productRepository),
    findProductById: new FindProductByIdUseCase(productRepository),
    updateProduct: new UpdateProductUseCase(productRepository),
    deleteProduct: new DeleteProductUseCase(productRepository),
    receiveStock: new ReceiveStockUseCase(
      productRepository,
      stockMovementRepository,
    ),
    adjustStock: new AdjustStockUseCase(
      productRepository,
      stockMovementRepository,
    ),
    listStockMovements: new ListStockMovementsUseCase(
      productRepository,
      stockMovementRepository,
    ),
  };
}

export type InventoryUseCases = ReturnType<typeof makeInventoryContainer>;
