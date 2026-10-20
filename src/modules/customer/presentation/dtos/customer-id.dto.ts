import { t } from 'elysia';

// Id malformado para na borda (400) em vez de virar erro de cast no Postgres.
export const CustomerIdParamsSchema = t.Object({
  id: t.String({ format: 'uuid', error: 'Id de cliente inválido.' }),
});
