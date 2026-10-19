import { Elysia } from 'elysia';
import {
  ApiError,
  Envelope,
  ok,
} from '../../../../../../shared/presentation/http/envelope.js';
import type { FindVehicleByIdUseCase } from '../../../../application/use-cases/find-vehicle-by-id.use-case.js';
import {
  VehicleResponseDto,
  VehicleResponseSchema,
} from '../../../dtos/vehicle.response.dto.js';
import { VehicleIdParamsSchema } from '../../../dtos/vehicle-id.dto.js';

export const findVehicleByIdHandler = (
  findVehicleById: FindVehicleByIdUseCase,
) =>
  new Elysia().get(
    '/:id',
    async ({ params }) =>
      ok(
        VehicleResponseDto.fromEntity(await findVehicleById.execute(params.id)),
      ),
    {
      params: VehicleIdParamsSchema,
      response: {
        200: Envelope(VehicleResponseSchema),
        400: ApiError,
        401: ApiError,
        403: ApiError,
        404: ApiError,
      },
      detail: { summary: 'Detalha um veículo' },
    },
  );
