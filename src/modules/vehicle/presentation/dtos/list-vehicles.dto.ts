import { t } from 'elysia';
import {
  PageSchema,
  PaginationFields,
} from '../../../../shared/presentation/http/pagination.js';
import { VehicleResponseSchema } from './vehicle.response.dto.js';
import { VehicleFields } from './vehicle-fields.js';

// Body do QUERY /vehicles: os veículos de um cliente e/ou a busca por placa.
export const ListVehiclesRequestSchema = t.Object(
  {
    ...PaginationFields,
    customerId: t.Optional(
      t.String({ format: 'uuid', error: 'Id de cliente inválido.' }),
    ),
    plate: t.Optional(VehicleFields.plate),
  },
  { additionalProperties: false },
);

export const VehiclePageSchema = PageSchema(
  VehicleResponseSchema,
  'VehiclePage',
);
