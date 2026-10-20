import type { User } from '../entities/user.entity.js';

export interface UserRepository {
  findById(id: string): Promise<User | null>;
  findByEmail(email: string): Promise<User | null>;
  // Grava a senha nova só se a do banco ainda for `previousHashedPassword` (update
  // condicional): dois usos simultâneos do mesmo link não trocam a senha duas vezes.
  // Devolve false quando a condição não bateu.
  replacePassword(user: User, previousHashedPassword: string): Promise<boolean>;
}
