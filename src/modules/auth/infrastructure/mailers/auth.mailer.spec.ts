import { describe, expect, it } from 'bun:test';
import type {
  EmailMessage,
  EmailSender,
} from '../../../../shared/infrastructure/email/email-sender.port.js';
import { AuthMailer } from './auth.mailer.js';

class CapturingEmailSender implements EmailSender {
  readonly sent: EmailMessage[] = [];
  async send(message: EmailMessage): Promise<void> {
    this.sent.push(message);
  }
}

describe('AuthMailer', () => {
  const setup = () => {
    const sender = new CapturingEmailSender();
    return { sender, mailer: new AuthMailer(sender, 'http://localhost:3000') };
  };

  it('primeiro acesso: saúda pelo nome e leva o link com o token', async () => {
    const { sender, mailer } = setup();
    await mailer.sendFirstAccessLink({
      to: 'joao@oficina.com',
      customerName: 'João',
      token: 'abc.def',
    });

    const [message] = sender.sent;
    expect(message?.to).toBe('joao@oficina.com');
    expect(message?.subject).toBe('Defina sua senha de acesso');
    expect(message?.body).toContain('Olá, João!');
    expect(message?.body).toContain(
      'http://localhost:3000/auth/set-password?token=abc.def',
    );
  });

  it('primeiro acesso sem nome cadastrado usa saudação genérica', async () => {
    const { sender, mailer } = setup();
    await mailer.sendFirstAccessLink({
      to: 'joao@oficina.com',
      customerName: null,
      token: 'abc.def',
    });
    expect(sender.sent[0]?.body.startsWith('Olá!')).toBe(true);
  });

  it('redefinição de senha leva o link com o token', async () => {
    const { sender, mailer } = setup();
    await mailer.sendPasswordResetLink({ to: 'joao@oficina.com', token: 't1' });

    expect(sender.sent[0]?.subject).toBe('Redefinição de senha');
    expect(sender.sent[0]?.body).toContain('/auth/set-password?token=t1');
  });

  it('funcionário cadastrado: saúda pelo nome e leva o link com o token', async () => {
    const { sender, mailer } = setup();
    await mailer.sendEmployeeAccessLink({
      to: 'maria@oficina.com',
      employeeName: 'Maria',
      token: 't2',
    });

    const [message] = sender.sent;
    expect(message?.to).toBe('maria@oficina.com');
    expect(message?.subject).toBe('Bem-vindo à equipe: defina sua senha');
    expect(message?.body).toContain('Olá, Maria!');
    expect(message?.body).toContain('/auth/set-password?token=t2');
  });
});
