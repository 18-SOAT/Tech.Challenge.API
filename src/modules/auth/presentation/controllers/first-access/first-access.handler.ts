import { Elysia, t } from 'elysia';
import {
  ApiError,
  Envelope,
  ok,
} from '../../../../../shared/presentation/http/envelope.js';
import type { RequestFirstAccessUseCase } from '../../../application/use-cases/request-first-access.use-case.js';
import { FirstAccessRequestSchema } from '../../dtos/access-link.dto.js';

// 202 sempre (com ou sem cadastro): o envio do e-mail segue em segundo plano e a
// resposta não revela se o CPF/CNPJ é de um cliente.
export const firstAccessHandler = (
  requestFirstAccess: RequestFirstAccessUseCase,
) =>
  new Elysia().post(
    '/first-access',
    async ({ body }) => {
      await requestFirstAccess.execute(body);
      return ok(null, 202);
    },
    {
      body: FirstAccessRequestSchema,
      response: { 202: Envelope(t.Null()), 400: ApiError },
      detail: {
        summary: 'Solicita o primeiro acesso do cliente cadastrado no balcão',
        description:
          'Se houver cliente sem login com esse CPF/CNPJ, envia ao e-mail cadastrado pela oficina um link para definir a senha. A resposta é sempre 202, com ou sem cadastro. 400: CPF/CNPJ inválido.',
      },
    },
  );
