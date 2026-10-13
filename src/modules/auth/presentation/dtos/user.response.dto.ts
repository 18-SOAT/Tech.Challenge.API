import { t } from 'elysia';
import type { User } from '../../../user/domain/entities/user.entity.js';
import { UserType } from '../../../user/domain/enums/user-type.enum.js';

// Whitelist: só o que é seguro expor. `hashedPassword` nunca entra aqui.
export class UserResponseDto {
  constructor(
    readonly id: string,
    readonly email: string,
    readonly type: UserType,
  ) {}

  static fromEntity(user: User): UserResponseDto {
    return new UserResponseDto(user.idValue, user.emailValue, user.typeValue);
  }
}

// Contrato documentado (OpenAPI) e validado da resposta — alinhado com o DTO acima.
export const UserResponseSchema = t.Object(
  {
    id: t.String({ description: 'Id do User (UUID v7)' }),
    email: t.String({ format: 'email' }),
    type: t.Enum(UserType),
  },
  { title: 'User' },
);
