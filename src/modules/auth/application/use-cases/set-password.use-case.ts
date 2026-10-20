import type { UseCase } from '../../../../shared/application/use-case.interface.js';
import { Email } from '../../../../shared/domain/value-objects/email.vo.js';
import type {
  AccessLinkPayload,
  AccessLinkTokenService,
} from '../../../../shared/infrastructure/jwt/access-link-token.port.js';
import type { CustomerRepository } from '../../../customer/domain/repositories/customer.repository.js';
import { User } from '../../../user/domain/entities/user.entity.js';
import { UserType } from '../../../user/domain/enums/user-type.enum.js';
import { UserError } from '../../../user/domain/errors/user.error.js';
import type { PasswordHasher } from '../../../user/domain/ports/password-hasher.port.js';
import type { UserRepository } from '../../../user/domain/repositories/user.repository.js';
import { Password } from '../../../user/domain/value-objects/password.vo.js';
import { AuthError } from '../../domain/errors/auth.error.js';
import type { CustomerAccessActivationRepository } from '../../domain/ports/customer-access-activation.repository.js';

export interface SetPasswordInput {
  token: string;
  password: string;
}

// "Definir senha" pelo link → "Acesso ativado". Serve ao primeiro acesso (cria o User
// e liga ao Customer) e à redefinição (troca a senha do User). O link vale uma vez:
// depois de usado, o cliente já tem login / a senha já não bate com o carimbo.
export class SetPasswordUseCase implements UseCase<SetPasswordInput, void> {
  constructor(
    private readonly accessLinkTokens: AccessLinkTokenService,
    private readonly customerRepository: CustomerRepository,
    private readonly userRepository: UserRepository,
    private readonly activationRepository: CustomerAccessActivationRepository,
    private readonly passwordHasher: PasswordHasher,
  ) {}

  async execute(input: SetPasswordInput): Promise<void> {
    const password = Password.create(input.password);
    const link = await this.verifyLink(input.token);

    if (link.kind === 'first-access') {
      await this.activateCustomer(link.customerId, password);
    } else {
      await this.resetPassword(link.userId, link.passwordStamp, password);
    }
  }

  // Qualquer falha do token (assinatura, validade, audiência, formato) vira o mesmo
  // erro de domínio — o motivo exato não é exposto.
  private async verifyLink(token: string): Promise<AccessLinkPayload> {
    try {
      return await this.accessLinkTokens.verify(token);
    } catch {
      throw AuthError.accessLinkInvalid();
    }
  }

  private async activateCustomer(
    customerId: string,
    password: Password,
  ): Promise<void> {
    const customer = await this.customerRepository.findById(customerId);
    if (!customer || customer.userIdValue !== null) {
      throw AuthError.accessLinkInvalid();
    }

    // O login usa o e-mail que a oficina cadastrou: quem recebeu o link prova a posse dele.
    const email = Email.create(customer.emailValue);
    if (await this.userRepository.findByEmail(email.value)) {
      throw UserError.emailAlreadyInUse();
    }

    const user = User.create({
      email,
      hashedPassword: await this.passwordHasher.hash(password.value),
      type: UserType.CUSTOMER,
    });
    customer.linkUser(user.idValue);
    await this.activationRepository.activate(user, customer);
  }

  private async resetPassword(
    userId: string,
    passwordStamp: string,
    password: Password,
  ): Promise<void> {
    const user = await this.userRepository.findById(userId);
    if (!user?.isActive || user.passwordStamp !== passwordStamp) {
      throw AuthError.accessLinkInvalid();
    }

    const previousHashedPassword = user.hashedPassword;
    user.changePassword(await this.passwordHasher.hash(password.value));
    const replaced = await this.userRepository.replacePassword(
      user,
      previousHashedPassword,
    );
    if (!replaced) throw AuthError.accessLinkInvalid();
  }
}
