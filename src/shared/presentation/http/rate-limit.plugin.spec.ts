import { describe, expect, it } from 'bun:test';
import { clientIp, emailAccountKey } from './rate-limit.plugin.js';

const request = new Request('http://localhost/auth/login', {
  headers: { 'x-forwarded-for': '198.51.100.7, 10.0.0.1' },
});
const server = { requestIP: () => ({ address: '10.0.0.1' }) };

describe('clientIp', () => {
  it('sem proxy confiável: ignora o X-Forwarded-For (o cliente forjaria o IP)', () => {
    expect(clientIp({ request, server }, false)).toBe('10.0.0.1');
  });

  it('atrás de proxy: o primeiro IP do X-Forwarded-For é o cliente', () => {
    expect(clientIp({ request, server }, true)).toBe('198.51.100.7');
  });

  it('sem servidor (app.handle) nem header: "unknown"', () => {
    expect(
      clientIp(
        { request: new Request('http://localhost'), server: null },
        true,
      ),
    ).toBe('unknown');
  });
});

describe('emailAccountKey', () => {
  it('usa o e-mail canônico, como o login; sem e-mail, sem chave de conta', () => {
    expect(emailAccountKey({ email: ' Joao@Oficina.com ' })).toBe(
      'joao@oficina.com',
    );
    expect(emailAccountKey({ email: 'J.oao+1@googlemail.com' })).toBe(
      'joao@gmail.com',
    );
    expect(emailAccountKey({ email: ' Joao ' })).toBe('joao');
    expect(emailAccountKey({ document: '123' })).toBeUndefined();
    expect(emailAccountKey(null)).toBeUndefined();
  });
});
