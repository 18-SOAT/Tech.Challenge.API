# Email

> Usado em dois fluxos do domínio (ver [linguagem ubíqua](../../ddd/linguagem-ubiqua.md#acesso-do-cliente-e-da-equipe)): o **link de acesso** (primeiro acesso, redefinição de senha e funcionário recém-cadastrado) e o **envio do orçamento** ao cliente. Na demo, o docker-compose sobe um Mailpit para capturar os e-mails.

## Port genérica

```typescript
// shared/infrastructure/email/email-sender.port.ts
export interface EmailMessage {
  to: string;
  subject: string;
  body: string; // texto puro
}

export interface EmailSender {
  send(message: EmailMessage): Promise<void>;
}
```

```typescript
// shared/infrastructure/email/nodemailer-email.service.ts
export class NodemailerEmailService implements EmailSender {
  constructor(private readonly config: { host: string; port: number; from: string }) {}

  async send(message: EmailMessage): Promise<void> {
    // chamada específica do vendor (Nodemailer/SES/Resend/...)
  }
}
```

Configuração por env (`SMTP_HOST`, `SMTP_PORT`, `MAIL_FROM`, ver `.env.example`). No `docker compose` a API aponta pro serviço `mailpit`; fora do Docker, `docker compose up mailpit` e a API usa `localhost:1025`. Caixa de entrada: `http://localhost:8025`.

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

### Exemplo implementado: `AuthMailer`

`modules/auth/infrastructure/mailers/auth.mailer.ts` implementa o port `AccessLinkMailer` (`modules/auth/domain/ports/access-link.mailer.ts`), com `sendFirstAccessLink()` e `sendPasswordResetLink()`. O use case depende do port (a camada `application` não importa `infrastructure`); o container do auth liga `new AuthMailer(shared.emailSender, shared.appUrl)`.

Os use cases que pedem o link disparam o envio sem esperar (*fire-and-forget*, falha só vai pro log): esperar o SMTP deixaria a resposta mais lenta só quando a conta existe — enumeração por tempo.

Um Use Case recebe o Mailer específico que precisa, chama o método nomeado e nunca toca na renderização de template nem na `EmailSender` genérica diretamente. O Mailer é montado no container do módulo (`new ServiceOrderMailer(shared.emailSender)`).
