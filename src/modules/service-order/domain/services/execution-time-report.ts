import type { ServiceOrder } from '../entities/service-order.entity.js';

export interface ExecutionTimeAverage {
  averageMs: number;
  count: number;
}

export interface ExecutionTimeReportResult {
  global: ExecutionTimeAverage;
  byService: (ExecutionTimeAverage & { serviceId: string })[];
}

// Tempo médio de execução (read model): global e por serviço do catálogo, a partir
// das OS finalizadas. A duração de cada OS é a ServiceOrder.executionTime, então a
// fórmula fica num lugar só. Por serviço é uma aproximação: uma OS com vários
// serviços conta inteira para cada um deles.
// Calculado em memória: para o volume de uma oficina de médio porte basta; com
// muito volume, a agregação desceria para o banco (AVG no SQL).
export const ExecutionTimeReport = {
  of(serviceOrders: readonly ServiceOrder[]): ExecutionTimeReportResult {
    const all: number[] = [];
    const perService = new Map<string, number[]>();
    for (const serviceOrder of serviceOrders) {
      const time = serviceOrder.executionTime;
      if (time === null) continue;
      all.push(time);
      for (const item of serviceOrder.servicesValue) {
        const times = perService.get(item.serviceIdValue) ?? [];
        times.push(time);
        perService.set(item.serviceIdValue, times);
      }
    }
    return {
      global: average(all),
      byService: [...perService].map(([serviceId, times]) => ({
        serviceId,
        ...average(times),
      })),
    };
  },
};

function average(times: readonly number[]): ExecutionTimeAverage {
  const total = times.reduce((sum, time) => sum + time, 0);
  return {
    averageMs: times.length ? Math.round(total / times.length) : 0,
    count: times.length,
  };
}
