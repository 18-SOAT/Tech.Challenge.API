import { t } from 'elysia';

// Campos repetidos entre os DTOs da OS: mesma regra e mesma mensagem.
export const ServiceOrderFields = {
  quantity: t.Integer({
    minimum: 1,
    error: 'Informe a quantidade (inteiro maior que zero).',
    examples: [1],
  }),
  description: t.Optional(
    t.Union([t.String({ maxLength: 500 }), t.Null()], {
      error: 'Descrição inválida (até 500 caracteres).',
      description: 'O que o cliente relatou ou o que será feito',
      examples: ['Barulho ao frear'],
    }),
  ),
};
