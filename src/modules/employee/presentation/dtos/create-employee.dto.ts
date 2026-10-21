import { t } from 'elysia';
import { EmployeeFields } from './employee-fields.js';

// Sem senha de propósito: o funcionário define a dele pelo link enviado ao e-mail.
export const CreateEmployeeRequestSchema = t.Object(
  {
    name: t.String({
      minLength: 1,
      maxLength: 120,
      error: 'Informe o nome do funcionário (até 120 caracteres).',
      examples: ['Maria Souza'],
    }),
    email: t.String({
      format: 'email',
      error: 'E-mail inválido.',
      description: 'Vira o login; recebe o link para definir a senha',
      examples: ['maria@oficina.com'],
    }),
    role: EmployeeFields.role,
  },
  { additionalProperties: false },
);
