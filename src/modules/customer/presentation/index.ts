import { Elysia } from 'elysia';
import type { AuthPlugin } from '../../../shared/presentation/auth/auth.plugin.js';
import { EmployeeRole } from '../../employee/domain/enums/employee-role.enum.js';
import type { CustomerUseCases } from '../customer.container.js';
import { createCustomerHandler } from './controllers/create/create-customer.handler.js';
import { deleteCustomerHandler } from './controllers/delete/delete-customer.handler.js';
import { findCustomerByIdHandler } from './controllers/find/by-id/find-customer-by-id.handler.js';
import { listCustomersHandler } from './controllers/list/list-customers.handler.js';
import { updateCustomerHandler } from './controllers/update/update-customer.handler.js';

// Gestão de clientes é do Atendente (ADMIN): todas as rotas dentro do guard.
export const customerRoutes = (useCases: CustomerUseCases, auth: AuthPlugin) =>
  new Elysia({ prefix: '/customers', tags: ['Customers'] }).use(auth).guard(
    {
      auth: { roles: [EmployeeRole.ADMIN] },
      detail: { security: [{ bearerAuth: [] }] },
    },
    (app) =>
      app
        .use(createCustomerHandler(useCases.createCustomer))
        .use(listCustomersHandler(useCases.listCustomers))
        .use(findCustomerByIdHandler(useCases.findCustomerById))
        .use(updateCustomerHandler(useCases.updateCustomer))
        .use(deleteCustomerHandler(useCases.deleteCustomer)),
  );
