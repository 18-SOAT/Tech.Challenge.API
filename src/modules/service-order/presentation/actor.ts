import type { AuthTokenPayload } from '../../../shared/infrastructure/jwt/token-service.port.js';
import { AuthError } from '../../auth/domain/errors/auth.error.js';
import { UserType } from '../../user/domain/enums/user-type.enum.js';
import type { ServiceOrderActor } from '../domain/entities/service-order.entity.js';

// Claims do token → ator da OS. O guard já barrou quem não é funcionário; o
// estreitamento aqui é o que dá ao TypeScript o `employeeId` e o `role`.
export function toActor(user: AuthTokenPayload): ServiceOrderActor {
  if (user.type !== UserType.EMPLOYEE) throw AuthError.forbidden();
  return { employeeId: user.employeeId, role: user.role };
}
