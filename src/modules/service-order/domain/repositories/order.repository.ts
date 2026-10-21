import type { Order } from '../entities/order.entity.js';

export interface OrderRepository {
  findById(id: string): Promise<Order | null>;
  // Ordem não entregue do veículo: ele só pode estar na oficina uma vez por vez.
  hasOpenForVehicle(vehicleId: string): Promise<boolean>;
}
