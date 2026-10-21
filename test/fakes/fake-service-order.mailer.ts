import type {
  QuoteLine,
  ServiceOrderMailer,
} from '../../src/modules/service-order/domain/ports/service-order.mailer.js';
import type { Money } from '../../src/shared/domain/value-objects/money.vo.js';

export interface SentQuote {
  to: string;
  customerName: string | null;
  orderNumber: number;
  serviceOrderId: string;
  lines: QuoteLine[];
  total: Money;
}

// Guarda os orçamentos "enviados" para o teste conferir destinatário e valores.
export class FakeServiceOrderMailer implements ServiceOrderMailer {
  readonly sent: SentQuote[] = [];
  failNext = false;

  async sendQuote(params: SentQuote): Promise<void> {
    if (this.failNext) {
      this.failNext = false;
      throw new Error('SMTP fora do ar');
    }
    this.sent.push(params);
  }
}
