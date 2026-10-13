import { describe, expect, it } from 'bun:test';
import { UserError, UserErrorCode } from '../errors/user.error.js';
import { Password } from './password.vo.js';

describe('Password', () => {
  it('aceita senha entre 8 caracteres e 72 bytes', () => {
    expect(Password.create('12345678').value).toBe('12345678');
  });

  it('rejeita senha com menos de 8 caracteres', () => {
    expect(() => Password.create('1234567')).toThrow('no mínimo 8');
  });

  it('lança UserError com code USER_INVALID_PASSWORD', () => {
    expect(() => Password.create('1234567')).toThrow(UserError);
    expect(() => Password.create('a'.repeat(73))).toThrow(
      expect.objectContaining({ code: UserErrorCode.INVALID_PASSWORD }),
    );
  });

  it('rejeita senha acima de 72 bytes (limite do bcrypt)', () => {
    expect(() => Password.create('a'.repeat(73))).toThrow('72 bytes');
  });

  it('conta bytes, não caracteres: 20 emojis têm 40 de length mas 80 bytes', () => {
    expect(() => Password.create('😀'.repeat(20))).toThrow('72 bytes');
  });
});
