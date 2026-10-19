import { Elysia } from 'elysia';
import {
  ApiError,
  Envelope,
  ok,
} from '../../../../../shared/presentation/http/envelope.js';
import type { CreateVehicleUseCase } from '../../../application/use-cases/create-vehicle.use-case.js';
import { CreateVehicleRequestSchema } from '../../dtos/create-vehicle.dto.js';
import {
  VehicleResponseDto,
  VehicleResponseSchema,
} from '../../dtos/vehicle.response.dto.js';

export const createVehicleHandler = (createVehicle: CreateVehicleUseCase) =>
  new Elysia().post(
    '/',
    async ({ body }) =>
      ok(VehicleResponseDto.fromEntity(await createVehicle.execute(body)), 201),
    {
      body: CreateVehicleRequestSchema,
      response: {
        201: Envelope(VehicleResponseSchema),
        400: ApiError,
        401: ApiError,
        403: ApiError,
        404: ApiError,
        409: ApiError,
      },
      detail: {
        summary: 'Cadastra um veículo de um cliente',
        description:
          '400: dados inválidos (placa, marca, modelo, ano). 404: cliente não encontrado. 409: placa já cadastrada.',
      },
    },
  );
