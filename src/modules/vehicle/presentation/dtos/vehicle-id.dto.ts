import { t } from 'elysia';

// Id malformado para na borda (400) em vez de virar erro de cast no Postgres.
export const VehicleIdParamsSchema = t.Object({
  id: t.String({ format: 'uuid', error: 'Id de veículo inválido.' }),
});
