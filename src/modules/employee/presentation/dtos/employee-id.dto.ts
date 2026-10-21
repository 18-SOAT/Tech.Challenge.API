import { t } from 'elysia';

// Id malformado para na borda (400) em vez de virar erro de cast no Postgres.
export const EmployeeIdParamsSchema = t.Object({
  id: t.String({ format: 'uuid', error: 'Id de funcionário inválido.' }),
});
