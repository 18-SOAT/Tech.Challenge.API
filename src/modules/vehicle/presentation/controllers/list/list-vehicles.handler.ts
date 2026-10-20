import { Elysia } from 'elysia';
import {
  ApiError,
  Envelope,
  ok,
} from '../../../../../shared/presentation/http/envelope.js';
import { pageResponse } from '../../../../../shared/presentation/http/pagination.js';
import type { ListVehiclesUseCase } from '../../../application/use-cases/list-vehicles.use-case.js';
import {
  ListVehiclesRequestSchema,
  VehiclePageSchema,
} from '../../dtos/list-vehicles.dto.js';
import { VehicleResponseDto } from '../../dtos/vehicle.response.dto.js';

// QUERY: seguro e idempotente como o GET, com filtros no corpo (ver list-customers).
export const listVehiclesHandler = (listVehicles: ListVehiclesUseCase) =>
  new Elysia().route(
    'QUERY',
    '/',
    async ({ body }) =>
      ok(
        pageResponse(
          await listVehicles.execute(body),
          body,
          VehicleResponseDto.fromEntity,
        ),
      ),
    {
      body: ListVehiclesRequestSchema,
      response: {
        200: Envelope(VehiclePageSchema),
        400: ApiError,
        401: ApiError,
        403: ApiError,
      },
      detail: {
        summary: 'Lista veículos com paginação e filtros (método QUERY)',
        description:
          'Filtra pelos veículos de um cliente (customerId) e/ou pela placa. 400: filtro ou paginação inválidos.',
      },
    },
  );
