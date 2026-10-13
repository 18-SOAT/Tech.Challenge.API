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
});
