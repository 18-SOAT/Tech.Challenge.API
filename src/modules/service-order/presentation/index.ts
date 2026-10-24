import { Elysia } from 'elysia';
import type { AuthPlugin } from '../../../shared/presentation/auth/auth.plugin.js';
import { EmployeeRole } from '../../employee/domain/enums/employee-role.enum.js';
import type { ServiceOrderUseCases } from '../service-order.container.js';
import { assignMechanicHandler } from './controllers/assign/assign-mechanic.handler.js';
import { approveQuoteHandler } from './controllers/decision/approve-quote.handler.js';
import { rejectQuoteHandler } from './controllers/decision/reject-quote.handler.js';
import { deliverOrderHandler } from './controllers/deliver/deliver-order.handler.js';
import { completeDiagnosisHandler } from './controllers/diagnosis/complete-diagnosis.handler.js';
import { findServiceOrderByIdHandler } from './controllers/find/by-id/find-service-order-by-id.handler.js';
import { finishServiceOrderHandler } from './controllers/finish/finish-service-order.handler.js';
import { addProductItemHandler } from './controllers/items/add-product-item.handler.js';
import { addServiceItemHandler } from './controllers/items/add-service-item.handler.js';
import { changeItemQuantityHandler } from './controllers/items/change-item-quantity.handler.js';
import { removeItemHandler } from './controllers/items/remove-item.handler.js';
import { findMyOrderHandler } from './controllers/me/find-my-order.handler.js';
import { listMyOrdersHandler } from './controllers/me/list-my-orders.handler.js';
import { openAdditionalServiceOrderHandler } from './controllers/open/open-additional-service-order.handler.js';
import { openOrderHandler } from './controllers/open/open-order.handler.js';

const bearer = { security: [{ bearerAuth: [] }] };

// Abrir ordem, reparo adicional e entregar o veículo é do Atendente (ADMIN).
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
        )
        .use(deliverOrderHandler(useCases.deliverOrder)),
    );

// Atribuir é do Atendente; diagnóstico e itens são do mecânico responsável ou do
// ADMIN — quem confere o "responsável" é a ServiceOrder.assertCanBeWorkedBy().
// Aprovar/rejeitar aceita o cliente: o guard só exige token, e quem confere o dono
// da Ordem é a Order.assertQuoteCanBeDecidedBy().
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
          .use(completeDiagnosisHandler(useCases.completeDiagnosis, auth))
          .use(finishServiceOrderHandler(useCases.finishServiceOrder, auth)),
    )
    .guard({ auth: true, detail: bearer }, (app) =>
      app
        .use(approveQuoteHandler(useCases.approveQuote, auth))
        .use(rejectQuoteHandler(useCases.rejectQuote, auth)),
    );

// Área do cliente: o escopo é o cliente do token (toCustomerId barra funcionário).
export const meRoutes = (useCases: ServiceOrderUseCases, auth: AuthPlugin) =>
  new Elysia({ prefix: '/me', tags: ['Customer Area'] })
    .use(auth)
    .guard({ auth: true, detail: bearer }, (app) =>
      app
        .use(listMyOrdersHandler(useCases.listMyOrders, auth))
        .use(findMyOrderHandler(useCases.findMyOrder, auth)),
    );
