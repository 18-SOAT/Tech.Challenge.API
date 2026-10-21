import { describe, expect, it } from 'bun:test';
import { Money } from '../../../../shared/domain/value-objects/money.vo.js';
import type {
  EmailMessage,
  EmailSender,
} from '../../../../shared/infrastructure/email/email-sender.port.js';
import { ServiceOrderEmailMailer } from './service-order.mailer.js';

class CapturingEmailSender implements EmailSender {
  readonly sent: EmailMessage[] = [];
  async send(message: EmailMessage): Promise<void> {
    this.sent.push(message);
  }
}

describe('ServiceOrderEmailMailer', () => {
  const send = async (customerName: string | null) => {
    const sender = new CapturingEmailSender();
    await new ServiceOrderEmailMailer(sender).sendQuote({
      to: 'joao@oficina.com',
      customerName,
      orderNumber: 42,
      serviceOrderId: 'so-1',
      lines: [
        {
          name: 'Filtro de óleo',
          quantity: 2,
          unitPrice: Money.fromReais(35.5),
          subtotal: Money.fromReais(71),
        },
      ],
      total: Money.fromReais(71),
    });
    return sender.sent[0];
  };

  it('envia o orçamento com as linhas e o total em reais', async () => {
    const message = await send('João');

    expect(message?.to).toBe('joao@oficina.com');
    expect(message?.subject).toBe('Orçamento da ordem nº 42');
    expect(message?.body).toContain('Olá, João!');
    expect(message?.body).toMatch(
      /Filtro de óleo: 2 × R\$\s35,50 = R\$\s71,00/,
    );
    expect(message?.body).toMatch(/Total: R\$\s71,00/);
    expect(message?.body).toContain('so-1');
  });

  it('sem nome cadastrado usa saudação genérica', async () => {
    expect((await send(null))?.body.startsWith('Olá!')).toBeTrue();
  });
});
