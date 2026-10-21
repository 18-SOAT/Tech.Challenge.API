import type { UseCase } from '../../../../shared/application/use-case.interface.js';
import { EmployeeError } from '../../../employee/domain/errors/employee.error.js';
import type { EmployeeRepository } from '../../../employee/domain/repositories/employee.repository.js';
import type { ServiceOrder } from '../../domain/entities/service-order.entity.js';
import { ServiceOrderError } from '../../domain/errors/service-order.error.js';
import type { ServiceOrderRepository } from '../../domain/repositories/service-order.repository.js';

export interface AssignMechanicInput {
  serviceOrderId: string;
  mechanicId: string;
}

// "Atribuir mecânico" → "Mecânico atribuído". Quem decide se o funcionário serve
// (papel MECHANIC, OS aberta) é a ServiceOrder.assign().
export class AssignMechanicUseCase
  implements UseCase<AssignMechanicInput, ServiceOrder>
{
  constructor(
    private readonly serviceOrderRepository: ServiceOrderRepository,
    private readonly employeeRepository: EmployeeRepository,
  ) {}

  async execute(input: AssignMechanicInput): Promise<ServiceOrder> {
    const serviceOrder = await this.serviceOrderRepository.findById(
      input.serviceOrderId,
    );
    if (!serviceOrder) throw ServiceOrderError.notFound();
    const mechanic = await this.employeeRepository.findById(input.mechanicId);
    if (!mechanic) throw EmployeeError.notFound();

    serviceOrder.assign({ id: mechanic.idValue, role: mechanic.roleValue });
    await this.serviceOrderRepository.save(serviceOrder);
    return serviceOrder;
  }
}
