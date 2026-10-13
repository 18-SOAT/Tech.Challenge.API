import { CustomerError } from '../errors/customer.error.js';
import {
  isValidDocument,
  onlyDigits,
} from '../validators/is-valid-document.js';

// CPF (11 dígitos) ou CNPJ (14), persistido só com dígitos.
export class Document {
  private constructor(readonly value: string) {}

  static create(raw: string): Document {
    if (!isValidDocument(raw)) {
      throw CustomerError.invalidDocument();
    }
    return new Document(onlyDigits(raw));
  }

  get isCpf(): boolean {
    return this.value.length === 11;
  }
}
