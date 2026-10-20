// Espera o trabalho em segundo plano (fire-and-forget, ex: envio do link de acesso)
// terminar: as microtasks pendentes rodam antes do próximo macrotask.
export const flushBackground = (): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, 0));
