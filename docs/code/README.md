# Documentação de arquitetura

Este diretório documenta a arquitetura de código e as convenções do `Tech.Challenge.API` — um projeto Bun + Elysia + Prisma aplicando DDD tático em um monolito modular.

A arquitetura é **Clean Architecture + Ports & Adapters (Hexagonal)**. As duas não competem: ambas aplicam inversão de dependência pra proteger o domínio. O DDD tático (entities, value objects, repositories) define como modelar o que fica dentro do núcleo.

## Camadas

- **`domain/`** — entities, value objects, enums, interfaces de repository (ports), erros de domínio. TypeScript puro, zero imports de framework/infraestrutura.
- **`application/`** — use cases. Orquestram objetos de domínio e repositories; não contêm regras de negócio.
- **`infrastructure/`** — adapters de **saída** (o sistema chama o mundo externo): repositories Prisma, mappers, hasher, token service, mailers, cache.
- **`presentation/`** — adapters de **entrada** (o mundo externo chama o sistema): o `index.ts` de rotas do módulo, handlers, schemas de request/response, plugins (auth, error handler). **É a única camada que importa `elysia`.**

Direção da dependência:

- `presentation` → `application` → `domain`
- `infrastructure` → `domain` (implementa os ports definidos lá)

Nada em `domain/` importa de outra camada. `presentation/` nunca importa de `infrastructure/` — o handler fala com o Use Case, nunca com o repository Prisma.

## Composition root: `<modulo>.container.ts`

Não existe container de DI. Cada módulo tem um `<modulo>.container.ts` na raiz — o **único arquivo que enxerga todas as camadas** — que instancia os adapters concretos e injeta nos use cases pelo construtor:

```typescript
// modules/auth/auth.container.ts
export function makeAuthContainer(shared: SharedContainer) {
  const userRepository = new PrismaUserRepository(shared.prisma);
  const customerRepository = new PrismaCustomerRepository(shared.prisma);
  // ...
  return {
    login: new LoginUseCase(userRepository, shared.passwordHasher, shared.tokenService, claimsResolver),
    // ...
  };
}
```

É o trabalho que um container de DI faria por baixo, só que explícito: dá pra ler de cima a baixo qual adapter atende qual port, e trocar um adapter é editar uma linha. O que é transversal (cliente Prisma, `TokenService`, `PasswordHasher`) é criado uma vez em `shared/shared.container.ts` e repassado.

`src/app.ts` exporta `createApp(deps)`, que recebe os use cases já montados e registra os plugins de rota de cada módulo. Isso permite que o e2e monte a app com fakes, sem banco. `src/server.ts` é o único lugar que monta os containers reais e chama `.listen()`.

## Estrutura de um módulo

```
src/
├── app.ts                                 → createApp(deps): plugins globais + rotas dos módulos
├── server.ts                              → monta containers reais + listen
├── modules/
│   └── service-order/
│       ├── service-order.container.ts     → composition root do módulo
│       ├── domain/
│       │   ├── entities/
│       │   ├── value-objects/
│       │   ├── enums/
│       │   ├── repositories/              → ports (interfaces)
│       │   └── errors/                    → catalog de DomainError do módulo
│       ├── application/
│       │   └── use-cases/
│       ├── infrastructure/
│       │   └── persistence/               → Prisma repository + mapper
│       └── presentation/
│           ├── index.ts                   → plugin de rotas: prefix, tags, guard
│           ├── controllers/
│           │   └── <operacao>/            → um handler por operação (ex: create/, find/by-id/)
│           └── dtos/                      → schemas TypeBox + response DTOs (whitelist)
└── shared/
    ├── shared.container.ts                → prisma, tokenService, passwordHasher
    ├── domain/
    ├── application/
    ├── infrastructure/
    └── presentation/
        ├── http/                          → envelope, ok(), ApiError, errorHandler, formats
        ├── auth/                          → plugin auth (macro)
        └── health/                        → GET /health
```

**Só crie uma pasta quando existir o primeiro arquivo dela.** A árvore acima mostra onde cada coisa vai, não uma lista de pastas pra criar vazias.

## Patterns

- [Controller (handler + index)](patterns/controller.md)
- [Use Case](patterns/use-case.md)
- [Repository](patterns/repository.md)
- [Entity](patterns/entity.md)
- [DTO](patterns/dto.md)
- [Tratamento de erros](patterns/error-handling.md)
- [Autenticação](patterns/auth.md)
- [Padrão catalog](patterns/catalog-pattern.md)

## Infraestrutura

- [Padrão de services (Port & Adapter)](infra/services-pattern.md)
- [Email](infra/email.md)
- [Cache](infra/cache.md)
- [Database (Prisma)](infra/database.md)

## Bibliotecas

- [OpenAPI (Swagger)](libs/openapi.md)

## Relacionado

O fluxo de git (branch, commits, PRs, changesets) está em [`../workflow/README.md`](../workflow/README.md). O diagrama do banco está em [`../diagrams/database.drawio`](../diagrams/database.drawio). Decisões de arquitetura (ADRs) estão em [`../adr/`](../adr/).