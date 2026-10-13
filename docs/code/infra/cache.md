# Cache

> Ainda não implementado. Este doc define o formato para quando entrar (ex: snapshot de status da OS, tempo médio de execução).

## Port genérica

```typescript
// shared/infrastructure/cache/cache.port.ts
export interface Cache {
  get<T>(key: string): Promise<T | null>;
  set(key: string, value: unknown): Promise<void>;
  setWithTTL(key: string, value: unknown, ttlSeconds: number): Promise<void>;
  has(key: string): Promise<boolean>;
  delete(key: string): Promise<void>;
}
```

Implementada por um adapter Redis, instanciado uma vez no `shared.container.ts`, seguindo a mesma receita de [services-pattern.md](services-pattern.md). Diferente da `EmailSender`, essa port não carrega significado de negócio. Ela existe para que as implementações sejam substituíveis e para que os consumidores sejam testáveis sem um Redis real (fake em memória em `test/fakes/`).

## Catalog de chaves de cache por módulo (padrão catalog)

```typescript
// modules/service-order/infrastructure/cache/service-order-cache.keys.ts
export enum ServiceOrderCacheUsage {
  STATUS_SNAPSHOT = 'status-snapshot',
  AVERAGE_EXECUTION_TIME = 'average-execution-time',
}

export class ServiceOrderCacheKeys {
  static statusSnapshot(id: string): string {
    return `service-order:${id}:${ServiceOrderCacheUsage.STATUS_SNAPSHOT}`;
  }

  static averageExecutionTime(): string {
    return `service-order:${ServiceOrderCacheUsage.AVERAGE_EXECUTION_TIME}`;
  }
}
```

O enum evita a mesma classe de bug do `STATUS_MAP` de erro (ver [Tratamento de erros](../patterns/error-handling.md)): um erro de digitação numa chave escrita à mão quebra os cache hits silenciosamente, sem nenhum aviso do compilador. Ver [Padrão catalog](../patterns/catalog-pattern.md): é o mesmo formato de `CustomerError`/`ServiceOrderMailer`.

## Formato da chave: separado por dois-pontos

`entity:id:usage` (ex: `service-order:123:status-snapshot`) é a convenção idiomática do Redis, no lugar de underscores. Funciona bem com comandos baseados em pattern (`SCAN ... MATCH service-order:*`) e com ferramentas de observabilidade do Redis que assumem namespacing por dois-pontos.
