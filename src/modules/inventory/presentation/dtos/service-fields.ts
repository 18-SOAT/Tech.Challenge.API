import { t } from 'elysia';

// Campos compartilhados por cadastro e alteração. Formato na borda; regras de
// negócio (nome não vazio após trim, 2 casas no preço) na entity e no VO Money.
export const ServiceFields = {
  name: t.String({
    minLength: 1,
    maxLength: 120,
    error: 'Informe o nome do serviço (até 120 caracteres).',
    examples: ['Troca de óleo'],
  }),
  description: t.Union(
    [t.String({ maxLength: 500, examples: ['Óleo 5W30 e filtro'] }), t.Null()],
    { error: 'Descrição inválida (até 500 caracteres, ou null para remover).' },
  ),
  // Teto do Decimal(10,2) do banco.
  price: t.Number({
    minimum: 0,
    maximum: 99_999_999.99,
    error: 'Informe o preço em reais (a partir de 0).',
    description: 'Reais, até 2 casas decimais',
    examples: [89.9],
  }),
  estimatedDurationMinutes: t.Union(
    [t.Integer({ minimum: 1, examples: [30] }), t.Null()],
    {
      error:
        'Duração estimada inválida (inteiro de minutos maior que zero, ou null para remover).',
      description: 'Minutos de mão de obra',
    },
  ),
};
