import { IdGenerator } from '../../../../shared/domain/id-generator.js';
import { Money } from '../../../../shared/domain/value-objects/money.vo.js';
import { ServiceError } from '../errors/service.error.js';

// Item do catálogo de mão de obra. A OS (#11) copia o preço no momento em que o
// serviço entra (snapshot): mudar o preço aqui não altera orçamento já feito.
export class Service {
  private constructor(
    private readonly id: string,
    private name: string,
    private description: string | null,
    private price: Money,
    private estimatedDurationMinutes: number | null,
    private active: boolean,
  ) {}

  static create(input: {
    name: string;
    description?: string | null;
    price: Money;
    estimatedDurationMinutes?: number | null;
  }): Service {
    return new Service(
      IdGenerator.generate(),
      Service.validName(input.name),
      Service.normalizeDescription(input.description ?? null),
      input.price,
      Service.validDuration(input.estimatedDurationMinutes ?? null),
      true,
    );
  }

  static restore(props: {
    id: string;
    name: string;
    description: string | null;
    price: number;
    estimatedDurationMinutes: number | null;
    active: boolean;
  }): Service {
    return new Service(
      props.id,
      props.name,
      props.description,
      Money.fromReais(props.price),
      props.estimatedDurationMinutes,
      props.active,
    );
  }

  // `undefined` mantém o valor atual; `null` limpa os campos opcionais.
  update(changes: {
    name?: string;
    description?: string | null;
    price?: Money;
    estimatedDurationMinutes?: number | null;
  }): void {
    // Valida tudo antes de mutar: um campo inválido não deixa o serviço pela metade.
    const name =
      changes.name === undefined ? this.name : Service.validName(changes.name);
    const description =
      changes.description === undefined
        ? this.description
        : Service.normalizeDescription(changes.description);
    const estimatedDurationMinutes =
      changes.estimatedDurationMinutes === undefined
        ? this.estimatedDurationMinutes
        : Service.validDuration(changes.estimatedDurationMinutes);

    this.name = name;
    this.description = description;
    this.price = changes.price ?? this.price;
    this.estimatedDurationMinutes = estimatedDurationMinutes;
  }

  // Inativo continua existindo (as OS antigas apontam para ele), mas não entra
  // em orçamento novo — quem barra é o ServiceOrder.addService() da #11.
  deactivate(): void {
    this.active = false;
  }

  activate(): void {
    this.active = true;
  }

  private static validName(raw: string): string {
    const name = raw.trim();
    if (!name) throw ServiceError.invalidName();
    return name;
  }

  private static normalizeDescription(raw: string | null): string | null {
    return raw?.trim() || null;
  }

  private static validDuration(minutes: number | null): number | null {
    if (minutes !== null && (!Number.isInteger(minutes) || minutes <= 0)) {
      throw ServiceError.invalidEstimatedDuration();
    }
    return minutes;
  }

  get idValue(): string {
    return this.id;
  }

  get nameValue(): string {
    return this.name;
  }

  get descriptionValue(): string | null {
    return this.description;
  }

  get priceValue(): Money {
    return this.price;
  }

  get estimatedDurationMinutesValue(): number | null {
    return this.estimatedDurationMinutes;
  }

  get isActive(): boolean {
    return this.active;
  }
}
