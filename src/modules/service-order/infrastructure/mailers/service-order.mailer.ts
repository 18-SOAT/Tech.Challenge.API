import type { Money } from '../../../../shared/domain/value-objects/money.vo.js';
import type { EmailSender } from '../../../../shared/infrastructure/email/email-sender.port.js';
import type {
  QuoteLine,
  ServiceOrderMailer,
} from '../../domain/ports/service-order.mailer.js';

const brl = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
});
const format = (money: Money) => brl.format(money.value);

// E-mails da OS (padrão catalog: um método por tipo de e-mail).
export class ServiceOrderEmailMailer implements ServiceOrderMailer {
  constructor(private readonly emailSender: EmailSender) {}

  async sendQuote(params: {
    to: string;
    customerName: string | null;
    orderNumber: number;
    serviceOrderId: string;
    lines: QuoteLine[];
    total: Money;
  }): Promise<void> {
    const greeting = params.customerName
      ? `Olá, ${params.customerName}!`
      : 'Olá!';
    await this.emailSender.send({
      to: params.to,
      subject: `Orçamento da ordem nº ${params.orderNumber}`,
      body: [
        greeting,
        '',
        `O diagnóstico do seu veículo (ordem nº ${params.orderNumber}) foi concluído. Este é o orçamento:`,
        '',
        ...params.lines.map(
          (line) =>
            `- ${line.name}: ${line.quantity} × ${format(line.unitPrice)} = ${format(line.subtotal)}`,
        ),
        '',
        `Total: ${format(params.total)}`,
        '',
        `Para aprovar ou rejeitar, acesse o acompanhamento das suas ordens com a OS ${params.serviceOrderId}.`,
        'Os valores ficam congelados até a sua resposta.',
      ].join('\n'),
    });
  }
}
