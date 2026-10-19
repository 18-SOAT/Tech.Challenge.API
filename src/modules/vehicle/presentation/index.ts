import { Elysia } from 'elysia';
import type { AuthPlugin } from '../../../shared/presentation/auth/auth.plugin.js';
import { EmployeeRole } from '../../employee/domain/enums/employee-role.enum.js';
import type { VehicleUseCases } from '../vehicle.container.js';
import { createVehicleHandler } from './controllers/create/create-vehicle.handler.js';
import { deleteVehicleHandler } from './controllers/delete/delete-vehicle.handler.js';
import { findVehicleByIdHandler } from './controllers/find/by-id/find-vehicle-by-id.handler.js';
import { listVehiclesHandler } from './controllers/list/list-vehicles.handler.js';
import { updateVehicleHandler } from './controllers/update/update-vehicle.handler.js';

// Gestão de veículos é do Atendente (ADMIN): todas as rotas dentro do guard.
export const vehicleRoutes = (useCases: VehicleUseCases, auth: AuthPlugin) =>
  new Elysia({ prefix: '/vehicles', tags: ['Vehicles'] }).use(auth).guard(
    {
      auth: { roles: [EmployeeRole.ADMIN] },
      detail: { security: [{ bearerAuth: [] }] },
    },
    (app) =>
      app
        .use(createVehicleHandler(useCases.createVehicle))
        .use(listVehiclesHandler(useCases.listVehicles))
        .use(findVehicleByIdHandler(useCases.findVehicleById))
        .use(updateVehicleHandler(useCases.updateVehicle))
        .use(deleteVehicleHandler(useCases.deleteVehicle)),
  );
