import type { AccessLinkMailer } from '../../src/modules/auth/domain/ports/access-link.mailer.js';

export interface SentAccessLink {
  kind: 'first-access' | 'password-reset';
  to: string;
  token: string;
}

// Guarda os links "enviados": o teste lê o token como o cliente leria no e-mail.
export class FakeAccessLinkMailer implements AccessLinkMailer {
  readonly sent: SentAccessLink[] = [];
  failNext = false;

  async sendFirstAccessLink(params: {
    to: string;
    token: string;
  }): Promise<void> {
    this.record({ kind: 'first-access', to: params.to, token: params.token });
  }

  async sendPasswordResetLink(params: {
    to: string;
    token: string;
  }): Promise<void> {
    this.record({ kind: 'password-reset', to: params.to, token: params.token });
  }

  get lastToken(): string {
    const last = this.sent.at(-1);
    if (!last) throw new Error('nenhum link enviado');
    return last.token;
  }

  private record(link: SentAccessLink): void {
    if (this.failNext) {
      this.failNext = false;
      throw new Error('SMTP fora do ar');
    }
    this.sent.push(link);
  }
}
