import { t } from 'elysia';
import type { Customer } from '../../domain/entities/customer.entity.js';

// Whitelist: o `userId` (vínculo interno com o login) não sai; só se o acesso existe.
export class CustomerResponseDto {
  private constructor(
    readonly id: string,
    readonly name: string | null,
    readonly document: string,
    readonly email: string,
    readonly phone: string | null,
    readonly hasAccess: boolean,
  ) {}

  static fromEntity(customer: Customer): CustomerResponseDto {
    return new CustomerResponseDto(
      customer.idValue,
      customer.nameValue,
      customer.documentValue,
      customer.emailValue,
      customer.phoneValue,
      customer.userIdValue !== null,
    );
  }
}

export const CustomerResponseSchema = t.Object(
  {
    id: t.String({ format: 'uuid', description: 'Id do Customer (UUID v7)' }),
    name: t.Nullable(t.String({ examples: ['João Silva'] })),
    document: t.String({
      description: 'CPF ou CNPJ, só dígitos',
      examples: ['52998224725'],
    }),
    email: t.String({ format: 'email' }),
    phone: t.Nullable(t.String({ examples: ['11987654321'] })),
    hasAccess: t.Boolean({
      description:
        'Se o cliente já tem login (auto-cadastro ou primeiro acesso)',
    }),
  },
  { title: 'Customer' },
);
