import { t } from 'elysia';
import { ServiceOrderFields } from './service-order-fields.js';

// O atendente identifica o cliente pelo documento e o veículo pela placa, como no
// balcão — sem precisar saber ids internos.
export const OpenOrderRequestSchema = t.Object(
  {
    document: t.String({
      minLength: 1,
      error: 'Informe o CPF ou CNPJ do cliente.',
      description: 'CPF ou CNPJ, com ou sem pontuação',
      examples: ['529.982.247-25'],
    }),
    plate: t.String({
      minLength: 1,
      error: 'Informe a placa do veículo.',
      description: 'Padrão antigo ou Mercosul, com ou sem hífen',
      examples: ['ABC1D23'],
    }),
    notes: t.Optional(
      t.Union([t.String({ maxLength: 500 }), t.Null()], {
        error: 'Observação inválida (até 500 caracteres).',
        description: 'Observações da chegada do veículo',
        examples: ['Cliente relata barulho na suspensão'],
      }),
    ),
    description: ServiceOrderFields.description,
    services: t.Optional(
      t.Array(
        t.Object(
          {
            serviceId: t.String({
              format: 'uuid',
              error: 'Id de serviço inválido.',
            }),
            quantity: ServiceOrderFields.quantity,
          },
          { additionalProperties: false },
        ),
        {
          maxItems: 50,
          description:
            'Serviços solicitados pelo cliente; o mecânico completa no diagnóstico',
        },
      ),
    ),
  },
  { additionalProperties: false },
);

export const OpenAdditionalServiceOrderRequestSchema = t.Object(
  { description: ServiceOrderFields.description },
  { additionalProperties: false },
);
