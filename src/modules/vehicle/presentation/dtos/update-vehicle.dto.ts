import { t } from 'elysia';
import { VehicleFields } from './vehicle-fields.js';

// Alteração parcial. O `customerId` não está aqui: troca de dono não é desta operação.
export const UpdateVehicleRequestSchema = t.Object(
  {
    plate: t.Optional(VehicleFields.plate),
    brand: t.Optional(VehicleFields.brand),
    model: t.Optional(VehicleFields.model),
    year: t.Optional(VehicleFields.year),
  },
  {
    additionalProperties: false,
    minProperties: 1,
    error: 'Informe ao menos um campo para alterar.',
  },
);
