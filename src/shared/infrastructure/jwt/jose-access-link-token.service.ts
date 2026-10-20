import { jwtVerify, SignJWT } from 'jose';
import type {
  AccessLinkPayload,
  AccessLinkTokenService,
} from './access-link-token.port.js';

export interface JoseAccessLinkTokenServiceConfig {
  secret: string;
  // Validade curta: o link trafega por e-mail. Formato do jose: '15m', '1h'.
  expiresIn: string;
}

export class JoseAccessLinkTokenService implements AccessLinkTokenService {
  private static readonly ALGORITHM = 'HS256';
  static readonly AUDIENCE = 'access-link';
  private static readonly PURPOSE = 'set-password';
  private readonly key: Uint8Array;

  constructor(private readonly config: JoseAccessLinkTokenServiceConfig) {
    this.key = new TextEncoder().encode(config.secret);
  }

  sign(payload: AccessLinkPayload): Promise<string> {
    const claims =
      payload.kind === 'first-access'
        ? { kind: payload.kind, sub: payload.customerId }
        : {
            kind: payload.kind,
            sub: payload.userId,
            stamp: payload.passwordStamp,
          };

    return new SignJWT({
      ...claims,
      purpose: JoseAccessLinkTokenService.PURPOSE,
    })
      .setProtectedHeader({ alg: JoseAccessLinkTokenService.ALGORITHM })
      .setAudience(JoseAccessLinkTokenService.AUDIENCE)
      .setIssuedAt()
      .setExpirationTime(this.config.expiresIn)
      .sign(this.key);
  }

  async verify(token: string): Promise<AccessLinkPayload> {
    const { payload } = await jwtVerify(token, this.key, {
      algorithms: [JoseAccessLinkTokenService.ALGORITHM],
      audience: JoseAccessLinkTokenService.AUDIENCE,
    });

    if (
      payload.purpose !== JoseAccessLinkTokenService.PURPOSE ||
      !payload.sub
    ) {
      throw new Error('Token de link de acesso com finalidade inválida.');
    }
    if (payload.kind === 'first-access') {
      return { kind: 'first-access', customerId: payload.sub };
    }
    if (
      payload.kind === 'password-reset' &&
      typeof payload.stamp === 'string'
    ) {
      return {
        kind: 'password-reset',
        userId: payload.sub,
        passwordStamp: payload.stamp,
      };
    }
    throw new Error('Token de link de acesso com formato inválido.');
  }
}
