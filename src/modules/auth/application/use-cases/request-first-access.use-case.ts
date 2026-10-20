import type { UseCase } from '../../../../shared/application/use-case.interface.js';
import type { AccessLinkTokenService } from '../../../../shared/infrastructure/jwt/access-link-token.port.js';
import type { Customer } from '../../../customer/domain/entities/customer.entity.js';
import type { CustomerRepository } from '../../../customer/domain/repositories/customer.repository.js';
import { Document } from '../../../customer/domain/value-objects/document.vo.js';
import type { AccessLinkMailer } from '../../domain/ports/access-link.mailer.js';

export interface RequestFirstAccessInput {
  document: string;
}

// "Primeiro acesso solicitado → Link de acesso enviado". A resposta é sempre a mesma:
// com ou sem cadastro, com ou sem login — não revela quais CPFs/CNPJs são clientes.
export class RequestFirstAccessUseCase
  implements UseCase<RequestFirstAccessInput, void>
{
  constructor(
    private readonly customerRepository: CustomerRepository,
    private readonly accessLinkTokens: AccessLinkTokenService,
    private readonly mailer: AccessLinkMailer,
  ) {}

  async execute(input: RequestFirstAccessInput): Promise<void> {
    const document = Document.create(input.document);
    const customer = await this.customerRepository.findByDocument(
      document.value,
    );
    if (!customer || customer.userIdValue !== null) return;

    // Fire-and-forget: esperar o SMTP deixaria a resposta mais lenta só quando o
    // cliente existe (enumeração por tempo), e uma falha de envio viraria 500.
    void this.sendLink(customer).catch((error) =>
      console.error('[RequestFirstAccess] falha ao enviar link', error),
    );
  }

  private async sendLink(customer: Customer): Promise<void> {
    const token = await this.accessLinkTokens.sign({
      kind: 'first-access',
      customerId: customer.idValue,
    });
    await this.mailer.sendFirstAccessLink({
      to: customer.emailValue,
      customerName: customer.nameValue,
      token,
    });
  }
}
