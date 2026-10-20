import { t } from 'elysia';
import {
  PageSchema,
  PaginationFields,
} from '../../../../shared/presentation/http/pagination.js';
import { EmployeeResponseSchema } from './employee.response.dto.js';
import { EmployeeFields } from './employee-fields.js';

// Body do QUERY /employees. `role: MECHANIC` é a lista de onde se atribui a OS.
export const ListEmployeesRequestSchema = t.Object(
  {
    ...PaginationFields,
    role: t.Optional(EmployeeFields.role),
    name: t.Optional(
      t.String({
        minLength: 1,
        maxLength: 120,
        error: 'O filtro de nome deve ter entre 1 e 120 caracteres.',
        description: 'Parte do nome, sem diferenciar maiúsculas',
        examples: ['souza'],
      }),
    ),
  },
  { additionalProperties: false },
);

export const EmployeePageSchema = PageSchema(
  EmployeeResponseSchema,
  'EmployeePage',
);
