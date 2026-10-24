import { t } from 'elysia';
import type { OrderDetail } from '../../application/use-cases/find-order-by-id.use-case.js';
import { ProgressStage } from '../../domain/enums/progress-stage.enum.js';
import { OrderResponseDto, OrderResponseSchema } from './order.response.dto.js';
import {
  ServiceOrderResponseDto,
  ServiceOrderResponseSchema,
} from './service-order.response.dto.js';

// Detalhe da Ordem para a equipe: a Ordem, o andamento, os totais e as OS completas.
export const toOrderDetailResponse = (detail: OrderDetail) => ({
  ...OrderResponseDto.fromEntity(detail.order),
  stage: detail.stage,
  quotedTotal: detail.quotedTotal.value,
  approvedTotal: detail.approvedTotal.value,
  serviceOrders: detail.serviceOrders.map(ServiceOrderResponseDto.fromEntity),
});

export const OrderDetailResponseSchema = t.Object(
  {
    ...OrderResponseSchema.properties,
    stage: t.Enum(ProgressStage, {
      description: 'Andamento: status do enunciado calculado a partir das OS',
    }),
    quotedTotal: t.Number({
      description: 'Soma dos orçamentos de todas as OS, inclusive rejeitadas',
      examples: [250.8],
    }),
    approvedTotal: t.Number({
      description: 'Soma dos valores congelados nas aprovações',
      examples: [160.9],
    }),
    serviceOrders: t.Array(ServiceOrderResponseSchema),
  },
  { title: 'OrderDetail' },
);
