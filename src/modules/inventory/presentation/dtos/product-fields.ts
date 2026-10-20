import { t } from 'elysia';
import { ProductType } from '../../domain/enums/product-type.enum.js';

// Campos compartilhados por cadastro e alteração. Formato na borda; regras de
// negócio (SKU normalizado, 2 casas no preço) na entity e no VO Money.
export const ProductFields = {
  sku: t.String({
    minLength: 1,
    maxLength: 40,
    error: 'Informe o SKU (até 40 letras, números ou hífen).',
    description: 'Código único do produto; gravado em maiúsculas',
    examples: ['PF-123'],
  }),
  name: t.String({
    minLength: 1,
    maxLength: 120,
    error: 'Informe o nome do produto (até 120 caracteres).',
    examples: ['Pastilha de freio dianteira'],
  }),
  description: t.Union(
    [t.String({ maxLength: 500, examples: ['Jogo com 4 unidades'] }), t.Null()],
    { error: 'Descrição inválida (até 500 caracteres, ou null para remover).' },
  ),
  type: t.Enum(ProductType, {
    error: 'O tipo deve ser PART (peça) ou SUPPLY (insumo).',
    description: 'PART: instalada no veículo. SUPPLY: consumida no serviço',
  }),
  // Teto do Decimal(10,2) do banco.
  price: t.Number({
    minimum: 0,
    maximum: 99_999_999.99,
    error: 'Informe o preço unitário em reais (a partir de 0).',
    description: 'Reais por unidade, até 2 casas decimais',
    examples: [149.9],
  }),
  minimumStock: t.Integer({
    minimum: 0,
    error: 'O estoque mínimo deve ser um inteiro a partir de 0.',
    description: 'Abaixo dele o produto aparece em belowMinimum',
    examples: [4],
  }),
};
