import { createTransport, type Transporter } from 'nodemailer';
import type { EmailMessage, EmailSender } from './email-sender.port.js';

export interface NodemailerEmailServiceConfig {
  host: string;
  port: number;
  from: string;
  // Sem usuário = SMTP sem login (Mailpit na demo). Com usuário = provedor real
  // (ex: Gmail com senha de app).
  user?: string;
  pass?: string;
}

// Adapter SMTP. Na demo aponta pro Mailpit (docker-compose), que captura os
// e-mails sem entregá-los; com SMTP_USER/SMTP_PASS envia por um provedor real.
export class NodemailerEmailService implements EmailSender {
  private readonly transporter: Transporter;

  constructor(private readonly config: NodemailerEmailServiceConfig) {
    this.transporter = createTransport(
      NodemailerEmailService.transportOptions(config),
    );
  }

  // Exposto pro teste: a decisão de TLS/login é o que pode dar errado aqui.
  static transportOptions(config: NodemailerEmailServiceConfig) {
    return {
      host: config.host,
      port: config.port,
      // 465 = TLS desde a conexão; nas demais (587, 1025) o nodemailer negocia
      // STARTTLS quando o servidor oferece.
      secure: config.port === 465,
      ...(config.user
        ? { auth: { user: config.user, pass: config.pass } }
        : {}),
    };
  }

  async send(message: EmailMessage): Promise<void> {
    await this.transporter.sendMail({
      from: this.config.from,
      to: message.to,
      subject: message.subject,
      text: message.body,
    });
  }
}
