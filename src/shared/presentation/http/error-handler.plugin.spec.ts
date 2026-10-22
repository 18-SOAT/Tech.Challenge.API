import { describe, expect, it } from 'bun:test';
import { AuthErrorCode } from '../../../modules/auth/domain/errors/auth.error.js';
import { CustomerErrorCode } from '../../../modules/customer/domain/errors/customer.error.js';
import { EmployeeErrorCode } from '../../../modules/employee/domain/errors/employee.error.js';
import { ProductErrorCode } from '../../../modules/inventory/domain/errors/product.error.js';
import { ServiceErrorCode } from '../../../modules/inventory/domain/errors/service.error.js';
import { OrderErrorCode } from '../../../modules/service-order/domain/errors/order.error.js';
import { ServiceOrderErrorCode } from '../../../modules/service-order/domain/errors/service-order.error.js';
import { UserErrorCode } from '../../../modules/user/domain/errors/user.error.js';
import { VehicleErrorCode } from '../../../modules/vehicle/domain/errors/vehicle.error.js';
import { SharedErrorCode } from '../../domain/errors/shared.error.js';
import { STATUS_MAP } from './error-handler.plugin.js';

// Rede de segurança da regra "todo XxxErrorCode precisa de entrada no STATUS_MAP".
// Catalog novo → adicione o enum na lista abaixo.
const ALL_ERROR_CODES = [
  AuthErrorCode,
  UserErrorCode,
  EmployeeErrorCode,
  CustomerErrorCode,
  VehicleErrorCode,
  ServiceErrorCode,
  ProductErrorCode,
  OrderErrorCode,
  ServiceOrderErrorCode,
  SharedErrorCode,
].flatMap((codes) => Object.values(codes));

describe('STATUS_MAP', () => {
  it.each(ALL_ERROR_CODES)('%s tem status HTTP mapeado', (code) => {
    expect(STATUS_MAP[code]).toBeNumber();
  });
});
