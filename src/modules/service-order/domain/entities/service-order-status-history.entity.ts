import { IdGenerator } from '../../../../shared/domain/id-generator.js';
import type { ServiceOrderStatus } from '../enums/service-order-status.enum.js';

// Linha imutável por transição (append-only): o adapter só insere as que ainda não
// estão no banco. `changedById` null = cliente ou sistema. Fonte do tempo médio (#14).
export class ServiceOrderStatusHistory {
  private constructor(
    private readonly id: string,
    private readonly status: ServiceOrderStatus,
    private readonly changedById: string | null,
    private readonly changedAt: Date,
  ) {}

  static create(input: {
    status: ServiceOrderStatus;
    changedById: string | null;
  }): ServiceOrderStatusHistory {
    return new ServiceOrderStatusHistory(
      IdGenerator.generate(),
      input.status,
      input.changedById,
      new Date(),
    );
  }

  static restore(props: {
    id: string;
    status: ServiceOrderStatus;
    changedById: string | null;
    changedAt: Date;
  }): ServiceOrderStatusHistory {
    return new ServiceOrderStatusHistory(
      props.id,
      props.status,
      props.changedById,
      props.changedAt,
    );
  }

  get idValue(): string {
    return this.id;
  }

  get statusValue(): ServiceOrderStatus {
    return this.status;
  }

  get changedByIdValue(): string | null {
    return this.changedById;
  }

  get changedAtValue(): Date {
    return this.changedAt;
  }
}
