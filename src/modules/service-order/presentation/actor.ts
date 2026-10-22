import type { AuthTokenPayload } from '../../../shared/infrastructure/jwt/token-service.port.js';
import { AuthError } from '../../auth/domain/errors/auth.error.js';
import { UserType } from '../../user/domain/enums/user-type.enum.js';
import type { QuoteDecider } from '../domain/entities/order.entity.js';
import type { ServiceOrderActor } from '../domain/entities/service-order.entity.js';

// Claims do token → ator da OS. O guard já barrou quem não é funcionário; o
// estreitamento aqui é o que dá ao TypeScript o `employeeId` e o `role`.
export function toActor(user: AuthTokenPayload): ServiceOrderActor {
  if (user.type !== UserType.EMPLOYEE) throw AuthError.forbidden();
  return { employeeId: user.employeeId, role: user.role };
}

// Claims do token → quem decide o orçamento. Aqui o cliente também entra: se ele é
// o dono da Ordem quem confere é a Order.assertQuoteCanBeDecidedBy().
export function toQuoteDecider(user: AuthTokenPayload): QuoteDecider {
  return user.type === UserType.CUSTOMER
    ? { customerId: user.customerId }
    : { employeeId: user.employeeId, role: user.role };
}

// Rotas /me: só o cliente tem "minhas ordens"; o funcionário recebe 403.
export function toCustomerId(user: AuthTokenPayload): string {
  if (user.type !== UserType.CUSTOMER) throw AuthError.forbidden();
  return user.customerId;
}
