import { describe, expect, it } from 'bun:test';
import { SignJWT } from 'jose';
import { UserType } from '../../../modules/user/domain/enums/user-type.enum.js';
import { JoseAccessLinkTokenService } from './jose-access-link-token.service.js';
import { JoseTokenService } from './jose-token.service.js';

// Usa o jose real: o que importa aqui é a separação entre link e sessão.
describe('JoseAccessLinkTokenService', () => {
  const secret = 'test-secret';
  const service = new JoseAccessLinkTokenService({ secret, expiresIn: '15m' });
  const key = new TextEncoder().encode(secret);

  it('ida e volta do primeiro acesso', async () => {
    const token = await service.sign({
      kind: 'first-access',
      customerId: 'customer-1',
    });
    await expect(service.verify(token)).resolves.toStrictEqual({
      kind: 'first-access',
      customerId: 'customer-1',
    });
  });

  it('ida e volta da redefinição, com o carimbo da senha', async () => {
    const payload = {
      kind: 'password-reset' as const,
      userId: 'user-1',
      passwordStamp: 'abc123',
    };
    const token = await service.sign(payload);
    await expect(service.verify(token)).resolves.toStrictEqual(payload);
  });

  it('rejeita link expirado', async () => {
    const expired = await new JoseAccessLinkTokenService({
      secret,
      expiresIn: '-1s',
    }).sign({ kind: 'first-access', customerId: 'customer-1' });
    await expect(service.verify(expired)).rejects.toThrow();
  });

  it('token de sessão não vale como link', async () => {
    const session = await new JoseTokenService({
      secret,
      expiresIn: '1h',
    }).sign({
      sub: 'user-1',
      email: 'joao@oficina.com',
      type: UserType.CUSTOMER,
      customerId: 'customer-1',
    });
    await expect(service.verify(session)).rejects.toThrow();
  });

  it('link não vale como token de sessão', async () => {
    const link = await service.sign({
      kind: 'first-access',
      customerId: 'customer-1',
    });
    await expect(
      new JoseTokenService({ secret, expiresIn: '1h' }).verify(link),
    ).rejects.toThrow();
  });

  it('rejeita audiência certa com finalidade errada', async () => {
    const token = await new SignJWT({ kind: 'first-access', purpose: 'outra' })
      .setProtectedHeader({ alg: 'HS256' })
      .setSubject('customer-1')
      .setAudience('access-link')
      .setExpirationTime('15m')
      .sign(key);
    await expect(service.verify(token)).rejects.toThrow();
  });

  it('rejeita redefinição sem carimbo e kind desconhecido', async () => {
    const sign = (claims: Record<string, unknown>) =>
      new SignJWT({ ...claims, purpose: 'set-password' })
        .setProtectedHeader({ alg: 'HS256' })
        .setSubject('user-1')
        .setAudience('access-link')
        .setExpirationTime('15m')
        .sign(key);

    await expect(
      service.verify(await sign({ kind: 'password-reset' })),
    ).rejects.toThrow();
    await expect(
      service.verify(await sign({ kind: 'outro' })),
    ).rejects.toThrow();
  });
});
