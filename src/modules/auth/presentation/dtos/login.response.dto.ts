import { t } from 'elysia';
import type { LoginOutput } from '../../application/use-cases/login.use-case.js';
import {
  AuthenticatedUserResponseDto,
  AuthenticatedUserSchema,
} from './authenticated-user.response.dto.js';

export class LoginResponseDto {
  private constructor(
    readonly accessToken: string,
    readonly user: AuthenticatedUserResponseDto,
  ) {}

  static fromOutput(output: LoginOutput): LoginResponseDto {
    return new LoginResponseDto(
      output.accessToken,
      AuthenticatedUserResponseDto.fromClaims(output.user),
    );
  }
}

export const LoginResponseSchema = t.Object(
  {
    accessToken: t.String({
      description: 'JWT para o header Authorization: Bearer',
    }),
    user: AuthenticatedUserSchema,
  },
  { title: 'LoginResponse' },
);
