# Padrão de services (Port & Adapter)

Conexão de banco, envio de e-mail, cache: nenhum desses faz parte da linguagem ubíqua do negócio (ninguém, numa sessão de Event Storming, diz "Redis"). No vocabulário estratégico do DDD, eles são **Generic Subdomains**: capacidades técnicas de suporte, não o modelo de domínio central. São tratados com a ideia de **Port & Adapter** da Hexagonal Architecture, que na prática é a mesma inversão de dependência do [Repository](../patterns/repository.md), generalizada para além da persistência.

## Receita

1. **Port**: uma interface, sem dono de negócio:

```typescript
// shared/infrastructure/xxx/xxx.port.ts
export interface Xxx {
  doSomething(): Promise<void>;
}
```

2. **Adapter**: a implementação concreta, específica da tecnologia. Recebe configuração pelo construtor e não lê `process.env` diretamente:

```typescript
// shared/infrastructure/xxx/concrete-xxx.adapter.ts
export class ConcreteXxxAdapter implements Xxx {
  constructor(private readonly config: { url: string }) {}
  async doSomething(): Promise<void> { /* código específico do vendor */ }
}
```

3. **Instância única no container compartilhado**, criada uma vez e repassada a quem precisa:

```typescript
// shared/shared.container.ts
export function makeSharedContainer(env: Env) {
  return {
    prisma: createPrismaClient(env.DATABASE_URL),
    tokenService: new JoseTokenService({ secret: env.JWT_SECRET, expiresIn: env.JWT_EXPIRES_IN }) as TokenService,
    passwordHasher: new BcryptPasswordHasher() as PasswordHasher,
    xxx: new ConcreteXxxAdapter({ url: env.XXX_URL }) as Xxx,
  };
}
export type SharedContainer = ReturnType<typeof makeSharedContainer>;
```

Os containers de módulo recebem o `SharedContainer` e repassam aos use cases, sempre tipados pela interface do port, nunca pelo adapter concreto.

## Cuidado com nomenclatura: dois significados de "Service"

- **Domain Service** (pattern tático do DDD): lógica de negócio pura que não pertence naturalmente a nenhuma Entity. Sem I/O, sem import de framework. Fica em `domain/services/`.
- **Infrastructure Service/Adapter** (`JoseTokenService`, `NodemailerEmailService`, `RedisCache`): adapter específico de tecnologia. Fica em `infrastructure/`.

Mesmo sufixo, conceitos sem relação. Não confunda os dois ao ler ou escrever código.

## Exemplo de referência: cliente Prisma

Genérico, não sabe nada sobre `Customer`/`Vehicle` nem sobre qualquer conceito de negócio. Só gerencia a conexão. Ver [database.md](database.md).
