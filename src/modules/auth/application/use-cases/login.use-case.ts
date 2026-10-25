import type { UseCase } from '../../../../shared/application/use-case.interface.js';
import { Email } from '../../../../shared/domain/value-objects/email.vo.js';
import type {
  AuthTokenPayload,
  TokenService,
} from '../../../../shared/infrastructure/jwt/token-service.port.js';
import type { PasswordHasher } from '../../../user/domain/ports/password-hasher.port.js';
import type { UserRepository } from '../../../user/domain/repositories/user.repository.js';
import { AuthError } from '../../domain/errors/auth.error.js';
import type { AuthClaimsResolver } from '../services/auth-claims.resolver.js';

export interface LoginInput {
  email: string;
  password: string;
}

export interface LoginOutput {
  accessToken: string;
  user: AuthTokenPayload;
}

// Força bruta é barrada antes daqui, pelo rate limit da rota (por IP e por e-mail:
// ver shared/presentation/http/rate-limit.plugin.ts) — é infra HTTP, não regra do login.
export class LoginUseCase implements UseCase<LoginInput, LoginOutput> {
  // Hash descartável pra comparar quando o e-mail não existe (ver execute).
  private dummyHash?: Promise<string>;

  constructor(
    private readonly userRepository: UserRepository,
    private readonly passwordHasher: PasswordHasher,
    private readonly tokenService: TokenService,
    private readonly authClaimsResolver: AuthClaimsResolver,
  ) {}

  async execute(input: LoginInput): Promise<LoginOutput> {
    // Qualquer alias da mesma caixa acha o login (e-mail canônico). E-mail
    // malformado segue o caminho de "não existe": mesmo 401, mesmo custo.
    const email = this.parseEmail(input.email);
    const user = email ? await this.userRepository.findByEmail(email) : null;

    if (!user) {
      // Mesmo custo de um login com e-mail válido: sem isso, a resposta mais rápida
      // denunciaria quais e-mails estão cadastrados (enumeração por timing).
      await this.passwordHasher.compare(
        input.password,
        await this.getDummyHash(),
      );
      throw AuthError.invalidCredentials();
    }

    const passwordMatches = await user.verifyPassword(
      input.password,
      this.passwordHasher,
    );
    if (!passwordMatches || !user.isActive) {
      throw AuthError.invalidCredentials();
    }

    const claims = await this.authClaimsResolver.resolve(user);
    if (!claims) {
      throw AuthError.invalidCredentials();
    }

    const accessToken = await this.tokenService.sign(claims);
    return { accessToken, user: claims };
  }

  private parseEmail(raw: string): Email | null {
    try {
      return Email.create(raw);
    } catch {
      return null;
    }
  }

  private getDummyHash(): Promise<string> {
    this.dummyHash ??= this.passwordHasher.hash('dummy-password-for-timing');
    return this.dummyHash;
  }
}
