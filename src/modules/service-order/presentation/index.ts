import { Elysia } from 'elysia';
import type { AuthPlugin } from '../../../shared/presentation/auth/auth.plugin.js';
import { EmployeeRole } from '../../employee/domain/enums/employee-role.enum.js';
import type { ServiceOrderUseCases } from '../service-order.container.js';
import { assignMechanicHandler } from './controllers/assign/assign-mechanic.handler.js';
import { completeDiagnosisHandler } from './controllers/diagnosis/complete-diagnosis.handler.js';
import { findServiceOrderByIdHandler } from './controllers/find/by-id/find-service-order-by-id.handler.js';
import { addProductItemHandler } from './controllers/items/add-product-item.handler.js';
import { addServiceItemHandler } from './controllers/items/add-service-item.handler.js';
import { changeItemQuantityHandler } from './controllers/items/change-item-quantity.handler.js';
import { removeItemHandler } from './controllers/items/remove-item.handler.js';
import { openAdditionalServiceOrderHandler } from './controllers/open/open-additional-service-order.handler.js';
import { openOrderHandler } from './controllers/open/open-order.handler.js';

const bearer = { security: [{ bearerAuth: [] }] };

// Abrir ordem e reparo adicional é do Atendente (ADMIN).
export const orderRoutes = (useCases: ServiceOrderUseCases, auth: AuthPlugin) =>
  new Elysia({ prefix: '/orders', tags: ['Service Orders'] })
    .use(auth)
    .guard({ auth: { roles: [EmployeeRole.ADMIN] }, detail: bearer }, (app) =>
      app
        .use(openOrderHandler(useCases.openOrder, auth))
        .use(
          openAdditionalServiceOrderHandler(
            useCases.openAdditionalServiceOrder,
            auth,
          ),
        ),
    );

// Atribuir é do Atendente; diagnóstico e itens são do mecânico responsável ou do
// ADMIN — quem confere o "responsável" é a ServiceOrder.assertCanBeWorkedBy().
export const serviceOrderRoutes = (
  useCases: ServiceOrderUseCases,
  auth: AuthPlugin,
) =>
  new Elysia({ prefix: '/service-orders', tags: ['Service Orders'] })
    .use(auth)
    .guard({ auth: { roles: [EmployeeRole.ADMIN] }, detail: bearer }, (app) =>
      app.use(assignMechanicHandler(useCases.assignMechanic)),
    )
    .guard(
      {
        auth: { roles: [EmployeeRole.ADMIN, EmployeeRole.MECHANIC] },
        detail: bearer,
      },
      (app) =>
        app
          .use(findServiceOrderByIdHandler(useCases.findServiceOrderById, auth))
          .use(addServiceItemHandler(useCases.addServiceItem, auth))
          .use(addProductItemHandler(useCases.addProductItem, auth))
          .use(changeItemQuantityHandler(useCases.changeItemQuantity, auth))
          .use(removeItemHandler(useCases.removeItem, auth))
          .use(completeDiagnosisHandler(useCases.completeDiagnosis, auth)),
    );
