import type { UseCase } from '../../../../shared/application/use-case.interface.js';
import { Email } from '../../../../shared/domain/value-objects/email.vo.js';
import type { AccessLinkTokenService } from '../../../../shared/infrastructure/jwt/access-link-token.port.js';
import type { User } from '../../../user/domain/entities/user.entity.js';
import type { UserRepository } from '../../../user/domain/repositories/user.repository.js';
import type { AccessLinkMailer } from '../../domain/ports/access-link.mailer.js';

export interface RequestPasswordResetInput {
  email: string;
}

// Redefinição de senha: mesmo fluxo do primeiro acesso, a partir do e-mail de login.
// Resposta sempre igual, pelo mesmo motivo (não revelar quem tem conta).
export class RequestPasswordResetUseCase
  implements UseCase<RequestPasswordResetInput, void>
{
  constructor(
    private readonly userRepository: UserRepository,
    private readonly accessLinkTokens: AccessLinkTokenService,
    private readonly mailer: AccessLinkMailer,
  ) {}

  async execute(input: RequestPasswordResetInput): Promise<void> {
    const email = Email.create(input.email);
    const user = await this.userRepository.findByEmail(email.value);
    if (!user?.isActive) return;

    // Fire-and-forget: ver RequestFirstAccessUseCase.
    void this.sendLink(user).catch((error) =>
      console.error('[RequestPasswordReset] falha ao enviar link', error),
    );
  }

  private async sendLink(user: User): Promise<void> {
    const token = await this.accessLinkTokens.sign({
      kind: 'password-reset',
      userId: user.idValue,
      passwordStamp: user.passwordStamp,
    });
    await this.mailer.sendPasswordResetLink({ to: user.emailValue, token });
  }
}
