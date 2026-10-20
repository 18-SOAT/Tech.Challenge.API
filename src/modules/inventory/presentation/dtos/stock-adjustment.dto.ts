import { t } from 'elysia';

// Delta com sinal (≠ 0 é regra da entity). Motivo obrigatório: justifica o saldo
// mudar sem compra nem OS.
export const StockAdjustmentRequestSchema = t.Object(
  {
    quantity: t.Integer({
      error:
        'Informe a diferença em unidades (inteiro, negativo para retirar).',
      description: 'Delta com sinal: -3 retira 3 unidades, 2 acrescenta 2',
      examples: [-3],
    }),
    reason: t.String({
      minLength: 1,
      maxLength: 255,
      error: 'Informe o motivo do ajuste (até 255 caracteres).',
      examples: ['Inventário: 3 unidades avariadas'],
    }),
  },
  { additionalProperties: false },
);
