import { IdGenerator } from '../../../../shared/domain/id-generator.js';
import { Email } from '../../../../shared/domain/value-objects/email.vo.js';
import { CustomerError } from '../errors/customer.error.js';
import { Document } from '../value-objects/document.vo.js';
import { Phone } from '../value-objects/phone.vo.js';

export class Customer {
  private constructor(
    private readonly id: string,
    private userId: string | null,
    private name: string | null,
    private readonly document: Document,
    private email: Email,
    private phone: Phone | null,
  ) {}

  // Mesmo evento ("Cliente cadastrado") nos dois caminhos: no balcão chega com nome e
  // sem login; no auto-cadastro chega com login e o nome fica pra depois.
  static create(input: {
    document: Document;
    email: Email;
    name?: string | null;
    phone?: Phone | null;
    userId?: string | null;
  }): Customer {
    return new Customer(
      IdGenerator.generate(),
      input.userId ?? null,
      input.name == null ? null : Customer.validName(input.name),
      input.document,
      input.email,
      input.phone ?? null,
    );
  }

  static restore(props: {
    id: string;
    userId: string | null;
    name: string | null;
    document: string;
    email: string;
    phone: string | null;
  }): Customer {
    return new Customer(
      props.id,
      props.userId,
      props.name,
      Document.create(props.document),
      Email.create(props.email),
      props.phone ? Phone.create(props.phone) : null,
    );
  }

  // `undefined` mantém o valor atual; `phone: null` remove o telefone. O documento
  // não muda: é a identidade natural do cliente (OS e primeiro acesso usam ele).
  update(changes: {
    name?: string;
    email?: Email;
    phone?: Phone | null;
  }): void {
    if (changes.name !== undefined)
      this.name = Customer.validName(changes.name);
    if (changes.email !== undefined) this.email = changes.email;
    if (changes.phone !== undefined) this.phone = changes.phone;
  }

  // Primeiro acesso: liga o login criado pelo link ao cliente cadastrado no balcão.
  // Um cliente tem no máximo um login.
  linkUser(userId: string): void {
    if (this.userId !== null) throw CustomerError.alreadyHasAccess();
    this.userId = userId;
  }

  // Excluir quem tem login deixaria um User CUSTOMER sem perfil — o login quebraria.
  // Veículos/OS vinculados são checados pela FK no adapter (dependem de outras tabelas).
  assertCanBeRemoved(): void {
    if (this.userId !== null) throw CustomerError.hasLinkedAccess();
  }

  private static validName(raw: string): string {
    const name = raw.trim();
    if (!name) throw CustomerError.invalidName();
    return name;
  }

  get idValue(): string {
    return this.id;
  }

  get userIdValue(): string | null {
    return this.userId;
  }

  get nameValue(): string | null {
    return this.name;
  }

  get documentValue(): string {
    return this.document.value;
  }

  get emailValue(): string {
    return this.email.value;
  }

  get phoneValue(): string | null {
    return this.phone?.value ?? null;
  }
}
