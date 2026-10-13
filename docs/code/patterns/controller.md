# Controller (handler + index)

A camada de entrada HTTP de cada módulo tem duas peças:

- **Handler**: um arquivo por operação. Traduz HTTP ↔ Use Case e declara o contrato da rota (body, params, response por status, docs).
- **`index.ts`**: o plugin de rotas do módulo. Define `prefix`/`tags`, separa rotas públicas de protegidas (guard) e registra os handlers.

Nenhuma das duas tem lógica de negócio, e nenhuma fala com um Repository diretamente.

## Handler: uma factory de plugin por operação

```typescript
// modules/auth/presentation/controllers/login/login.handler.ts
import { Elysia } from 'elysia';
import { ApiError, Envelope, ok } from '../../../../../shared/presentation/http/envelope.js';
import type { LoginUseCase } from '../../../application/use-cases/login.use-case.js';
import { LoginRequestSchema, LoginResponseSchema } from '../../dtos/login.dto.js';
import { LoginResponseDto } from '../../dtos/login.response.dto.js';

export const loginHandler = (login: LoginUseCase) =>
  new Elysia().post(
    '/login',
    async ({ body }) => ok(LoginResponseDto.fromOutput(await login.execute(body))),
    {
      body: LoginRequestSchema,
      response: {
        200: Envelope(LoginResponseSchema),
        400: ApiError,
        401: ApiError,
      },
      detail: { summary: 'Autentica um usuário e devolve o access token' },
    },
  );
```

### Por que factory (função que recebe o use case)

Não há container de DI. O handler recebe por parâmetro **só o use case daquela operação**, e quem chama é o composition root (via `createApp`). Isso dá:

- **Dependência explícita**: a assinatura mostra do que a rota depende.
- **Testabilidade**: o e2e passa um use case montado com fakes, sem banco (ver `CLAUDE.md`, seção Testes).
- **Sem God Service**: cada handler recebe um use case, nunca "o service do módulo".

### Responsabilidades

- Declarar `body`/`params`/`query` com schemas TypeBox. O Elysia valida **antes** do handler rodar e rejeita com 400 (ver [DTO](dto.md)).
- Chamar o(s) Use Case(s) que a rota precisa.
- Mapear o resultado para um Response DTO (whitelist) e devolver com `ok(dto, status)` (ver [Tratamento de erros](error-handling.md#envelope-de-sucesso-ok)).
- Declarar **todos** os status possíveis em `response`, inclusive os de erro (ver [OpenAPI](../libs/openapi.md)).

Os erros não são tratados aqui. O use case lança um `DomainError` e o `errorHandler` global converte para HTTP.

## `index.ts`: prefixo, tags e guard

```typescript
// modules/auth/presentation/index.ts
import { Elysia } from 'elysia';
import type { AuthPlugin } from '../../../shared/presentation/auth/auth.plugin.js';
import type { AuthUseCases } from '../auth.container.js';
import { loginHandler } from './controllers/login/login.handler.js';
import { meHandler } from './controllers/me/me.handler.js';
import { registerHandler } from './controllers/register/register.handler.js';

export const authRoutes = (useCases: AuthUseCases, auth: AuthPlugin) =>
  new Elysia({ prefix: '/auth', tags: ['Auth'] })
    .use(auth)
    // Rotas públicas: FORA do guard.
    .use(registerHandler(useCases.registerCustomer))
    .use(loginHandler(useCases.login))
    // Rotas protegidas: DENTRO do guard.
    .guard({ auth: true, detail: { security: [{ bearerAuth: [] }] } }, (app) =>
      app.use(meHandler(useCases.getMe, auth)),
    );
```

### Regra: rota nova nasce protegida

O ideal de segurança é *deny by default*: esquecer de proteger uma rota não pode deixá-la aberta. Como a proteção é declarada por módulo (no `.guard()` do `index.ts`), isso é garantido por **convenção + teste**:

- Todo handler novo entra **dentro** do `.guard(...)` do `index.ts`.
- Só fica fora do guard a rota que é pública por requisito de negócio (cadastro, login, consulta pública de status da OS). No PR, essa escolha precisa estar justificada.
- Todo módulo com rota protegida tem um e2e que chama a rota **sem token** e espera 401. É esse teste que garante a regra; a convenção sozinha não garante.

### Handler que precisa do usuário logado

O `user` (claims do JWT) entra no contexto pelo macro `auth` (ver [Autenticação](auth.md)). Para o TypeScript enxergar o `user` dentro do handler, o próprio handler também faz `.use(auth)` e declara `auth: true` na rota:

```typescript
// modules/auth/presentation/controllers/me/me.handler.ts
export const meHandler = (getMe: GetMeUseCase, auth: AuthPlugin) =>
  new Elysia().use(auth).get(
    '/me',
    async ({ user }) => ok(AuthenticatedUserResponseDto.fromClaims(await getMe.execute(user.sub))),
    { auth: true, response: { 200: Envelope(AuthenticatedUserSchema), 401: ApiError } },
  );
```

O plugin `auth` tem `name`, então o Elysia deduplica e registra o macro uma vez só. Mas o `resolve` **roda duas vezes** no mesmo request: uma pelo guard do `index.ts` e outra pelo `auth: true` do handler. Por isso o plugin memoiza a verificação do token por `Request` (numa `WeakMap`), e o token é verificado uma vez só. O teste `test/http-foundation.e2e.spec.ts` conta as chamadas de `verify` e garante isso.

As duas declarações têm papéis diferentes: o guard do `index.ts` é a **regra de proteção** do módulo (e o cadeado no OpenAPI), e o `auth: true` do handler é o que dá o **tipo** do `user` dentro dele.

## Organização das pastas

```
presentation/controllers/
├── register/register.handler.ts
├── login/login.handler.ts
├── me/me.handler.ts
└── find/
    ├── by-id/find-customer-by-id.handler.ts
    └── by-document/find-customer-by-document.handler.ts
```

Uma pasta por operação, com subpastas quando a mesma operação tem variações (ex: `find/by-id`, `find/by-document`). Testes de handler ficam no e2e (`test/*.e2e.spec.ts`), não ao lado do handler.

## Anti-pattern: service orquestrador

Não crie um `CustomerService` que só delega para `CreateCustomerUseCase`, `FindCustomerByDocumentUseCase` etc. Isso recria o "fat service" que a separação em Use Case existe pra evitar: toda rota passa a depender de todo Use Case do módulo, e a camada extra não agrega nada.

Um Use Case pode chamar outro Use Case, mas só quando existe uma dependência de negócio real (ex: abrir uma `ServiceOrder` precisa criar o `Vehicle` primeiro, se ele ainda não existir), nunca como passagem genérica. Ver [Use Case](use-case.md).
