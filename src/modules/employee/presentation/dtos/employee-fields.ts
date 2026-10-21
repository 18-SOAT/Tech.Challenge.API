import { t } from 'elysia';
import { EmployeeRole } from '../../domain/enums/employee-role.enum.js';

// Campos compartilhados entre cadastro, alteração de papel e filtro da listagem.
export const EmployeeFields = {
  role: t.Enum(EmployeeRole, {
    error: 'Papel inválido: use ADMIN ou MECHANIC.',
    description: 'ADMIN (atendimento e gestão) ou MECHANIC (execução das OS)',
  }),
};
