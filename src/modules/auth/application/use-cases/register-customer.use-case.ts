import type { UseCase } from '../../../../shared/application/use-case.interface.js';
import { Email } from '../../../../shared/domain/value-objects/email.vo.js';
import { Customer } from '../../../customer/domain/entities/customer.entity.js';
import { CustomerError } from '../../../customer/domain/errors/customer.error.js';
import type { CustomerRepository } from '../../../customer/domain/repositories/customer.repository.js';
import { Document } from '../../../customer/domain/value-objects/document.vo.js';
import { Phone } from '../../../customer/domain/value-objects/phone.vo.js';
import { User } from '../../../user/domain/entities/user.entity.js';
import { UserType } from '../../../user/domain/enums/user-type.enum.js';
import { UserError } from '../../../user/domain/errors/user.error.js';
import type { PasswordHasher } from '../../../user/domain/ports/password-hasher.port.js';
import type { UserRepository } from '../../../user/domain/repositories/user.repository.js';
import { Password } from '../../../user/domain/value-objects/password.vo.js';
import type { CustomerRegistrationRepository } from '../../domain/ports/customer-registration.repository.js';

export interface RegisterCustomerInput {
  email: string;
  password: string;
  document: string;
  phone: string;
}

export class RegisterCustomerUseCase
  implements UseCase<RegisterCustomerInput, User>
{
  constructor(
    private readonly userRepository: UserRepository,
    private readonly customerRepository: CustomerRepository,
    private readonly registrationRepository: CustomerRegistrationRepository,
    private readonly passwordHasher: PasswordHasher,
  ) {}

  async execute(input: RegisterCustomerInput): Promise<User> {
    // Os VOs lançam o DomainError do próprio módulo (SharedError, UserError,
    // CustomerError) — o errorHandler converte em 400.
    const email = Email.create(input.email);
    const password = Password.create(input.password);
    const document = Document.create(input.document);
    const phone = Phone.create(input.phone);

    if (await this.userRepository.findByEmail(email.value)) {
      throw UserError.emailAlreadyInUse();
    }
    // Cliente cadastrado no balcão não se auto-cadastra: o caminho dele é o primeiro
    // acesso (POST /auth/first-access), que prova a posse do e-mail cadastrado.
    if (await this.customerRepository.findByDocument(document.value)) {
      throw CustomerError.documentAlreadyInUse();
    }

    const hashedPassword = await this.passwordHasher.hash(password.value);

    const user = User.create({
      email,
      hashedPassword,
      type: UserType.CUSTOMER,
    });

    const customer = Customer.create({
      userId: user.idValue,
      document,
      email,
      phone,
    });

    await this.registrationRepository.register(user, customer);
    return user;
  }
}
