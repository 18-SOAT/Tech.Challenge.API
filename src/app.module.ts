import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { AuthModule } from './modules/auth/auth.module.js';
import { JwtTokenModule } from './shared/infrastructure/jwt/jwt-token.module.js';
import { PrismaModule } from './shared/infrastructure/prisma/prisma.module.js';
import { HealthController } from './shared/presentation/controllers/health.controller.js';
import { JwtAuthGuard } from './shared/presentation/guards/jwt-auth.guard.js';

@Module({
  imports: [PrismaModule, JwtTokenModule, AuthModule],
  controllers: [HealthController],
  providers: [{ provide: APP_GUARD, useClass: JwtAuthGuard }],
})
export class AppModule {}
