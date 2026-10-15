import type { PrismaClient } from '../prisma/client.js';
import type { DatabaseHealthCheck } from './database-health.port.js';

// O pg não tem timeout de conexão por padrão: com o banco fora do ar, o SELECT 1
// poderia pendurar o /health (e o healthcheck do compose) indefinidamente.
const TIMEOUT_MS = 2000;

export class PrismaDatabaseHealthCheck implements DatabaseHealthCheck {
  constructor(private readonly prisma: PrismaClient) {}

  async isUp(): Promise<boolean> {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const timeout = new Promise<never>((_, reject) => {
      timer = setTimeout(() => reject(new Error('timeout')), TIMEOUT_MS);
    });

    try {
      await Promise.race([this.prisma.$queryRaw`SELECT 1`, timeout]);
      return true;
    } catch {
      return false;
    } finally {
      clearTimeout(timer);
    }
  }
}
