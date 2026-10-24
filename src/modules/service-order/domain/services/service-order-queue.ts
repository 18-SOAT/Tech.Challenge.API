import { ServiceOrderStatus } from '../enums/service-order-status.enum.js';

// Fila de OS (read model): o que o mecânico faz primeiro. A OS já aprovada vem na
// frente, porque o cliente disse "sim" e está esperando; depois o orçamento que
// aguarda o cliente e, por fim, o diagnóstico. Dentro do mesmo status, a Ordem que
// chegou antes. OS terminais (FINISHED, REJECTED) ficam fora.
// É o contrário do ORDER_PRIORITY do andamento (order-progress.ts): lá o cliente vê
// primeiro o que depende dele (aprovar).
export const SERVICE_ORDER_QUEUE_PRIORITY: readonly ServiceOrderStatus[] = [
  ServiceOrderStatus.IN_EXECUTION,
  ServiceOrderStatus.AWAITING_APPROVAL,
  ServiceOrderStatus.IN_DIAGNOSIS,
];
