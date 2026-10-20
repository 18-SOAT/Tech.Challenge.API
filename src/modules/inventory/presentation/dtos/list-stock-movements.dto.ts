import { t } from 'elysia';
import {
  PageSchema,
  PaginationFields,
} from '../../../../shared/presentation/http/pagination.js';
import { StockMovementResponseSchema } from './stock-movement.response.dto.js';

export const ListStockMovementsRequestSchema = t.Object(
  { ...PaginationFields },
  { additionalProperties: false },
);

export const StockMovementPageSchema = PageSchema(
  StockMovementResponseSchema,
  'StockMovementPage',
);
