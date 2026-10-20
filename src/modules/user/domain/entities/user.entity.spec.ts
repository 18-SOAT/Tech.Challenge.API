import { describe, expect, it } from 'bun:test';
import { FakePasswordHasher } from '../../../../../test/fakes/fake-password-hasher.js';
import { Email } from '../../../../shared/domain/value-objects/email.vo.js';
import { UserType } from '../enums/user-type.enum.js';
import { User } from './user.entity.js';

describe('User', () => {
  const hasher = new FakePasswordHasher();

  it('create gera id (UUID v7) e nasce ativo', () => {
    const user = User.create({
      email: Email.create('joao@oficina.com'),
      hashedPassword: 'hashed:senha-forte',
      type: UserType.CUSTOMER,
    });

    expect(user.idValue).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-/);
    expect(user.isActive).toBe(true);
    expect(user.typeValue).toBe(UserType.CUSTOMER);
  });

  it('verifyPassword delega a comparação pro hasher', async () => {
    const user = User.create({
      email: Email.create('joao@oficina.com'),
      hashedPassword: 'hashed:senha-forte',
      type: UserType.CUSTOMER,
    });

    await expect(user.verifyPassword('senha-forte', hasher)).resolves.toBe(
      true,
    );
    await expect(user.verifyPassword('senha-errada', hasher)).resolves.toBe(
      false,
    );
  });

  it('restore reconstrói o estado persistido, inclusive inativo', () => {
    const user = User.restore({
      id: 'user-1',
      email: 'joao@oficina.com',
      hashedPassword: 'hashed:x',
      type: UserType.EMPLOYEE,
      active: false,
    });

    expect(user.idValue).toBe('user-1');
    expect(user.isActive).toBe(false);
    expect(user.hashedPassword).toBe('hashed:x');
  });

  it('changePassword troca o hash e muda o carimbo (invalida o link de redefinição)', () => {
    const user = User.restore({
      id: 'user-1',
      email: 'joao@oficina.com',
      hashedPassword: 'hashed:antiga',
      type: UserType.CUSTOMER,
      active: true,
    });
    const stampBefore = user.passwordStamp;

    user.changePassword('hashed:nova');

    expect(user.hashedPassword).toBe('hashed:nova');
    expect(user.passwordStamp).not.toBe(stampBefore);
  });

  it('passwordStamp é estável e não expõe o hash', () => {
    const make = () =>
      User.restore({
        id: 'user-1',
        email: 'joao@oficina.com',
        hashedPassword: 'hashed:senha-forte',
        type: UserType.CUSTOMER,
        active: true,
      });

    expect(make().passwordStamp).toBe(make().passwordStamp);
    expect(make().passwordStamp).not.toContain('senha-forte');
  });
});
