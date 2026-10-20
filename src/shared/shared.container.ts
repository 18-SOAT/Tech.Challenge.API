import type { PasswordHasher } from '../modules/user/domain/ports/password-hasher.port.js';
import { BcryptPasswordHasher } from '../modules/user/infrastructure/hashing/bcrypt-password-hasher.js';
import type { Env } from './infrastructure/config/env.js';
import type { EmailSender } from './infrastructure/email/email-sender.port.js';
import { NodemailerEmailService } from './infrastructure/email/nodemailer-email.service.js';
import type { DatabaseHealthCheck } from './infrastructure/health/database-health.port.js';
import { PrismaDatabaseHealthCheck } from './infrastructure/health/prisma-database-health.js';
import type { AccessLinkTokenService } from './infrastructure/jwt/access-link-token.port.js';
import { JoseAccessLinkTokenService } from './infrastructure/jwt/jose-access-link-token.service.js';
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
  const accessLinkTokenService: AccessLinkTokenService =
    new JoseAccessLinkTokenService({
      secret: env.JWT_SECRET,
      expiresIn: env.ACCESS_LINK_EXPIRES_IN,
    });
  const passwordHasher: PasswordHasher = new BcryptPasswordHasher();
  const emailSender: EmailSender = new NodemailerEmailService({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    from: env.MAIL_FROM,
    user: env.SMTP_USER,
    pass: env.SMTP_PASS,
  });
  const prisma = createPrismaClient(env.DATABASE_URL);
  const databaseHealth: DatabaseHealthCheck = new PrismaDatabaseHealthCheck(
    prisma,
  );

  return {
    prisma,
    tokenService,
    accessLinkTokenService,
    passwordHasher,
    emailSender,
    databaseHealth,
    appUrl: env.APP_URL,
  };
}

export type SharedContainer = ReturnType<typeof makeSharedContainer>;
