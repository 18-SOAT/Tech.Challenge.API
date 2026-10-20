import { type TSchema, t } from 'elysia';
import type { Page, PageRequest } from '../../domain/pagination.js';

// Campos de paginação de toda listagem (body do QUERY). Espalhe no t.Object do
// módulo junto com os filtros: `t.Object({ ...PaginationFields, plate: ... })`.
export const PaginationFields = {
  page: t.Integer({
    minimum: 1,
    default: 1,
    error: 'A página deve ser um inteiro a partir de 1.',
  }),
  limit: t.Integer({
    minimum: 1,
    maximum: 100,
    default: 20,
    error: 'O limite deve ser um inteiro entre 1 e 100.',
  }),
};

// Resposta paginada: { items, total, page, limit }.
export const PageSchema = <T extends TSchema>(item: T, title: string) =>
  t.Object(
    {
      items: t.Array(item),
      total: t.Integer({ description: 'Total de itens que atendem ao filtro' }),
      page: t.Integer(),
      limit: t.Integer(),
    },
    { title },
  );

// Monta o corpo da resposta a partir do Page do repository e do pedido original.
export const pageResponse = <E, D>(
  result: Page<E>,
  request: PageRequest,
  toDto: (entity: E) => D,
) => ({
  items: result.items.map(toDto),
  total: result.total,
  page: request.page,
  limit: request.limit,
});
