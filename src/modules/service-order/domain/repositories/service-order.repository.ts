import type {
  Page,
  PageRequest,
} from '../../../../shared/domain/pagination.js';
import type { ServiceOrder } from '../entities/service-order.entity.js';
import type { ServiceOrderStatus } from '../enums/service-order-status.enum.js';

// Filtros opcionais da listagem de OS. O período é o da criação da OS; o cliente é
// o da Ordem (a OS referencia a Ordem pelo ID).
export interface ServiceOrderFilter extends PageRequest {
  status?: ServiceOrderStatus;
  assigneeId?: string;
  customerId?: string;
  createdFrom?: Date;
  createdTo?: Date;
}

// Fila de OS: só as abertas, na ordem de SERVICE_ORDER_QUEUE_PRIORITY e, dentro do
// status, pela chegada da Ordem (mais antiga primeiro).
export interface ServiceOrderQueueFilter extends PageRequest {
  assigneeId?: string;
}

// OS finalizadas para o tempo médio. O período é o da finalização (FINISHED no
// histórico); `serviceId` restringe às OS que contêm o serviço.
export interface FinishedServiceOrderFilter {
  finishedFrom?: Date;
  finishedTo?: Date;
  serviceId?: string;
}

export interface ServiceOrderRepository {
  // Reparo adicional: nova OS numa Ordem que já existe (OS + 1ª linha do histórico).
  // Lança OrderError.alreadyDelivered se a Ordem foi entregue na corrida.
  create(serviceOrder: ServiceOrder): Promise<void>;
  findById(id: string): Promise<ServiceOrder | null>;
  // OS da Ordem, da mais antiga para a mais nova.
  findByOrderId(orderId: string): Promise<ServiceOrder[]>;
  // Listagem administrativa, da mais nova para a mais antiga.
  findMany(filter: ServiceOrderFilter): Promise<Page<ServiceOrder>>;
  findQueue(filter: ServiceOrderQueueFilter): Promise<Page<ServiceOrder>>;
  findFinished(filter: FinishedServiceOrderFilter): Promise<ServiceOrder[]>;
  // Grava o agregado inteiro numa transação: status e responsável, itens
  // sincronizados (incluídos, alterados e removidos) e só as linhas novas do
  // histórico (append-only). Lock otimista: só grava se o status no banco ainda
  // é o `loadedStatus` da entity; senão lança ServiceOrderError.concurrentUpdate.
  save(serviceOrder: ServiceOrder): Promise<void>;
}
