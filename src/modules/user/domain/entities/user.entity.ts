import { createHash } from 'node:crypto';
import { IdGenerator } from '../../../../shared/domain/id-generator.js';
import { Email } from '../../../../shared/domain/value-objects/email.vo.js';
import type { UserType } from '../enums/user-type.enum.js';
import type { PasswordHasher } from '../ports/password-hasher.port.js';

export class User {
  private constructor(
    private readonly id: string,
    private readonly email: Email,
    private passwordHash: string,
    private readonly type: UserType,
    private readonly active: boolean,
  ) {}

  static create(input: {
    email: Email;
    hashedPassword: string;
    type: UserType;
  }): User {
    return new User(
      IdGenerator.generate(),
      input.email,
      input.hashedPassword,
      input.type,
      true,
    );
  }

  static restore(props: {
    id: string;
    email: string;
    hashedPassword: string;
    type: UserType;
    active: boolean;
  }): User {
    return new User(
      props.id,
      Email.create(props.email),
      props.hashedPassword,
      props.type,
      props.active,
    );
  }

  // O hasher entra como parâmetro (port do domain): a entity decide QUANDO comparar,
  // o adapter (bcrypt) decide COMO — sem lib de infraestrutura dentro do domain.
  verifyPassword(
    plainTextPassword: string,
    hasher: PasswordHasher,
  ): Promise<boolean> {
    return hasher.compare(plainTextPassword, this.passwordHash);
  }

  // Recebe o hash pronto pelo mesmo motivo do verifyPassword: a entity decide QUANDO
  // trocar, o hasher decide COMO. Trocar a senha também invalida o passwordStamp.
  changePassword(newHashedPassword: string): void {
    this.passwordHash = newHashedPassword;
  }

  // Carimbo da senha atual, levado no link de redefinição: o link só vale enquanto a
  // senha for a mesma — é o que faz ele valer UMA vez sem guardar o token no banco.
  // Derivado do hash (que já tem salt) e truncado: o JWT é legível, o hash não vai cru.
  get passwordStamp(): string {
    return createHash('sha256')
      .update(this.passwordHash)
      .digest('base64url')
      .slice(0, 22);
  }

  get idValue(): string {
    return this.id;
  }

  get emailValue(): string {
    return this.email.value;
  }

  get emailCanonical(): string {
    return this.email.canonical;
  }

  get typeValue(): UserType {
    return this.type;
  }

  get isActive(): boolean {
    return this.active;
  }

  // Só pro Mapper persistir. O nome explícito deixa óbvio que não vai em Response DTO.
  get hashedPassword(): string {
    return this.passwordHash;
  }
}
