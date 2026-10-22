import { t } from 'elysia';
import type { OrderProgressView } from '../../application/use-cases/my-orders.js';
import { ProgressStage } from '../../domain/enums/progress-stage.enum.js';

// Rótulo do enunciado para cada estágio (e para as linhas do histórico, que usam
// os mesmos nomes do ServiceOrderStatus).
const LABELS: Record<string, string> = {
  [ProgressStage.RECEIVED]: 'Recebida',
  [ProgressStage.IN_DIAGNOSIS]: 'Em diagnóstico',
  [ProgressStage.AWAITING_APPROVAL]: 'Aguardando aprovação',
  [ProgressStage.IN_EXECUTION]: 'Em execução',
  [ProgressStage.FINISHED]: 'Finalizada',
  [ProgressStage.DELIVERED]: 'Entregue',
  [ProgressStage.REJECTED]: 'Orçamento rejeitado',
};
const label = (status: string): string => LABELS[status] ?? status;

// Visão do cliente: sem ids de funcionário nem de catálogo — só o que ele precisa
// para acompanhar e decidir o orçamento.
export const toMyOrderResponse = (view: OrderProgressView) => ({
  id: view.order.idValue,
  number: view.order.numberValue,
  status: view.stage,
  statusLabel: label(view.stage),
  receivedAt: view.order.receivedAtValue.toISOString(),
  deliveredAt: view.order.deliveredAtValue?.toISOString() ?? null,
  vehicle: view.vehicle && {
    plate: view.vehicle.plateValue,
    brand: view.vehicle.brandValue,
    model: view.vehicle.modelValue,
    year: view.vehicle.yearValue,
  },
  serviceOrders: view.serviceOrders.map(({ serviceOrder, stage, lines }) => ({
    id: serviceOrder.idValue,
    description: serviceOrder.descriptionValue,
    status: stage,
    statusLabel: label(stage),
    total: serviceOrder.total.value,
    approvedAmount: serviceOrder.approvedAmountValue?.value ?? null,
    ...(lines && {
      items: lines.map((line) => ({
        name: line.name,
        quantity: line.quantity,
        unitPrice: line.unitPrice.value,
        subtotal: line.subtotal.value,
      })),
    }),
    history: serviceOrder.historyValue.map((row) => ({
      status: row.statusValue,
      statusLabel: label(row.statusValue),
      changedAt: row.changedAtValue.toISOString(),
    })),
  })),
});

const stageFields = {
  status: t.Enum(ProgressStage, {
    description: 'Status do enunciado, calculado a partir da Ordem e das OS',
  }),
  statusLabel: t.String({ examples: ['Em execução'] }),
};

export const MyOrderResponseSchema = t.Object(
  {
    id: t.String({ format: 'uuid' }),
    number: t.Nullable(t.Integer({ examples: [42] })),
    ...stageFields,
    receivedAt: t.String({ format: 'date-time' }),
    deliveredAt: t.Nullable(t.String({ format: 'date-time' })),
    vehicle: t.Nullable(
      t.Object({
        plate: t.String({ examples: ['ABC1D23'] }),
        brand: t.String(),
        model: t.String(),
        year: t.Integer(),
      }),
    ),
    serviceOrders: t.Array(
      t.Object({
        id: t.String({ format: 'uuid' }),
        description: t.Nullable(t.String()),
        ...stageFields,
        total: t.Number({ description: 'Orçamento', examples: [160.9] }),
        approvedAmount: t.Nullable(
          t.Number({ description: 'Valor congelado na aprovação' }),
        ),
        items: t.Optional(
          t.Array(
            t.Object({
              name: t.String({ examples: ['Troca de óleo'] }),
              quantity: t.Integer(),
              unitPrice: t.Number(),
              subtotal: t.Number(),
            }),
            { description: 'Só no detalhe da ordem' },
          ),
        ),
        history: t.Array(
          t.Object({
            status: t.String(),
            statusLabel: t.String(),
            changedAt: t.String({ format: 'date-time' }),
          }),
        ),
      }),
    ),
  },
  { title: 'MyOrder' },
);
