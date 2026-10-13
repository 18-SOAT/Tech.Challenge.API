# Tratamento de erros e envelope de resposta

Toda resposta da API, de sucesso ou de erro, tem o mesmo formato:

```json
{ "data": <payload ou null>, "message": <string ou null>, "status": <código HTTP> }
```

## `DomainError` precisa ser uma classe, não uma interface

```typescript
// shared/domain/errors/domain.error.ts
export abstract class DomainError extends Error {
  abstract readonly code: string;
}
```

Interfaces do TypeScript somem na compilação, e o `instanceof` usado pelo `errorHandler` precisa de um tipo real em runtime. Uma `abstract class` dá a mesma garantia de "toda subclasse precisa implementar isso" que uma interface daria, mas continua existindo em runtime.

## Catalog por módulo

Uma classe por módulo/bounded context, com constructor privado e uma factory estática nomeada para cada erro. Nada de um `new SomeError(code, message)` genérico espalhado pelo código:

```typescript
// modules/customer/domain/errors/customer.error.ts
export enum CustomerErrorCode {
  INVALID_DOCUMENT = 'CUSTOMER_INVALID_DOCUMENT',
  DOCUMENT_ALREADY_IN_USE = 'CUSTOMER_DOCUMENT_ALREADY_IN_USE',
}

export class CustomerError extends DomainError {
  private constructor(readonly code: CustomerErrorCode, message: string) {
    super(message);
  }

  static invalidDocument(): CustomerError {
    return new CustomerError(CustomerErrorCode.INVALID_DOCUMENT, 'CPF/CNPJ inválido.');
  }

  static documentAlreadyInUse(): CustomerError {
    return new CustomerError(CustomerErrorCode.DOCUMENT_ALREADY_IN_USE, 'CPF/CNPJ já cadastrado.');
  }
}
```

Use Cases e Value Objects lançam via catalog: `throw CustomerError.documentAlreadyInUse()`. Ver [Padrão catalog](catalog-pattern.md); o mesmo formato se repete em Mailers e chaves de cache.

Catalogs existentes (auth): `AuthError` (`invalidCredentials`, `tokenMissing`, `tokenInvalid`, `userUnavailable`, `forbidden`), `UserError` (`emailAlreadyInUse`, `invalidPassword`), `CustomerError` (`invalidDocument`, `invalidPhone`, `documentAlreadyInUse`) e `SharedError` (`invalidEmail`).

## `errorHandler`: plugin global que mapeia `code` → status HTTP

```typescript
// shared/presentation/http/error-handler.plugin.ts
const STATUS_MAP: Record<string, number> = {
  AUTH_INVALID_CREDENTIALS: 401,
  AUTH_TOKEN_MISSING: 401,
  AUTH_TOKEN_INVALID: 401,
  AUTH_USER_UNAVAILABLE: 401,
  AUTH_FORBIDDEN: 403,
  USER_EMAIL_ALREADY_IN_USE: 409,
  USER_INVALID_PASSWORD: 400,
  CUSTOMER_INVALID_DOCUMENT: 400,
  CUSTOMER_INVALID_PHONE: 400,
  CUSTOMER_DOCUMENT_ALREADY_IN_USE: 409,
  SHARED_INVALID_EMAIL: 400,
};

const fail = (set: Context['set'], status: number, message: string) => {
  set.status = status;
  return { data: null, message, status };
};

export const errorHandler = new Elysia({ name: 'error-handler' }).onError(
  { as: 'global' },
  ({ code, error, set }) => {
    if (error instanceof DomainError) {
      const status = STATUS_MAP[error.code];
      if (status) return fail(set, status, error.message);
      // Code sem mapeamento = erro de programação, não de negócio.
      console.error(`[errorHandler] DomainError sem STATUS_MAP: ${error.code}`, error);
      return fail(set, 500, 'Erro interno.');
    }

    // `instanceof` (e não `code === 'VALIDATION'`): dá o tipo de ValidationError, com o
    // `customError` = o `error` declarado no campo do schema.
    if (error instanceof ValidationError) return fail(set, 400, validationMessage(error));
    if (code === 'NOT_FOUND') return fail(set, 404, 'Rota não encontrada.');
    if (code === 'PARSE') return fail(set, 400, 'Corpo da requisição malformado.');

    console.error('[errorHandler] erro não tratado', error);
    return fail(set, 500, 'Erro interno.');
  },
);
```

