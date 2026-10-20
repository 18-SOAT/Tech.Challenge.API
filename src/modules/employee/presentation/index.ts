import { Elysia } from 'elysia';
import type { AuthPlugin } from '../../../shared/presentation/auth/auth.plugin.js';
import { EmployeeRole } from '../domain/enums/employee-role.enum.js';
import type { EmployeeUseCases } from '../employee.container.js';
import { createEmployeeHandler } from './controllers/create/create-employee.handler.js';
import { findEmployeeByIdHandler } from './controllers/find/by-id/find-employee-by-id.handler.js';
import { listEmployeesHandler } from './controllers/list/list-employees.handler.js';
import { changeEmployeeRoleHandler } from './controllers/role/change-employee-role.handler.js';

// Gestão da equipe é do Atendente (ADMIN): todas as rotas dentro do guard.
export const employeeRoutes = (useCases: EmployeeUseCases, auth: AuthPlugin) =>
  new Elysia({ prefix: '/employees', tags: ['Employees'] }).use(auth).guard(
    {
      auth: { roles: [EmployeeRole.ADMIN] },
      detail: { security: [{ bearerAuth: [] }] },
    },
    (app) =>
      app
        .use(createEmployeeHandler(useCases.createEmployee))
        .use(listEmployeesHandler(useCases.listEmployees))
        .use(findEmployeeByIdHandler(useCases.findEmployeeById))
        .use(changeEmployeeRoleHandler(useCases.changeEmployeeRole)),
  );
