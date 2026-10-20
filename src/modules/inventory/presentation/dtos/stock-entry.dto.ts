import { t } from 'elysia';

export const StockEntryRequestSchema = t.Object(
  {
    quantity: t.Integer({
      minimum: 1,
      error: 'Informe a quantidade recebida (inteiro maior que zero).',
      description: 'Unidades que entraram no estoque',
      examples: [10],
    }),
    reason: t.Optional(
      t.Union([t.String({ maxLength: 255 }), t.Null()], {
        error: 'Observação inválida (até 255 caracteres).',
        description: 'Opcional: nota fiscal, fornecedor...',
        examples: ['NF 4512'],
      }),
    ),
  },
  { additionalProperties: false },
);
