import { t } from 'elysia';

export const AssignMechanicRequestSchema = t.Object(
  {
    mechanicId: t.String({
      format: 'uuid',
      error: 'Id de funcionário inválido.',
      description: 'Id do Employee com papel MECHANIC',
    }),
  },
  { additionalProperties: false },
);
