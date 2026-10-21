import { randomBytes } from 'node:crypto';
import type { UseCase } from '../../../../shared/application/use-case.interface.js';
import { Email } from '../../../../shared/domain/value-objects/email.vo.js';
import type { AccessLinkTokenService } from '../../../../shared/infrastructure/jwt/access-link-token.port.js';
import type { AccessLinkMailer } from '../../../auth/domain/ports/access-link.mailer.js';
import { User } from '../../../user/domain/entities/user.entity.js';
import { UserType } from '../../../user/domain/enums/user-type.enum.js';
import { UserError } from '../../../user/domain/errors/user.error.js';
import type { PasswordHasher } from '../../../user/domain/ports/password-hasher.port.js';
import type { UserRepository } from '../../../user/domain/repositories/user.repository.js';
import { Employee } from '../../domain/entities/employee.entity.js';
import type { EmployeeRole } from '../../domain/enums/employee-role.enum.js';
import type { EmployeeRegistrationRepository } from '../../domain/ports/employee-registration.repository.js';

export interface CreateEmployeeInput {
  name: string;
  email: string;
  role: EmployeeRole;
}

// "Cadastrar funcionário" → "Funcionário cadastrado" ⟶ envia o link de acesso.
// O ADMIN não escolhe a senha de ninguém: o User nasce com uma senha aleatória que
// ninguém conhece, e o link (o mesmo da redefinição, preso ao carimbo dessa senha)
// leva ao POST /auth/set-password. Definida a senha, o carimbo muda e o link morre.
export class CreateEmployeeUseCase
  implements UseCase<CreateEmployeeInput, Employee>
{
  constructor(
    private readonly userRepository: UserRepository,
    private readonly registrationRepository: EmployeeRegistrationRepository,
    private readonly passwordHasher: PasswordHasher,
    private readonly accessLinkTokens: AccessLinkTokenService,
    private readonly mailer: AccessLinkMailer,
  ) {}

  async execute(input: CreateEmployeeInput): Promise<Employee> {
    const email = Email.create(input.email);
    if (await this.userRepository.findByEmail(email.value)) {
      throw UserError.emailAlreadyInUse();
    }

    // 32 bytes aleatórios: impossível de adivinhar e nunca sai daqui — só o hash é gravado.
    const unusablePassword = randomBytes(32).toString('base64url');
    const user = User.create({
      email,
      hashedPassword: await this.passwordHasher.hash(unusablePassword),
      type: UserType.EMPLOYEE,
    });
    const employee = Employee.create({
      userId: user.idValue,
      name: input.name,
      email,
      role: input.role,
    });

    await this.registrationRepository.register(user, employee);

    // Depois do commit e fire-and-forget: SMTP fora do ar não desfaz o cadastro.
    // Sem o e-mail, o funcionário pede outro link em POST /auth/password-reset.
    void this.sendLink(user, employee).catch((error) =>
      console.error('[CreateEmployee] falha ao enviar link', error),
    );
    return employee;
  }

  private async sendLink(user: User, employee: Employee): Promise<void> {
    const token = await this.accessLinkTokens.sign({
      kind: 'password-reset',
      userId: user.idValue,
      passwordStamp: user.passwordStamp,
    });
    await this.mailer.sendEmployeeAccessLink({
      to: employee.emailValue,
      employeeName: employee.nameValue,
      token,
    });
  }
}
