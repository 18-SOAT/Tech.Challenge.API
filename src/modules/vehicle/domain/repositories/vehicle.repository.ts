import type {
  Page,
  PageRequest,
} from '../../../../shared/domain/pagination.js';
import type { Vehicle } from '../entities/vehicle.entity.js';

// Filtros opcionais da listagem: `customerId` e `plate` (forma canônica), ambos exatos.
export interface VehicleFilter extends PageRequest {
  customerId?: string;
  plate?: string;
}

export interface VehicleRepository {
  findById(id: string): Promise<Vehicle | null>;
  findByPlate(plate: string): Promise<Vehicle | null>;
  findMany(filter: VehicleFilter): Promise<Page<Vehicle>>;
  // Insere ou atualiza. Lança CustomerError.notFound se o cliente não existir mais
  // e VehicleError.licensePlateAlreadyInUse em corrida de placa.
  save(vehicle: Vehicle): Promise<void>;
  // Lança VehicleError.hasServiceOrders se houver ordem vinculada.
  delete(vehicle: Vehicle): Promise<void>;
}
