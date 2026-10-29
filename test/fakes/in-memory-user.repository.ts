import type { User } from '../../src/modules/user/domain/entities/user.entity.js';
import type { UserRepository } from '../../src/modules/user/domain/repositories/user.repository.js';
import type { Email } from '../../src/shared/domain/value-objects/email.vo.js';

export class InMemoryUserRepository implements UserRepository {
  readonly items: User[] = [];

  async findById(id: string): Promise<User | null> {
    return this.items.find((user) => user.idValue === id) ?? null;
  }

  async findByEmail(email: Email): Promise<User | null> {
    return (
      this.items.find((user) => user.emailCanonical === email.canonical) ?? null
    );
  }

  // O update condicional do adapter Prisma protege contra corrida entre requisições;
  // aqui (thread única) basta gravar. A chave simula a condição não bater.
  rejectNextReplace = false;

  async replacePassword(user: User): Promise<boolean> {
    const index = this.items.findIndex((u) => u.idValue === user.idValue);
    if (index === -1 || this.rejectNextReplace) {
      this.rejectNextReplace = false;
      return false;
    }
    this.items[index] = user;
    return true;
  }
}
