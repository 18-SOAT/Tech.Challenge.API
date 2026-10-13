// Classe (não interface): o errorHandler usa `instanceof` em runtime, e interfaces
// somem na compilação. Ver docs/code/patterns/error-handling.md.
export abstract class DomainError extends Error {
  abstract readonly code: string;

  constructor(message: string) {
    super(message);
    this.name = new.target.name;
  }
}
