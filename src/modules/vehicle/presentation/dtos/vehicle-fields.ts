import { t } from 'elysia';

// Campos compartilhados por cadastro e alteração. Formato na borda; regras de
// negócio (trim não vazio, faixa de ano) na entity Vehicle.
export const VehicleFields = {
  plate: t.String({
    format: 'license-plate',
    error:
      'Placa inválida. Use o padrão antigo (ABC1234) ou Mercosul (ABC1D23).',
    description: 'Padrão antigo ou Mercosul, com ou sem hífen',
    examples: ['ABC-1D23'],
  }),
  brand: t.String({
    minLength: 1,
    maxLength: 60,
    error: 'Informe a marca do veículo (até 60 caracteres).',
    examples: ['Fiat'],
  }),
  model: t.String({
    minLength: 1,
    maxLength: 60,
    error: 'Informe o modelo do veículo (até 60 caracteres).',
    examples: ['Uno'],
  }),
  year: t.Integer({
    minimum: 1900,
    error: 'Informe o ano do veículo (inteiro a partir de 1900).',
    description: 'Ano-modelo; até o ano seguinte ao atual',
    examples: [2015],
  }),
};
