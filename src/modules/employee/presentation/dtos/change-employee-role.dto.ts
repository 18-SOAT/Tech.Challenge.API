import { t } from 'elysia';
import { EmployeeFields } from './employee-fields.js';

export const ChangeEmployeeRoleRequestSchema = t.Object(
  { role: EmployeeFields.role },
  { additionalProperties: false },
);
