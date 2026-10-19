import type {
  Page,
  PageRequest,
} from '../../../../shared/domain/pagination.js';
import type { Customer } from '../entities/customer.entity.js';

// Filtros opcionais da listagem: `document` exato (só dígitos), `name` parcial.
export interface CustomerFilter extends PageRequest {
  document?: string;
  name?: string;
}

export interface CustomerRepository {
  findById(id: string): Promise<Customer | null>;
  findByDocument(document: string): Promise<Customer | null>;
  findByUserId(userId: string): Promise<Customer | null>;
  findMany(filter: CustomerFilter): Promise<Page<Customer>>;
  // Insere ou atualiza: o use case não precisa saber se o registro já existe.
  save(customer: Customer): Promise<void>;
  // Lança CustomerError.hasDependencies se houver veículo ou OS vinculados.
  delete(customer: Customer): Promise<void>;
}
