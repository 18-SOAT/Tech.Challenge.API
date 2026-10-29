import { describe, expect, it } from 'bun:test';
import { SharedError, SharedErrorCode } from '../errors/shared.error.js';
import { Email } from './email.vo.js';

describe('Email', () => {
  it('normaliza com trim e lowercase', () => {
    expect(Email.create('  Joao@Oficina.COM ').value).toBe('joao@oficina.com');
  });

  it('lança SharedError (DomainError), não Error genérico', () => {
    expect(() => Email.create('joao')).toThrow(SharedError);
  });

  it.each(['joao', 'joao@', '@oficina.com', 'joao @oficina.com'])(
    'rejeita "%s"',
    (raw) => {
      expect(() => Email.create(raw)).toThrow('E-mail inválido.');
      expect(() => Email.create(raw)).toThrow(
        expect.objectContaining({ code: SharedErrorCode.INVALID_EMAIL }),
      );
    },
  );

  describe('canonical', () => {
    it.each([
      ['JoaoSilva@Gmail.com', 'joaosilva@gmail.com'],
      ['j.o.a.o.silva@gmail.com', 'joaosilva@gmail.com'],
      ['joaosilva@googlemail.com', 'joaosilva@gmail.com'],
      ['joao.silva+oficina@googlemail.com', 'joaosilva@gmail.com'],
      ['joao+1@outlook.com', 'joao@outlook.com'],
      ['joao+1@hotmail.com', 'joao@hotmail.com'],
      ['joao+1@live.com', 'joao@live.com'],
      ['joao+1@icloud.com', 'joao@icloud.com'],
      ['joao+1@proton.me', 'joao@proton.me'],
      ['joao+1@fastmail.com', 'joao@fastmail.com'],
    ])('"%s" → "%s"', (raw, canonical) => {
      expect(Email.create(raw).canonical).toBe(canonical);
    });

    it('pontos só são ignorados no Gmail', () => {
      expect(Email.create('joao.silva@outlook.com').canonical).toBe(
        'joao.silva@outlook.com',
      );
    });

    it('domínio fora da lista mantém +tag e pontos (só minúsculas)', () => {
      expect(Email.create('Joao.Silva+Vendas@Oficina.com').canonical).toBe(
        'joao.silva+vendas@oficina.com',
      );
    });

    it('não altera o e-mail de envio', () => {
      const email = Email.create('j.oao+1@googlemail.com');
      expect(email.value).toBe('j.oao+1@googlemail.com');
      expect(email.canonical).toBe('joao@gmail.com');
    });
  });
});
