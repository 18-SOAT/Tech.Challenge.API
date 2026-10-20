import type { UseCase } from '../../../../shared/application/use-case.interface.js';
import { ProductError } from '../../domain/errors/product.error.js';
import type { ProductRepository } from '../../domain/repositories/product.repository.js';

export class DeleteProductUseCase implements UseCase<string, void> {
  constructor(private readonly productRepository: ProductRepository) {}

  async execute(id: string): Promise<void> {
    const product = await this.productRepository.findById(id);
    if (!product) throw ProductError.notFound();

    // Movimentações e itens de OS ficam em outras tabelas: o repository detecta
    // pela FK (→ inUse). O livro-razão nunca perde lançamento.
    await this.productRepository.delete(product);
  }
}
