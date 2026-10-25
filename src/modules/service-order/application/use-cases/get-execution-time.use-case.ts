import type { UseCase } from '../../../../shared/application/use-case.interface.js';
import type { Service } from '../../../inventory/domain/entities/service.entity.js';
import type { ServiceRepository } from '../../../inventory/domain/repositories/service.repository.js';
import type {
  FinishedServiceOrderFilter,
  ServiceOrderRepository,
} from '../../domain/repositories/service-order.repository.js';
import {
  type ExecutionTimeAverage,
  ExecutionTimeReport,
} from '../../domain/services/execution-time-report.js';

export interface ExecutionTimeView {
  global: ExecutionTimeAverage;
  // O serviço do catálogo vem junto para comparar o real com a duração estimada;
  // null se ele foi excluído do catálogo depois.
  byService: (ExecutionTimeAverage & {
    serviceId: string;
    service: Service | null;
  })[];
}

// "Monitorar tempo médio de execução": média das OS finalizadas no período, global
// e por serviço. Com `serviceId`, só as OS que contêm o serviço e só a linha dele.
export class GetExecutionTimeUseCase
  implements UseCase<FinishedServiceOrderFilter, ExecutionTimeView>
{
  constructor(
    private readonly serviceOrderRepository: ServiceOrderRepository,
    private readonly serviceRepository: ServiceRepository,
  ) {}

  async execute(input: FinishedServiceOrderFilter): Promise<ExecutionTimeView> {
    const finished = await this.serviceOrderRepository.findFinished(input);
    const report = ExecutionTimeReport.of(finished);
    const rows = report.byService.filter(
      (row) => !input.serviceId || row.serviceId === input.serviceId,
    );
    return {
      global: report.global,
      byService: await Promise.all(
        rows.map(async (row) => ({
          ...row,
          service: await this.serviceRepository.findById(row.serviceId),
        })),
      ),
    };
  }
}
