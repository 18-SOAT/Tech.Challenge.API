import { t } from 'elysia';

// Limite de período das consultas: ISO 8601 validado na borda (400). O handler
// converte com `toDate` antes do use case, que só conhece Date.
export const dateTimeFilter = (description: string) =>
  t.Optional(
    t.String({
      format: 'date-time',
      error: 'Data inválida (use ISO 8601, ex: 2026-10-01T00:00:00Z).',
      description,
      examples: ['2026-10-01T00:00:00Z'],
    }),
  );

export const uuidFilter = (description: string, error: string) =>
  t.Optional(t.String({ format: 'uuid', error, description }));

export const toDate = (value?: string): Date | undefined =>
  value === undefined ? undefined : new Date(value);
