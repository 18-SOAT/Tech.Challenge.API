import { t } from 'elysia';

// Id malformado para na borda (400) em vez de virar erro de cast no Postgres.
export const ServiceOrderIdParamsSchema = t.Object({
  id: t.String({ format: 'uuid', error: 'Id de OS inválido.' }),
});

export const ServiceOrderItemParamsSchema = t.Object({
  id: t.String({ format: 'uuid', error: 'Id de OS inválido.' }),
  itemId: t.String({ format: 'uuid', error: 'Id de item inválido.' }),
});

export const OrderIdParamsSchema = t.Object({
  id: t.String({ format: 'uuid', error: 'Id de ordem inválido.' }),
});
