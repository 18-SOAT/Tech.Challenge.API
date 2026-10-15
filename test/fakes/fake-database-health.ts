import type { DatabaseHealthCheck } from '../../src/shared/infrastructure/health/database-health.port.js';

// `up` é público: o teste derruba o "banco" com `database.up = false`.
export class FakeDatabaseHealthCheck implements DatabaseHealthCheck {
  up = true;

  async isUp(): Promise<boolean> {
    return this.up;
  }
}
