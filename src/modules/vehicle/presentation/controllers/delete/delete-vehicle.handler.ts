import { Elysia, t } from 'elysia';
import {
  ApiError,
  Envelope,
  ok,
} from '../../../../../shared/presentation/http/envelope.js';
import type { DeleteVehicleUseCase } from '../../../application/use-cases/delete-vehicle.use-case.js';
import { VehicleIdParamsSchema } from '../../dtos/vehicle-id.dto.js';

// 200 com `data: null` (e não 204): mantém o envelope em toda resposta da API.
export const deleteVehicleHandler = (deleteVehicle: DeleteVehicleUseCase) =>
  new Elysia().delete(
    '/:id',
    async ({ params }) => {
      await deleteVehicle.execute(params.id);
      return ok(null);
    },
    {
      params: VehicleIdParamsSchema,
      response: {
        200: Envelope(t.Null()),
        400: ApiError,
        401: ApiError,
        403: ApiError,
        404: ApiError,
        409: ApiError,
      },
      detail: {
        summary: 'Exclui um veículo',
        description:
          '404: veículo não encontrado. 409: veículo com ordens de serviço.',
      },
    },
  );
