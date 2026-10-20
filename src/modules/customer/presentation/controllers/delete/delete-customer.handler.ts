import { Elysia, t } from 'elysia';
import {
  ApiError,
  Envelope,
  ok,
} from '../../../../../shared/presentation/http/envelope.js';
import type { DeleteCustomerUseCase } from '../../../application/use-cases/delete-customer.use-case.js';
import { CustomerIdParamsSchema } from '../../dtos/customer-id.dto.js';

// 200 com `data: null` (e não 204): mantém o envelope em toda resposta da API.
export const deleteCustomerHandler = (deleteCustomer: DeleteCustomerUseCase) =>
  new Elysia().delete(
    '/:id',
    async ({ params }) => {
      await deleteCustomer.execute(params.id);
      return ok(null);
    },
    {
      params: CustomerIdParamsSchema,
      response: {
        200: Envelope(t.Null()),
        400: ApiError,
        401: ApiError,
        403: ApiError,
        404: ApiError,
        409: ApiError,
      },
      detail: {
        summary: 'Exclui um cliente',
        description:
          '404: cliente não encontrado. 409: cliente com login ativo, veículos ou ordens de serviço.',
      },
    },
  );
