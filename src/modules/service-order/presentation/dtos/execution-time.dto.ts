import { t } from 'elysia';
import type { ExecutionTimeView } from '../../application/use-cases/get-execution-time.use-case.js';
import type { ExecutionTimeAverage } from '../../domain/services/execution-time-report.js';
import { dateTimeFilter, uuidFilter } from './query-fields.js';

// Body do QUERY /service-orders/execution-time.
export const ExecutionTimeRequestSchema = t.Object(
  {
    finishedFrom: dateTimeFilter('OS finalizadas a partir de'),
    finishedTo: dateTimeFilter('OS finalizadas até'),
    serviceId: uuidFilter(
      'Só as OS que contêm este serviço do catálogo',
      'Id de serviço inválido.',
    ),
  },
  { additionalProperties: false },
);

// Minutos com 1 casa: é a unidade da duração estimada do catálogo.
const toMinutes = (ms: number) => Math.round(ms / 6_000) / 10;

const average = (row: ExecutionTimeAverage) => ({
  averageMinutes: toMinutes(row.averageMs),
  count: row.count,
});

export const toExecutionTimeResponse = (view: ExecutionTimeView) => ({
  global: average(view.global),
  byService: view.byService.map((row) => ({
    serviceId: row.serviceId,
    name: row.service?.nameValue ?? null,
    estimatedDurationMinutes:
      row.service?.estimatedDurationMinutesValue ?? null,
    ...average(row),
  })),
});

const averageFields = {
  averageMinutes: t.Number({
    description: 'Média de IN_EXECUTION → FINISHED, em minutos',
    examples: [72.5],
  }),
  count: t.Integer({ description: 'OS finalizadas na média', examples: [8] }),
};

export const ExecutionTimeResponseSchema = t.Object(
  {
    global: t.Object(averageFields),
    byService: t.Array(
      t.Object({
        serviceId: t.String({ format: 'uuid' }),
        name: t.Nullable(t.String({ description: 'null: serviço excluído' })),
        estimatedDurationMinutes: t.Nullable(
          t.Integer({ description: 'Duração estimada no catálogo' }),
        ),
        ...averageFields,
      }),
    ),
  },
  { title: 'ExecutionTime' },
);
