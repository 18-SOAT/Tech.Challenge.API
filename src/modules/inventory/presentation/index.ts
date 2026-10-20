import { Elysia } from 'elysia';
import type { AuthPlugin } from '../../../shared/presentation/auth/auth.plugin.js';
import { EmployeeRole } from '../../employee/domain/enums/employee-role.enum.js';
import type { InventoryUseCases } from '../inventory.container.js';
import { createProductHandler } from './controllers/create/create-product.handler.js';
import { createServiceHandler } from './controllers/create/create-service.handler.js';
import { deleteProductHandler } from './controllers/delete/delete-product.handler.js';
import { deleteServiceHandler } from './controllers/delete/delete-service.handler.js';
import { findProductByIdHandler } from './controllers/find/by-id/find-product-by-id.handler.js';
import { findServiceByIdHandler } from './controllers/find/by-id/find-service-by-id.handler.js';
import { listProductsHandler } from './controllers/list/list-products.handler.js';
import { listServicesHandler } from './controllers/list/list-services.handler.js';
import { adjustStockHandler } from './controllers/stock/adjust-stock.handler.js';
import { listStockMovementsHandler } from './controllers/stock/list-stock-movements.handler.js';
import { receiveStockHandler } from './controllers/stock/receive-stock.handler.js';
import { updateProductHandler } from './controllers/update/update-product.handler.js';
import { updateServiceHandler } from './controllers/update/update-service.handler.js';

const bearer = { security: [{ bearerAuth: [] }] };

// Catálogo é cadastrado pelo Atendente (ADMIN); o Mecânico só consulta, para
// incluir serviços na OS. Dois guards: leitura e escrita.
export const serviceRoutes = (useCases: InventoryUseCases, auth: AuthPlugin) =>
  new Elysia({ prefix: '/services', tags: ['Services'] })
    .use(auth)
    .guard(
      {
        auth: { roles: [EmployeeRole.ADMIN, EmployeeRole.MECHANIC] },
        detail: bearer,
      },
      (app) =>
        app
          .use(listServicesHandler(useCases.listServices))
          .use(findServiceByIdHandler(useCases.findServiceById)),
    )
    .guard({ auth: { roles: [EmployeeRole.ADMIN] }, detail: bearer }, (app) =>
      app
        .use(createServiceHandler(useCases.createService))
        .use(updateServiceHandler(useCases.updateService))
        .use(deleteServiceHandler(useCases.deleteService)),
    );

// Mesma divisão do catálogo de serviços: o Mecânico consulta peças e saldo para
// montar a OS; cadastro e movimentação de estoque são do Atendente (ADMIN).
export const productRoutes = (useCases: InventoryUseCases, auth: AuthPlugin) =>
  new Elysia({ prefix: '/products', tags: ['Products'] })
    .use(auth)
    .guard(
      {
        auth: { roles: [EmployeeRole.ADMIN, EmployeeRole.MECHANIC] },
        detail: bearer,
      },
      (app) =>
        app
          .use(listProductsHandler(useCases.listProducts))
          .use(findProductByIdHandler(useCases.findProductById))
          .use(listStockMovementsHandler(useCases.listStockMovements)),
    )
    .guard({ auth: { roles: [EmployeeRole.ADMIN] }, detail: bearer }, (app) =>
      app
        .use(createProductHandler(useCases.createProduct))
        .use(updateProductHandler(useCases.updateProduct))
        .use(deleteProductHandler(useCases.deleteProduct))
        .use(receiveStockHandler(useCases.receiveStock))
        .use(adjustStockHandler(useCases.adjustStock)),
    );
