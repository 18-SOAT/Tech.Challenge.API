import { Elysia } from 'elysia';
import type { AuthPlugin } from '../../../shared/presentation/auth/auth.plugin.js';
import { EmployeeRole } from '../../employee/domain/enums/employee-role.enum.js';
import type { InventoryUseCases } from '../inventory.container.js';
import { createServiceHandler } from './controllers/create/create-service.handler.js';
import { deleteServiceHandler } from './controllers/delete/delete-service.handler.js';
import { findServiceByIdHandler } from './controllers/find/by-id/find-service-by-id.handler.js';
import { listServicesHandler } from './controllers/list/list-services.handler.js';
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
