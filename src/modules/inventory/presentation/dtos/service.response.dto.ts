import { t } from 'elysia';
import type { Service } from '../../domain/entities/service.entity.js';

export class ServiceResponseDto {
  private constructor(
    readonly id: string,
    readonly name: string,
    readonly description: string | null,
    readonly price: number,
    readonly estimatedDurationMinutes: number | null,
    readonly active: boolean,
  ) {}

  static fromEntity(service: Service): ServiceResponseDto {
    return new ServiceResponseDto(
      service.idValue,
      service.nameValue,
      service.descriptionValue,
      service.priceValue.value,
      service.estimatedDurationMinutesValue,
      service.isActive,
    );
  }
}

export const ServiceResponseSchema = t.Object(
  {
    id: t.String({ format: 'uuid', description: 'Id do Service (UUID v7)' }),
    name: t.String({ examples: ['Troca de óleo'] }),
    description: t.Nullable(t.String({ examples: ['Óleo 5W30 e filtro'] })),
    price: t.Number({ description: 'Reais', examples: [89.9] }),
    estimatedDurationMinutes: t.Nullable(t.Integer({ examples: [30] })),
    active: t.Boolean({
      description: 'Inativo não entra em orçamento novo',
    }),
  },
  { title: 'Service' },
);
