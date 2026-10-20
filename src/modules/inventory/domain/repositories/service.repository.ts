import type {
  Page,
  PageRequest,
} from '../../../../shared/domain/pagination.js';
import type { Service } from '../entities/service.entity.js';

// Filtros opcionais da listagem: `name` é busca parcial sem diferenciar maiúscula;
// `active` separa o catálogo vigente dos desativados.
export interface ServiceFilter extends PageRequest {
  name?: string;
  active?: boolean;
}

export interface ServiceRepository {
  findById(id: string): Promise<Service | null>;
  // Comparação sem diferenciar maiúscula: "Troca de óleo" e "troca de óleo" são o mesmo item.
  findByName(name: string): Promise<Service | null>;
  findMany(filter: ServiceFilter): Promise<Page<Service>>;
  // Insere ou atualiza. Lança ServiceError.nameAlreadyInUse em corrida de nome.
  save(service: Service): Promise<void>;
  // Lança ServiceError.inUse se o serviço já entrou em alguma OS.
  delete(service: Service): Promise<void>;
}
