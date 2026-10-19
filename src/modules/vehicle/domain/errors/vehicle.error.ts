import { DomainError } from '../../../../shared/domain/errors/domain.error.js';

export enum VehicleErrorCode {
  INVALID_LICENSE_PLATE = 'VEHICLE_INVALID_LICENSE_PLATE',
  INVALID_BRAND = 'VEHICLE_INVALID_BRAND',
  INVALID_MODEL = 'VEHICLE_INVALID_MODEL',
  INVALID_YEAR = 'VEHICLE_INVALID_YEAR',
  LICENSE_PLATE_ALREADY_IN_USE = 'VEHICLE_LICENSE_PLATE_ALREADY_IN_USE',
  NOT_FOUND = 'VEHICLE_NOT_FOUND',
  HAS_SERVICE_ORDERS = 'VEHICLE_HAS_SERVICE_ORDERS',
}

export class VehicleError extends DomainError {
  private constructor(
    readonly code: VehicleErrorCode,
    message: string,
  ) {
    super(message);
  }

  static invalidLicensePlate(): VehicleError {
    return new VehicleError(
      VehicleErrorCode.INVALID_LICENSE_PLATE,
      'Placa inválida. Use o padrão antigo (ABC1234) ou Mercosul (ABC1D23).',
    );
  }

  static invalidBrand(): VehicleError {
    return new VehicleError(
      VehicleErrorCode.INVALID_BRAND,
      'A marca do veículo não pode ser vazia.',
    );
  }

  static invalidModel(): VehicleError {
    return new VehicleError(
      VehicleErrorCode.INVALID_MODEL,
      'O modelo do veículo não pode ser vazio.',
    );
  }

  static invalidYear(min: number, max: number): VehicleError {
    return new VehicleError(
      VehicleErrorCode.INVALID_YEAR,
      `O ano do veículo deve estar entre ${min} e ${max}.`,
    );
  }

  static licensePlateAlreadyInUse(): VehicleError {
    return new VehicleError(
      VehicleErrorCode.LICENSE_PLATE_ALREADY_IN_USE,
      'Placa já cadastrada.',
    );
  }

  static notFound(): VehicleError {
    return new VehicleError(
      VehicleErrorCode.NOT_FOUND,
      'Veículo não encontrado.',
    );
  }

  static hasServiceOrders(): VehicleError {
    return new VehicleError(
      VehicleErrorCode.HAS_SERVICE_ORDERS,
      'Veículo com ordens de serviço não pode ser excluído.',
    );
  }
}
