import { FormatRegistry } from '@sinclair/typebox';
import { isValidDocument } from '../../../modules/customer/domain/validators/is-valid-document.js';
import { isValidLicensePlate } from '../../../modules/vehicle/domain/validators/is-valid-license-plate.js';

// Formatos customizados do TypeBox, usados como `t.String({ format: 'cpf-cnpj' })`.
// Chamam a MESMA função pura dos Value Objects: o algoritmo existe num lugar só.
// Importado uma vez pelo app.ts, antes de qualquer rota. Ver docs/code/patterns/dto.md.

FormatRegistry.Set('cpf-cnpj', (value) => isValidDocument(value));

// DDD + número, 10 (fixo) ou 11 (celular) dígitos, com ou sem máscara — mesma regra
// do VO Phone.
FormatRegistry.Set('phone', (value) => /^\D*(\d\D*){10,11}$/.test(value));

// Placa antiga (ABC1234) ou Mercosul (ABC1D23), aceitando minúscula e hífen — mesma
// função do VO LicensePlate.
FormatRegistry.Set('license-plate', (value) => isValidLicensePlate(value));
