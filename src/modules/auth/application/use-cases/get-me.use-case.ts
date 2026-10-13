import type { UseCase } from '../../../../shared/application/use-case.interface.js';
import type { AuthTokenPayload } from '../../../../shared/infrastructure/jwt/token-service.port.js';
import type { UserRepository } from '../../../user/domain/repositories/user.repository.js';
import { AuthError } from '../../domain/errors/auth.error.js';
import type { AuthClaimsResolver } from '../services/auth-claims.resolver.js';

// Relê do banco em vez de só ecoar o token: reflete desativação ou troca de role
// feitas depois da emissão (o token só "atualiza" quando expira).
export class GetMeUseCase implements UseCase<string, AuthTokenPayload> {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly authClaimsResolver: AuthClaimsResolver,
  ) {}

  async execute(userId: string): Promise<AuthTokenPayload> {
    const user = await this.userRepository.findById(userId);
    const claims = user?.isActive
      ? await this.authClaimsResolver.resolve(user)
      : null;
    if (!claims) {
      throw AuthError.userUnavailable();
    }
    return claims;
  }
}
