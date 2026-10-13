import { describe, expect, it } from 'bun:test';
import { SignJWT } from 'jose';
import { EmployeeRole } from '../../../modules/employee/domain/enums/employee-role.enum.js';
import { UserType } from '../../../modules/user/domain/enums/user-type.enum.js';
import { JoseTokenService } from './jose-token.service.js';
import type { AuthTokenPayload } from './token-service.port.js';

// Usa o jose real pra validar o que de fato vai no token.
describe('JoseTokenService', () => {
  const service = new JoseTokenService({
    secret: 'test-secret',
    expiresIn: '1h',
  });

  const employee: AuthTokenPayload = {
    sub: 'user-2',
    email: 'maria@oficina.com',
    type: UserType.EMPLOYEE,
    employeeId: 'employee-1',
    role: EmployeeRole.ADMIN,
  };

  it('o payload cru do JWT (o que qualquer um lê no jwt.io) só tem os claims + iat/exp', async () => {
    const token = await service.sign(employee);
    const rawPayload = JSON.parse(
      Buffer.from(token.split('.')[1] ?? '', 'base64url').toString(),
    );

    expect(Object.keys(rawPayload).sort()).toStrictEqual(
      ['email', 'employeeId', 'exp', 'iat', 'role', 'sub', 'type'].sort(),
    );
  });

  it('verify devolve os claims sem iat/exp', async () => {
    const token = await service.sign(employee);
    await expect(service.verify(token)).resolves.toStrictEqual(employee);
  });

  it('verify rejeita token assinado com outro segredo', async () => {
    const forged = await new SignJWT({ ...employee })
      .setProtectedHeader({ alg: 'HS256' })
      .sign(new TextEncoder().encode('outro'));
    await expect(service.verify(forged)).rejects.toThrow();
  });

  it('verify rejeita token expirado', async () => {
    const expired = await new JoseTokenService({
      secret: 'test-secret',
      expiresIn: '-1s',
    }).sign(employee);
    await expect(service.verify(expired)).rejects.toThrow();
  });
});
