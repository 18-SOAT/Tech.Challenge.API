# Autenticação

JWT trafega no header `Authorization: Bearer <token>`. Há duas peças, uma em cada lado do hexágono:

| Peça | Camada | Responsabilidade |
|---|---|---|
| `TokenService` (port) + `JoseTokenService` (adapter) | `shared/infrastructure/jwt/` | Assinar e verificar o token. Não sabe nada de HTTP. |
| Plugin `auth` (macro) | `shared/presentation/auth/` | Extrair o Bearer do request, chamar `TokenService.verify` e colocar o `user` no contexto da rota. |

## Port e claims

```typescript
// shared/infrastructure/jwt/token-service.port.ts
export type AuthTokenPayload = CustomerClaims | EmployeeClaims; // union discriminada por `type`

export interface TokenService {
  sign(payload: AuthTokenPayload): Promise<string>;
  verify(token: string): Promise<AuthTokenPayload>; // lança se inválido/expirado
}
```

O JWT é **assinado, não criptografado**: qualquer pessoa decodifica o payload. Só vão nele identificadores internos (`sub`, `email`, `type`, `customerId` ou `employeeId` + `role`), nunca CPF/CNPJ, telefone ou hash. O `pickAuthClaims()` faz whitelist dos claims na escrita e na leitura (descarta `iat`/`exp` e campos extras).

## Adapter: `JoseTokenService`

Usa a lib `jose` (HS256), e não o `@elysiajs/jwt`, de propósito: o adapter fica em `infrastructure/` e não pode depender do framework HTTP. Ele recebe o segredo e a expiração no construtor. O `shared.container.ts` lê o `JWT_SECRET` e **falha no boot** se ele estiver ausente, porque subir sem segredo assinaria tokens inseguros.

## Plugin `auth`: macro

```typescript
// shared/presentation/auth/auth.plugin.ts
export const authPlugin = (tokenService: TokenService) => {
  const verified = new WeakMap<Request, Promise<AuthTokenPayload>>();

  const verifyOnce = (request: Request, authorization?: string) => {
    let pending = verified.get(request);
    if (!pending) {
      const token = extractBearerToken(authorization); // lança AuthError.tokenMissing()
      pending = tokenService.verify(token).catch(() => {
        throw AuthError.tokenInvalid();
      });
      verified.set(request, pending);
    }
    return pending;
  };

  const authorize = async (options: AuthOptions, request: Request, authorization?: string) => {
    const user = await verifyOnce(request, authorization);
    if (options !== true && !(user.type === UserType.EMPLOYEE && options.roles.includes(user.role))) {
      throw AuthError.forbidden();
    }
    return user;
  };

  return new Elysia({ name: 'auth' }).macro({
    auth: (options: AuthOptions) => ({
      // Antes da validação: 401/403 vêm antes de qualquer 400.
      async transform({ headers, request }) {
        await authorize(options, request, headers.authorization);
      },
      // Depois da validação: injeta o `user` tipado (verificação já memoizada).
      async resolve({ headers, request }) {
        return { user: await authorize(options, request, headers.authorization) };
      },
    }),
  });
};

export type AuthPlugin = ReturnType<typeof authPlugin>;
```

### Conceitos

- **Macro** é um "decorator de rota" do Elysia: uma propriedade customizada (`auth`) que, quando aparece nas opções da rota ou de um `.guard()`, injeta hooks naquela rota.
- **Ciclo de vida:** `parse → transform → validação (body/params) → resolve → handler`. A autenticação precisa acontecer **antes** da validação, senão uma requisição sem token e com body inválido recebe 400 em vez de 401 (o servidor valida dados de quem nem se autenticou e expõe as regras do schema). Por isso o macro tem dois hooks:
  - **`transform`** roda antes da validação e barra quem não pode (401 sem token ou token inválido, 403 papel errado).
  - **`resolve`** roda depois da validação e antes do handler, e o que ele retorna **entra no contexto tipado**: o handler recebe `({ user })` com o tipo `AuthTokenPayload` inferido. Nada de `request.user` sem tipo nem cast. O `transform` não serve para isso porque o que ele retorna não entra no contexto.
  - O `test/http-foundation.e2e.spec.ts` garante a ordem (sem token + body inválido → 401; papel errado + body inválido → 403).
- **Lançar `AuthError`** em vez de `return status(401)`: o erro passa pelo `errorHandler` global, então a resposta sai no envelope padrão e o código entra no `STATUS_MAP` (ver [Tratamento de erros](error-handling.md)).
- **`verifyOnce` (memo por `Request`)**: `transform` + `resolve`, e ainda o guard do `index.ts` + o `auth: true` do handler, chamam a verificação várias vezes no mesmo request (ver [Controller](controller.md#handler-que-precisa-do-usuário-logado)). A `WeakMap` guarda a verificação daquele request, e ela é liberada junto com o request.
- **`name: 'auth'`**: o Elysia deduplica plugins com o mesmo nome, então todos os módulos podem fazer `.use(auth)` com a mesma instância sem registrar o macro várias vezes. A instância é criada uma vez no `createApp` e repassada aos módulos.

## Uso

```typescript
// Qualquer usuário autenticado
.guard({ auth: true, detail: { security: [{ bearerAuth: [] }] } }, (app) => app.use(meHandler(...)))

// Só funcionários com papel ADMIN
.guard({ auth: { roles: [EmployeeRole.ADMIN] }, detail: { security: [{ bearerAuth: [] }] } }, (app) =>
  app.use(listEmployeesHandler(...)),
)
```

As regras de onde cada rota entra (pública fora do guard, protegida dentro) e como o handler acessa o `user` tipado estão em [Controller](controller.md).

## Login: proteções que ficam no use case

Essas regras são de negócio, não de HTTP, e já existem no `LoginUseCase`:

- **Mensagem única** (`Credenciais inválidas.`) para e-mail inexistente, senha errada, usuário inativo ou sem perfil. Não revela qual foi o caso.
- **Anti-timing**: e-mail inexistente ainda executa um `compare` contra um hash descartável, para que a resposta não seja mais rápida e denuncie quais e-mails existem.
- O `/auth/me` **relê o usuário do banco** em vez de ecoar o token, refletindo desativação ou troca de role feitas depois da emissão.

Pendente: rate limiting no `/auth/login` contra força bruta.
