// Port do /health: o handler pergunta "o banco responde?" sem saber que é Prisma.
// No servidor o adapter faz SELECT 1; no e2e um fake devolve true/false.
export interface DatabaseHealthCheck {
  isUp(): Promise<boolean>;
}
