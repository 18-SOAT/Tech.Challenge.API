export interface EmailMessage {
  to: string;
  subject: string;
  body: string; // texto puro
}

// Port genérica: só sabe "enviar um e-mail". O conteúdo de cada e-mail de negócio
// fica no Mailer do módulo (ver docs/code/infra/email.md).
export interface EmailSender {
  send(message: EmailMessage): Promise<void>;
}
