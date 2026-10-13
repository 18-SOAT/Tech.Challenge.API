import type { Customer } from '../entities/customer.entity.js';

export interface CustomerRepository {
  findByDocument(document: string): Promise<Customer | null>;
  findByUserId(userId: string): Promise<Customer | null>;
}
