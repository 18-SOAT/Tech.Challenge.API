# Email

> Ainda não implementado. Este doc define o formato para quando entrar (ex: notificar o cliente sobre mudança de status da OS ou orçamento para aprovar).

## Port genérica

```typescript
// shared/infrastructure/email/email-sender.port.ts
export interface EmailSender {
  send(params: { to: string; subject: string; body: string }): Promise<void>;
}
```

```typescript
// shared/infrastructure/email/nodemailer-email.service.ts
export class NodemailerEmailService implements EmailSender {
  constructor(private readonly config: { host: string; port: number; from: string }) {}

  async send(params: { to: string; subject: string; body: string }): Promise<void> {
    // chamada específica do vendor (Nodemailer/SES/Resend/...)
  }
}
```

Instanciada uma vez no `shared.container.ts` como `emailSender: EmailSender` (ver [services-pattern.md](services-pattern.md)). Essa port genérica só sabe "enviar um e-mail"; ela não faz ideia do que é uma notificação de atualização de status.

## Mailer por módulo (padrão catalog)

E-mails específicos de negócio (com seus templates) ficam num Mailer por módulo, com um método por tipo de e-mail. Ver [Padrão catalog](../patterns/catalog-pattern.md):

```typescript
// modules/service-order/infrastructure/mailers/service-order.mailer.ts
export class ServiceOrderMailer {
  constructor(private readonly emailSender: EmailSender) {}

  async sendStatusUpdated(params: { to: string; customerName: string; plate: string; newStatus: string }) {
    const html = renderTemplate('service-order-status-updated', params);
    await this.emailSender.send({ to: params.to, subject: 'Atualização da sua Ordem de Serviço', body: html });
  }

  async sendQuoteReady(params: { to: string; customerName: string; amount: number }) {
    const html = renderTemplate('service-order-quote-ready', params);
    await this.emailSender.send({ to: params.to, subject: 'Orçamento disponível para aprovação', body: html });
  }
}
```

**Não** construa um único método genérico `mailer.send(EmailType.STATUS_UPDATED, data)`. O motivo está no [Padrão catalog](../patterns/catalog-pattern.md): perde type safety por chamada, fica mais difícil de testar e se explica menos.

Um Use Case recebe o Mailer específico que precisa, chama o método nomeado e nunca toca na renderização de template nem na `EmailSender` genérica diretamente. O Mailer é montado no container do módulo (`new ServiceOrderMailer(shared.emailSender)`).
