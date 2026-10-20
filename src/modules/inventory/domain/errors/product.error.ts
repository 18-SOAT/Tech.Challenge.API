import { DomainError } from '../../../../shared/domain/errors/domain.error.js';

export enum ProductErrorCode {
  INVALID_SKU = 'PRODUCT_INVALID_SKU',
  INVALID_NAME = 'PRODUCT_INVALID_NAME',
  INVALID_MINIMUM_STOCK = 'PRODUCT_INVALID_MINIMUM_STOCK',
  INVALID_QUANTITY = 'PRODUCT_INVALID_QUANTITY',
  ADJUSTMENT_REASON_REQUIRED = 'PRODUCT_ADJUSTMENT_REASON_REQUIRED',
  INSUFFICIENT_STOCK = 'PRODUCT_INSUFFICIENT_STOCK',
  SKU_ALREADY_IN_USE = 'PRODUCT_SKU_ALREADY_IN_USE',
  NOT_FOUND = 'PRODUCT_NOT_FOUND',
  IN_USE = 'PRODUCT_IN_USE',
}

export class ProductError extends DomainError {
  private constructor(
    readonly code: ProductErrorCode,
    message: string,
  ) {
    super(message);
  }

  static invalidSku(): ProductError {
    return new ProductError(
      ProductErrorCode.INVALID_SKU,
      'SKU inválido: use de 1 a 40 letras, números ou hífen.',
    );
  }

  static invalidName(): ProductError {
    return new ProductError(
      ProductErrorCode.INVALID_NAME,
      'O nome do produto não pode ser vazio.',
    );
  }

  static invalidMinimumStock(): ProductError {
    return new ProductError(
      ProductErrorCode.INVALID_MINIMUM_STOCK,
      'O estoque mínimo deve ser um inteiro a partir de 0.',
    );
  }

  static invalidQuantity(): ProductError {
    return new ProductError(
      ProductErrorCode.INVALID_QUANTITY,
      'A quantidade deve ser um inteiro de unidades: maior que zero na entrada, diferente de zero no ajuste.',
    );
  }

  static adjustmentReasonRequired(): ProductError {
    return new ProductError(
      ProductErrorCode.ADJUSTMENT_REASON_REQUIRED,
      'Informe o motivo do ajuste de estoque.',
    );
  }

  static insufficientStock(): ProductError {
    return new ProductError(
      ProductErrorCode.INSUFFICIENT_STOCK,
      'Estoque insuficiente: o saldo do produto não pode ficar negativo.',
    );
  }

  static skuAlreadyInUse(): ProductError {
    return new ProductError(
      ProductErrorCode.SKU_ALREADY_IN_USE,
      'Já existe um produto com esse SKU.',
    );
  }

  static notFound(): ProductError {
    return new ProductError(
      ProductErrorCode.NOT_FOUND,
      'Produto não encontrado.',
    );
  }

  static inUse(): ProductError {
    return new ProductError(
      ProductErrorCode.IN_USE,
      'Produto com movimentação de estoque ou usado em ordens de serviço não pode ser excluído. Desative-o.',
    );
  }
}
