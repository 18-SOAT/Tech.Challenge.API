import { t } from 'elysia';
import type { AuthTokenPayload } from '../../../../shared/infrastructure/jwt/token-service.port.js';
import { EmployeeRole } from '../../../employee/domain/enums/employee-role.enum.js';
import { UserType } from '../../../user/domain/enums/user-type.enum.js';

// Mesmos dados que vão no JWT, com `sub` exposto como `id`. Whitelist explícita.
export class AuthenticatedUserResponseDto {
  private constructor(
    readonly id: string,
    readonly email: string,
    readonly type: UserType,
    readonly customerId?: string,
    readonly employeeId?: string,
    readonly role?: EmployeeRole,
  ) {}

  static fromClaims(claims: AuthTokenPayload): AuthenticatedUserResponseDto {
    return claims.type === UserType.CUSTOMER
      ? new AuthenticatedUserResponseDto(
          claims.sub,
          claims.email,
          claims.type,
          claims.customerId,
        )
      : new AuthenticatedUserResponseDto(
          claims.sub,
          claims.email,
          claims.type,
          undefined,
          claims.employeeId,
          claims.role,
        );
  }
}

// customerId só pra CUSTOMER; employeeId/role só pra EMPLOYEE.
export const AuthenticatedUserSchema = t.Object(
  {
    id: t.String({ description: 'Id do User (claim `sub` do token)' }),
    email: t.String({ format: 'email' }),
    type: t.Enum(UserType),
    customerId: t.Optional(t.String()),
    employeeId: t.Optional(t.String()),
    role: t.Optional(t.Enum(EmployeeRole)),
  },
  { title: 'AuthenticatedUser' },
);
