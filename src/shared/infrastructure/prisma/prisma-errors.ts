import { Prisma } from '../../../generated/prisma/client.js';

// Campos envolvidos numa violação de unique (P2002). O formato do `meta` muda entre
// o engine clássico (`target`) e os driver adapters (`driverAdapterError.cause.constraint`),
// então lemos os dois.
export function uniqueViolationFields(error: unknown): string[] | null {
  if (
    !(error instanceof Prisma.PrismaClientKnownRequestError) ||
    error.code !== 'P2002'
  ) {
    return null;
  }
  const meta = (error.meta ?? {}) as {
    target?: string | string[];
    driverAdapterError?: { cause?: { constraint?: { fields?: string[] } } };
  };
  const target =
    meta.target ?? meta.driverAdapterError?.cause?.constraint?.fields;
  if (!target) return [];
  return Array.isArray(target) ? target : [target];
}
