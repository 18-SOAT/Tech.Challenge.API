import { expect } from 'bun:test';
import type { ApiResponse } from './api.js';

// Erro no envelope padrão. O código do erro (ex: USER_EMAIL_ALREADY_IN_USE) não sai
// na resposta: o que o cliente da API vê é o status e a mensagem.
export function expectError(
  response: ApiResponse,
  status: number,
  message?: string,
): void {
  expect(response.status).toBe(status);
  expect(response.body).toMatchObject({
    data: null,
    status,
    ...(message ? { message } : {}),
  });
}
