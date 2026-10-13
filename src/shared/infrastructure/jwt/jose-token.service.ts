import { jwtVerify, SignJWT } from 'jose';
import {
  type AuthTokenPayload,
  pickAuthClaims,
  type TokenService,
} from './token-service.port.js';

export interface JoseTokenServiceConfig {
  secret: string;
  // Formato do jose: '30m', '1h', '1d', '1w', '1y'.
  expiresIn: string;
}

// Adapter de infraestrutura: não depende do framework HTTP (por isso `jose` e não
// um plugin JWT do Elysia). Ver docs/code/patterns/auth.md.
export class JoseTokenService implements TokenService {
  private static readonly ALGORITHM = 'HS256';
  private readonly key: Uint8Array;

  constructor(private readonly config: JoseTokenServiceConfig) {
    this.key = new TextEncoder().encode(config.secret);
  }

  sign(payload: AuthTokenPayload): Promise<string> {
    return new SignJWT({ ...pickAuthClaims(payload) })
      .setProtectedHeader({ alg: JoseTokenService.ALGORITHM })
      .setIssuedAt()
      .setExpirationTime(this.config.expiresIn)
      .sign(this.key);
  }

  async verify(token: string): Promise<AuthTokenPayload> {
    // `algorithms` fixo: impede aceitar um token com `alg` trocado pelo atacante.
    const { payload } = await jwtVerify(token, this.key, {
      algorithms: [JoseTokenService.ALGORITHM],
    });
    return pickAuthClaims(payload as unknown as AuthTokenPayload);
  }
}
