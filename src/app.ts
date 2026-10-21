import { openapi } from '@elysia/openapi';
import { Elysia } from 'elysia';
import pkg from '../package.json' with { type: 'json' };
import type { AuthUseCases } from './modules/auth/auth.container.js';
import { authRoutes } from './modules/auth/presentation/index.js';
import type { CustomerUseCases } from './modules/customer/customer.container.js';
import { customerRoutes } from './modules/customer/presentation/index.js';
import type { EmployeeUseCases } from './modules/employee/employee.container.js';
import { employeeRoutes } from './modules/employee/presentation/index.js';
import type { InventoryUseCases } from './modules/inventory/inventory.container.js';
import {
  productRoutes,
  serviceRoutes,
} from './modules/inventory/presentation/index.js';
import {
  orderRoutes,
  serviceOrderRoutes,
} from './modules/service-order/presentation/index.js';
import type { ServiceOrderUseCases } from './modules/service-order/service-order.container.js';
import { vehicleRoutes } from './modules/vehicle/presentation/index.js';
import type { VehicleUseCases } from './modules/vehicle/vehicle.container.js';
import type { DatabaseHealthCheck } from './shared/infrastructure/health/database-health.port.js';
import type { TokenService } from './shared/infrastructure/jwt/token-service.port.js';
import { authPlugin } from './shared/presentation/auth/auth.plugin.js';
import { healthHandler } from './shared/presentation/health/health.handler.js';
import { errorHandler } from './shared/presentation/http/error-handler.plugin.js';
import './shared/presentation/http/formats.js';

export interface AppDeps {
  tokenService: TokenService;
  databaseHealth: DatabaseHealthCheck;
  auth: AuthUseCases;
  customers: CustomerUseCases;
  vehicles: VehicleUseCases;
  inventory: InventoryUseCases;
  employees: EmployeeUseCases;
  serviceOrders: ServiceOrderUseCases;
}

// Monta a aplicação sem subir servidor: o server.ts passa os containers reais e o
// e2e passa fakes (sem banco). Ordem importa — hooks só valem pras rotas
// registradas depois deles: errorHandler primeiro, depois docs, depois as rotas.
export function createApp(deps: AppDeps) {
  const auth = authPlugin(deps.tokenService);

  return new Elysia()
    .use(errorHandler)
    .use(
      openapi({
        documentation: {
          info: {
            title: 'Tech Challenge API — Oficina Mecânica',
            version: pkg.version,
            description:
              'Sistema integrado de atendimento e execução de serviços. Toda resposta segue o envelope { data, message, status }.',
          },
          tags: [
            {
              name: 'Health',
              description: 'Disponibilidade da API e do banco',
            },
            {
              name: 'Auth',
              description:
                'Cadastro de cliente, login, primeiro acesso e redefinição de senha por link enviado ao e-mail, e usuário autenticado',
            },
            {
              name: 'Employees',
              description:
                'Equipe da oficina: cadastro com link de acesso e papel (ADMIN)',
            },
            {
              name: 'Customers',
              description: 'Gestão de clientes pelo atendente (ADMIN)',
            },
            {
              name: 'Vehicles',
              description:
                'Veículos dos clientes, com validação de placa (ADMIN)',
            },
            {
              name: 'Services',
              description:
                'Catálogo de serviços: escrita pelo ADMIN, consulta também pelo MECHANIC',
            },
            {
              name: 'Products',
              description:
                'Peças e insumos com estoque por movimentação: escrita pelo ADMIN, consulta também pelo MECHANIC',
            },
            {
              name: 'Service Orders',
              description:
                'Ordem (estadia do veículo) e OS: abertura e atribuição pelo ADMIN; itens e diagnóstico pelo mecânico responsável ou ADMIN',
            },
          ],
          components: {
            securitySchemes: {
              bearerAuth: {
                type: 'http',
                scheme: 'bearer',
                bearerFormat: 'JWT',
              },
            },
          },
        },
      }),
    )
    .use(auth)
    .use(healthHandler(deps.databaseHealth))
    .use(authRoutes(deps.auth, auth))
    .use(employeeRoutes(deps.employees, auth))
    .use(customerRoutes(deps.customers, auth))
    .use(vehicleRoutes(deps.vehicles, auth))
    .use(serviceRoutes(deps.inventory, auth))
    .use(productRoutes(deps.inventory, auth))
    .use(orderRoutes(deps.serviceOrders, auth))
    .use(serviceOrderRoutes(deps.serviceOrders, auth));
}

export type App = ReturnType<typeof createApp>;
