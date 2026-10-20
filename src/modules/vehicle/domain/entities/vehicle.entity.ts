import { IdGenerator } from '../../../../shared/domain/id-generator.js';
import { VehicleError } from '../errors/vehicle.error.js';
import { LicensePlate } from '../value-objects/license-plate.vo.js';

const MIN_YEAR = 1900;

export class Vehicle {
  private constructor(
    private readonly id: string,
    private readonly customerId: string,
    private plate: LicensePlate,
    private brand: string,
    private model: string,
    private year: number,
  ) {}

  // O cliente é referenciado por id (agregados separados); quem garante que ele
  // existe é o use case, e a FK no banco é a última barreira.
  static create(input: {
    customerId: string;
    plate: LicensePlate;
    brand: string;
    model: string;
    year: number;
  }): Vehicle {
    return new Vehicle(
      IdGenerator.generate(),
      input.customerId,
      input.plate,
      Vehicle.validBrand(input.brand),
      Vehicle.validModel(input.model),
      Vehicle.validYear(input.year),
    );
  }

  static restore(props: {
    id: string;
    customerId: string;
    plate: string;
    brand: string;
    model: string;
    year: number;
  }): Vehicle {
    return new Vehicle(
      props.id,
      props.customerId,
      LicensePlate.create(props.plate),
      props.brand,
      props.model,
      props.year,
    );
  }

  // `undefined` mantém o valor atual. A placa muda (correção ou conversão para
  // Mercosul); o dono não muda por aqui.
  update(changes: {
    plate?: LicensePlate;
    brand?: string;
    model?: string;
    year?: number;
  }): void {
    // Valida tudo antes de mutar: um campo inválido não deixa o veículo pela metade.
    const brand =
      changes.brand === undefined
        ? this.brand
        : Vehicle.validBrand(changes.brand);
    const model =
      changes.model === undefined
        ? this.model
        : Vehicle.validModel(changes.model);
    const year =
      changes.year === undefined ? this.year : Vehicle.validYear(changes.year);

    this.plate = changes.plate ?? this.plate;
    this.brand = brand;
    this.model = model;
    this.year = year;
  }

  private static validBrand(raw: string): string {
    const brand = raw.trim();
    if (!brand) throw VehicleError.invalidBrand();
    return brand;
  }

  private static validModel(raw: string): string {
    const model = raw.trim();
    if (!model) throw VehicleError.invalidModel();
    return model;
  }

  // Ano-modelo pode ser o ano seguinte (carro 2027 vendido em 2026).
  private static validYear(year: number): number {
    const max = new Date().getFullYear() + 1;
    if (!Number.isInteger(year) || year < MIN_YEAR || year > max) {
      throw VehicleError.invalidYear(MIN_YEAR, max);
    }
    return year;
  }

  get idValue(): string {
    return this.id;
  }

  get customerIdValue(): string {
    return this.customerId;
  }

  get plateValue(): string {
    return this.plate.value;
  }

  get brandValue(): string {
    return this.brand;
  }

  get modelValue(): string {
    return this.model;
  }

  get yearValue(): number {
    return this.year;
  }
}
