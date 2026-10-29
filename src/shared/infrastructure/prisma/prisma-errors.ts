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

// O login é único pelo e-mail canônico (`email_canonical`). Conforme o engine, o
// `meta` traz o campo (nome do schema ou da coluna) ou só o índice violado — com o
// driver adapter do pg, esse índice vem só pelo nome. Aceitamos as três formas.
const EMAIL_UNIQUE = [
  'emailCanonical',
  'email_canonical',
  'users_email_canonical_key',
];

export function isEmailUniqueViolation(error: unknown): boolean {
  const fields = uniqueViolationFields(error);
  if (fields === null) return false;
  const index = (
    (error as Prisma.PrismaClientKnownRequestError).meta as {
      driverAdapterError?: { cause?: { constraint?: { index?: string } } };
    }
  )?.driverAdapterError?.cause?.constraint?.index;
  return [...fields, index].some((name) => EMAIL_UNIQUE.includes(name ?? ''));
}

// P2003: o registro ainda é referenciado por outra tabela (FK sem cascade).
export function isForeignKeyViolation(error: unknown): boolean {
  return hasCode(error, 'P2003');
}

// P2025: o registro alvo de um update/delete não existe (ex: removido em paralelo).
export function isRecordNotFound(error: unknown): boolean {
  return hasCode(error, 'P2025');
}

function hasCode(error: unknown, code: string): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError && error.code === code
  );
}
