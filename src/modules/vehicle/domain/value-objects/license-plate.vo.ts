import { VehicleError } from '../errors/vehicle.error.js';
import {
  isValidLicensePlate,
  normalizeLicensePlate,
} from '../validators/is-valid-license-plate.js';

// Placa no padrão antigo (ABC1234) ou Mercosul (ABC1D23), persistida na forma canônica.
export class LicensePlate {
  private constructor(readonly value: string) {}

  static create(raw: string): LicensePlate {
    if (!isValidLicensePlate(raw)) {
      throw VehicleError.invalidLicensePlate();
    }
    return new LicensePlate(normalizeLicensePlate(raw));
  }

  get isMercosul(): boolean {
    return /[A-Z]/.test(this.value[4] ?? '');
  }
}
