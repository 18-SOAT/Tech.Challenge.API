import type { EmailSender } from '../../../../shared/infrastructure/email/email-sender.port.js';
import type { AccessLinkMailer } from '../../domain/ports/access-link.mailer.js';

// E-mails do link de acesso (padrão catalog: um método por tipo de e-mail).
// Não há front-end: o link aponta pra API e o token vai visível, para ser usado em
// POST /auth/set-password (ex: pelo Scalar em /openapi).
export class AuthMailer implements AccessLinkMailer {
  constructor(
    private readonly emailSender: EmailSender,
    private readonly appUrl: string,
  ) {}

  async sendFirstAccessLink(params: {
    to: string;
    customerName: string | null;
    token: string;
  }): Promise<void> {
    const greeting = params.customerName
      ? `Olá, ${params.customerName}!`
      : 'Olá!';
    await this.emailSender.send({
      to: params.to,
      subject: 'Defina sua senha de acesso',
      body: [
        greeting,
        '',
        'Recebemos um pedido de primeiro acesso ao acompanhamento das suas ordens de serviço.',
        'Para definir sua senha, use o link abaixo:',
        '',
        ...this.linkLines(params.token),
        '',
        'Se não foi você, ignore este e-mail.',
      ].join('\n'),
    });
  }

  async sendPasswordResetLink(params: {
    to: string;
    token: string;
  }): Promise<void> {
    await this.emailSender.send({
      to: params.to,
      subject: 'Redefinição de senha',
      body: [
        'Olá!',
        '',
        'Recebemos um pedido de redefinição da sua senha.',
        'Para definir uma nova senha, use o link abaixo:',
        '',
        ...this.linkLines(params.token),
        '',
        'Se não foi você, ignore este e-mail: sua senha atual continua valendo.',
      ].join('\n'),
    });
  }

  async sendEmployeeAccessLink(params: {
    to: string;
    employeeName: string;
    token: string;
  }): Promise<void> {
    await this.emailSender.send({
      to: params.to,
      subject: 'Bem-vindo à equipe: defina sua senha',
      body: [
        `Olá, ${params.employeeName}!`,
        '',
        'Você foi cadastrado na equipe da oficina.',
        'Para definir sua senha de acesso, use o link abaixo:',
        '',
        ...this.linkLines(params.token),
        '',
        'Se o link expirar, peça um novo em POST /auth/password-reset com este e-mail.',
      ].join('\n'),
    });
  }

  private linkLines(token: string): string[] {
    const url = new URL('/auth/set-password', this.appUrl);
    url.searchParams.set('token', token);
    return [
      url.toString(),
      '',
      'O link vale por pouco tempo e só uma vez.',
      `Token (para POST /auth/set-password): ${token}`,
    ];
  }
}
