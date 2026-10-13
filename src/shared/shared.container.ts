import type { PasswordHasher } from '../modules/user/domain/ports/password-hasher.port.js';
import { BcryptPasswordHasher } from '../modules/user/infrastructure/hashing/bcrypt-password-hasher.js';
import type { Env } from './infrastructure/config/env.js';
import { JoseTokenService } from './infrastructure/jwt/jose-token.service.js';
import type { TokenService } from './infrastructure/jwt/token-service.port.js';
import { createPrismaClient } from './infrastructure/prisma/client.js';

// Composition root do que é transversal: uma instância de cada, repassada aos
// containers dos módulos. Ver docs/code/infra/services-pattern.md.
export function makeSharedContainer(env: Env) {
  const tokenService: TokenService = new JoseTokenService({
    secret: env.JWT_SECRET,
    expiresIn: env.JWT_EXPIRES_IN,
  });
  const passwordHasher: PasswordHasher = new BcryptPasswordHasher();

  return {
    prisma: createPrismaClient(env.DATABASE_URL),
    tokenService,
    passwordHasher,
  };
}

export type SharedContainer = ReturnType<typeof makeSharedContainer>;
