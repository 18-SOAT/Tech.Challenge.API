import { describe, expect, it } from 'bun:test';
import { NodemailerEmailService } from './nodemailer-email.service.js';

describe('NodemailerEmailService.transportOptions', () => {
  it('Mailpit: sem login e sem TLS implícito', () => {
    expect(
      NodemailerEmailService.transportOptions({
        host: 'mailpit',
        port: 1025,
        from: 'Oficina <x@oficina.local>',
      }),
    ).toStrictEqual({ host: 'mailpit', port: 1025, secure: false });
  });

  it('Gmail na 465: TLS desde a conexão e login com a senha de app', () => {
    expect(
      NodemailerEmailService.transportOptions({
        host: 'smtp.gmail.com',
        port: 465,
        from: 'Oficina <oficina@gmail.com>',
        user: 'oficina@gmail.com',
        pass: 'senha-de-app',
      }),
    ).toStrictEqual({
      host: 'smtp.gmail.com',
      port: 465,
      secure: true,
      auth: { user: 'oficina@gmail.com', pass: 'senha-de-app' },
    });
  });

  it('porta 587: STARTTLS (secure false) mantendo o login', () => {
    const options = NodemailerEmailService.transportOptions({
      host: 'smtp.gmail.com',
      port: 587,
      from: 'x',
      user: 'u',
      pass: 'p',
    });
    expect(options.secure).toBe(false);
    expect(options.auth).toStrictEqual({ user: 'u', pass: 'p' });
  });
});
