import type { ServiceOrder } from '../entities/service-order.entity.js';

export interface ServiceOrderRepository {
  // Reparo adicional: nova OS numa Ordem que já existe (OS + 1ª linha do histórico).
  // Lança OrderError.alreadyDelivered se a Ordem foi entregue na corrida.
  create(serviceOrder: ServiceOrder): Promise<void>;
  findById(id: string): Promise<ServiceOrder | null>;
  // OS da Ordem, da mais antiga para a mais nova.
  findByOrderId(orderId: string): Promise<ServiceOrder[]>;
  // Grava o agregado inteiro numa transação: status e responsável, itens
  // sincronizados (incluídos, alterados e removidos) e só as linhas novas do
  // histórico (append-only). Lock otimista: só grava se o status no banco ainda
  // é o `loadedStatus` da entity; senão lança ServiceOrderError.concurrentUpdate.
  save(serviceOrder: ServiceOrder): Promise<void>;
}
