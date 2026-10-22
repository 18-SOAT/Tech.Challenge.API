import { Elysia } from 'elysia';
import type { AuthPlugin } from '../../../../../shared/presentation/auth/auth.plugin.js';
import {
  ApiError,
  Envelope,
  ok,
} from '../../../../../shared/presentation/http/envelope.js';
import type { OpenOrderUseCase } from '../../../application/use-cases/open-order.use-case.js';
import { toActor } from '../../actor.js';
import { OpenOrderRequestSchema } from '../../dtos/open-order.dto.js';
import {
  OpenOrderResponseSchema,
  openOrderResponse,
} from '../../dtos/order.response.dto.js';

export const openOrderHandler = (
  openOrder: OpenOrderUseCase,
  auth: AuthPlugin,
) =>
  new Elysia().use(auth).post(
    '/',
    async ({ body, user }) => {
      const { order, serviceOrder } = await openOrder.execute({
        ...body,
        openedById: toActor(user).employeeId,
      });
      return ok(openOrderResponse(order, serviceOrder), 201);
    },
    {
      auth: true,
      body: OpenOrderRequestSchema,
      response: {
        201: Envelope(OpenOrderResponseSchema),
        400: ApiError,
        401: ApiError,
        403: ApiError,
        404: ApiError,
        409: ApiError,
        422: ApiError,
      },
      detail: {
        summary: 'Abre a ordem do veículo e a primeira OS',
        description:
          'Identifica o cliente pelo CPF/CNPJ e o veículo pela placa; cria a Ordem (RECEIVED) e a OS (IN_DIAGNOSIS) com os serviços solicitados, numa transação. 400: documento, placa ou dados inválidos. 404: cliente, veículo ou serviço não encontrado. 409: o veículo já tem ordem aberta, ou serviço inativo. 422: o veículo não é desse cliente.',
      },
    },
  );
