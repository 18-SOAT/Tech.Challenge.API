import { t } from 'elysia';
import { ServiceFields } from './service-fields.js';

// Alteração parcial. `active: false` desativa o serviço — a saída para o que já
// entrou em OS e por isso não pode ser excluído.
export const UpdateServiceRequestSchema = t.Object(
  {
    name: t.Optional(ServiceFields.name),
    description: t.Optional(ServiceFields.description),
    price: t.Optional(ServiceFields.price),
    estimatedDurationMinutes: t.Optional(
      ServiceFields.estimatedDurationMinutes,
    ),
    active: t.Optional(
      t.Boolean({
        error: 'O campo active deve ser true ou false.',
        description: 'false desativa: não entra em orçamento novo',
      }),
    ),
  },
  {
    additionalProperties: false,
    minProperties: 1,
    error: 'Informe ao menos um campo para alterar.',
  },
);
