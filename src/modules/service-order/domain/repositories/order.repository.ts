import type {
  Page,
  PageRequest,
} from '../../../../shared/domain/pagination.js';
import type { Order } from '../entities/order.entity.js';
import type { OrderStatus } from '../enums/order-status.enum.js';

// Filtros opcionais da listagem de Ordens; o período é o da chegada do veículo.
export interface OrderFilter extends PageRequest {
  status?: OrderStatus;
  customerId?: string;
  vehicleId?: string;
  receivedFrom?: Date;
  receivedTo?: Date;
}

export interface OrderRepository {
  findById(id: string): Promise<Order | null>;
  // Ordem não entregue do veículo: ele só pode estar na oficina uma vez por vez.
  hasOpenForVehicle(vehicleId: string): Promise<boolean>;
  // Ordens do cliente, da mais recente para a mais antiga.
  findByCustomer(customerId: string): Promise<Order[]>;
  // Listagem administrativa, da mais recente para a mais antiga.
  findMany(filter: OrderFilter): Promise<Page<Order>>;
}
