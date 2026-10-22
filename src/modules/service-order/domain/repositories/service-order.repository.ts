import type { ServiceOrder } from '../entities/service-order.entity.js';

export interface ServiceOrderRepository {
  // Reparo adicional: nova OS numa Ordem que já existe (OS + 1ª linha do histórico).
  create(serviceOrder: ServiceOrder): Promise<void>;
  findById(id: string): Promise<ServiceOrder | null>;
  // Grava o agregado inteiro numa transação: status e responsável, itens
  // sincronizados (incluídos, alterados e removidos) e só as linhas novas do
  // histórico (append-only).
  save(serviceOrder: ServiceOrder): Promise<void>;
}
