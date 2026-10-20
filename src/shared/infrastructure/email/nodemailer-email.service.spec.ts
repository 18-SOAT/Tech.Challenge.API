import { beforeEach, describe, expect, it, mock } from 'bun:test';

// Troca o nodemailer por um transporte que só guarda o que receberia: o teste cobre
// o adapter inteiro sem rede e sem SMTP. O mock precisa existir ANTES do adapter ser
// carregado — por isso o import dinâmico abaixo (import estático sobe pro topo).
const createdTransports: unknown[] = [];
const sentMails: unknown[] = [];
mock.module('nodemailer', () => ({
  createTransport: (options: unknown) => {
    createdTransports.push(options);
    return {
      sendMail: async (mail: unknown) => {
        sentMails.push(mail);
      },
    };
  },
}));

const { NodemailerEmailService } = await import(
  './nodemailer-email.service.js'
);

describe('NodemailerEmailService', () => {
  beforeEach(() => {
    createdTransports.length = 0;
    sentMails.length = 0;
  });

  it('cria o transporte com as opções de transportOptions', () => {
    const config = {
      host: 'smtp.gmail.com',
      port: 465,
      from: 'Oficina <oficina@gmail.com>',
      user: 'oficina@gmail.com',
      pass: 'senha-de-app',
    };
    new NodemailerEmailService(config);

    expect(createdTransports).toStrictEqual([
      NodemailerEmailService.transportOptions(config),
    ]);
  });

  it('send repassa remetente, destinatário, assunto e o corpo como texto', async () => {
    const service = new NodemailerEmailService({
      host: 'mailpit',
      port: 1025,
      from: 'Oficina <x@oficina.local>',
    });

    await service.send({
      to: 'joao@oficina.com',
      subject: 'Assunto',
      body: 'Corpo',
    });

    expect(sentMails).toStrictEqual([
      {
        from: 'Oficina <x@oficina.local>',
        to: 'joao@oficina.com',
        subject: 'Assunto',
        text: 'Corpo',
      },
    ]);
  });

  describe('transportOptions', () => {
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
});
