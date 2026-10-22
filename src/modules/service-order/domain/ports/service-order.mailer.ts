import type { Money } from '../../../../shared/domain/value-objects/money.vo.js';

export interface QuoteLine {
  name: string;
  quantity: number;
  unitPrice: Money;
  subtotal: Money;
}

// E-mails da OS, um método por tipo (padrão catalog). O use case só conhece este
// contrato; texto e SMTP ficam no adapter (infrastructure/mailers).
export interface ServiceOrderMailer {
  // "Orçamento enviado para aprovação".
  sendQuote(params: {
    to: string;
    customerName: string | null;
    orderNumber: number;
    serviceOrderId: string;
    lines: QuoteLine[];
    total: Money;
  }): Promise<void>;
}