### Ordem de decisão

| Situação | Status | `message` |
|---|---|---|
| `DomainError` com `code` no `STATUS_MAP` | o do mapa | `error.message` (já em português, vindo do catalog) |
| `DomainError` **sem** entrada no mapa | 500 + log | genérica (`Erro interno.`) |
| `ValidationError` (schema TypeBox rejeitou) | 400 | o `error` customizado do campo no schema (`error.customError`, ver [DTO](dto.md)), ou `Dados de entrada inválidos.` |
| `NOT_FOUND` (rota inexistente) | 404 | `Rota não encontrada.` |
| `PARSE` (JSON malformado) | 400 | `Corpo da requisição malformado.` |
| Qualquer outra coisa | 500 + log | genérica: **nunca** devolva stack ou mensagem interna |

**Regra: todo `XxxError` novo precisa de entrada no `STATUS_MAP`.** Um `code` sem mapeamento vira 500 com log, e não um status "parecido" adivinhado. É fail-safe, não fail-open: nunca dê ao mapa um fallback silencioso tipo `?? 400`, porque isso transformaria um mapeamento esquecido (ex: um conflito de verdade) num status errado, em vez de um bug visível. Um teste unitário do `errorHandler` percorre todos os enums `XxxErrorCode` e falha se algum não estiver no mapa.

### Por que `{ as: 'global' }`

No Elysia, um hook registrado num plugin vale, por padrão, **só para as rotas daquele plugin** (escopo local). O `errorHandler` é um plugin próprio e precisa capturar erros das rotas de **todos** os módulos. Por isso o `as: 'global'`. Ele também precisa ser o **primeiro** `.use()` do `createApp`, porque hooks só valem para rotas registradas depois deles.

## Envelope de sucesso: `ok()`

```typescript
// shared/presentation/http/envelope.ts
import { status, t, type TSchema } from 'elysia';

// Overloads: sem o código, o tipo fica no literal 200 (e não em `number`), senão o
// Elysia não casa o retorno com a entrada `200` do `response`.
export function ok<T>(data: T): ReturnType<typeof status<200, { data: T; message: null; status: 200 }>>;
export function ok<T, const Code extends number>(
  data: T,
  code: Code,
): ReturnType<typeof status<Code, { data: T; message: null; status: Code }>>;
export function ok(data: unknown, code = 200): any {
  return status(code, { data, message: null, status: code });
}

export const Envelope = <T extends TSchema>(data: T) =>
  t.Object({ data, message: t.Null(), status: t.Number() });

export const ApiError = t.Object({
  data: t.Null(),
  message: t.String(),
  status: t.Number(),
});
```

O handler devolve `ok(dto)` ou `ok(dto, 201)`, e a rota declara `response: { 201: Envelope(XxxSchema), 409: ApiError }`.

### Por que helper explícito e não um hook global

Daria para embrulhar o retorno automaticamente com um hook global (`mapResponse`), mas aí a validação de resposta, o OpenAPI e a inferência de tipos enxergariam o **dado cru**, enquanto o cliente recebe o **envelope**: o contrato documentado ficaria diferente do real.

Com o `ok()` explícito, o valor que o handler retorna **é** o que sai na resposta. O schema `response` valida exatamente isso, o OpenAPI documenta exatamente isso e o tipo inferido (inclusive para um cliente Eden no futuro) é exatamente isso. O custo é escrever `ok(...)` em cada handler, que é uma chamada só.

O `status()` do Elysia (no lugar de `set.status = 201`) faz o código HTTP fazer parte do tipo de retorno. É assim que o Elysia sabe qual entrada do `response` usar para validar.
