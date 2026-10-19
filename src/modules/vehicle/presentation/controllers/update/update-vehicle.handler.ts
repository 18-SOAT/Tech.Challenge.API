import { Elysia } from 'elysia';
import {
  ApiError,
  Envelope,
  ok,
} from '../../../../../shared/presentation/http/envelope.js';
import type { UpdateVehicleUseCase } from '../../../application/use-cases/update-vehicle.use-case.js';
import { UpdateVehicleRequestSchema } from '../../dtos/update-vehicle.dto.js';
import {
  VehicleResponseDto,
  VehicleResponseSchema,
} from '../../dtos/vehicle.response.dto.js';
import { VehicleIdParamsSchema } from '../../dtos/vehicle-id.dto.js';

export const updateVehicleHandler = (updateVehicle: UpdateVehicleUseCase) =>
  new Elysia().patch(
    '/:id',
    async ({ params, body }) =>
      ok(
        VehicleResponseDto.fromEntity(
          await updateVehicle.execute({ id: params.id, ...body }),
        ),
      ),
    {
      params: VehicleIdParamsSchema,
      body: UpdateVehicleRequestSchema,
      response: {
        200: Envelope(VehicleResponseSchema),
        400: ApiError,
        401: ApiError,
        403: ApiError,
        404: ApiError,
        409: ApiError,
      },
      detail: {
        summary: 'Altera placa, marca, modelo e/ou ano de um veículo',
        description:
          'Só os campos enviados mudam; o dono (customerId) não muda. A placa pode ser corrigida ou convertida para Mercosul. 400: dados inválidos. 404: veículo não encontrado. 409: placa de outro veículo.',
      },
    },
  );
