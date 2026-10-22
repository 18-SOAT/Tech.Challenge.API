import type { Order } from '../entities/order.entity.js';
import type { ServiceOrder } from '../entities/service-order.entity.js';
import { ProgressStage } from '../enums/progress-stage.enum.js';
import { ServiceOrderStatus } from '../enums/service-order-status.enum.js';

// Com várias OS na Ordem, o cliente vê a fase mais urgente: primeiro o que depende
// dele (aprovar), depois o que está em andamento. Sem nenhuma, tudo terminou.
const ORDER_PRIORITY: readonly ProgressStage[] = [
  ProgressStage.AWAITING_APPROVAL,
  ProgressStage.IN_EXECUTION,
  ProgressStage.IN_DIAGNOSIS,
  ProgressStage.RECEIVED,
];

// Andamento (read model "Consultar andamento"): traduz os dois agregados para os
// status do enunciado. Função pura do domínio — a regra fica num lugar só e a
// apresentação só põe o rótulo.
export const OrderProgress = {
  // "Recebida" é a OS que ainda espera um mecânico: sem isso, ela seria instantânea,
  // porque a OS já nasce em diagnóstico.
  ofServiceOrder(serviceOrder: ServiceOrder): ProgressStage {
    switch (serviceOrder.statusValue) {
      case ServiceOrderStatus.IN_DIAGNOSIS:
        return serviceOrder.assigneeIdValue
          ? ProgressStage.IN_DIAGNOSIS
          : ProgressStage.RECEIVED;
      case ServiceOrderStatus.AWAITING_APPROVAL:
        return ProgressStage.AWAITING_APPROVAL;
      case ServiceOrderStatus.IN_EXECUTION:
        return ProgressStage.IN_EXECUTION;
      case ServiceOrderStatus.FINISHED:
        return ProgressStage.FINISHED;
      case ServiceOrderStatus.REJECTED:
        return ProgressStage.REJECTED;
    }
  },

  // Entregue vence tudo; senão a fase mais urgente das OS; com todas encerradas
  // (finalizadas ou rejeitadas), "Finalizada": o veículo aguarda a retirada.
  ofOrder(order: Order, serviceOrders: readonly ServiceOrder[]): ProgressStage {
    if (order.isDelivered) return ProgressStage.DELIVERED;
    const stages = new Set(serviceOrders.map(OrderProgress.ofServiceOrder));
    if (stages.size === 0) return ProgressStage.RECEIVED;
    return (
      ORDER_PRIORITY.find((stage) => stages.has(stage)) ??
      ProgressStage.FINISHED
    );
  },
};
