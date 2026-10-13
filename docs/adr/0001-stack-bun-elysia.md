# ADR 0001 — Stack HTTP: de NestJS para Bun + Elysia

- **Status:** aceito
- **Data:** 2026-10-13
- **Versão:** `2.0.0`

## Contexto

O projeto começou em grupo como `18SOAT/mechanic-system`, em NestJS 12 + pnpm + Vitest. Ele já tinha domínio (User, Customer, Employee, VOs de e-mail, senha, CPF/CNPJ e telefone), schema Prisma completo, autenticação JWT (`/auth/register`, `/auth/login`, `/auth/me`) e `/health`. Com o grupo desfeito, o desenvolvimento segue com uma pessoa, e o custo de cerimônia por recurso do Nest (module, providers com token, controller, DTO com decorators, decorators de Swagger paralelos ao código) passou a pesar mais que os benefícios do container de DI.

A arquitetura (DDD tático + Clean Architecture + Ports & Adapters) já isolava o framework na camada de entrada: o `domain/` não importava nada do Nest.

## Decisão

Trocar a camada HTTP e o tooling para **Bun + Elysia**, mantendo a arquitetura:

- **Runtime, pacotes e testes:** Bun (`bun install`, `bun test`). Typecheck explícito com `tsc --noEmit`, porque o Bun não checa tipos ao executar.
- **HTTP:** Elysia, restrito a `presentation/`. Cada módulo tem um `index.ts` (prefix, tags, `.guard()` para rotas protegidas) e um handler por operação como factory de plugin.
- **Validação, tipos e OpenAPI a partir de um único schema TypeBox** por rota (`@elysia/openapi`). Formatos customizados (`cpf-cnpj`, `phone`) chamam as mesmas funções puras dos Value Objects.
- **Sem container de DI:** composition root explícito por módulo (`<modulo>.container.ts`) e `createApp(deps)` testável com fakes via `app.handle`.
- **Erros:** `DomainError` + catalogs por módulo, convertidos por um plugin `errorHandler` global com `STATUS_MAP` fail-loud.
- **Envelope `{ data, message, status }` em toda resposta**, montado explicitamente pelo helper `ok()`, para que o retorno real, o schema validado e o OpenAPI sejam a mesma coisa.
- **JWT:** adapter `JoseTokenService` (`jose`) atrás do port `TokenService`, consumido pelo macro `auth` (Bearer, roles, verificação memoizada por request).

A migração foi feita **sobre o histórico do `mechanic-system`**, importado com a autoria original, em commits por fase num único PR.

## Consequências

**Positivas**
- Menos código por rota, e um único contrato por rota: o que o OpenAPI documenta é o que é validado e o que o tipo do handler aceita e retorna.
- O domínio não mudou. Só os VOs passaram a lançar `DomainError`, que era um TODO antigo.
- Use cases testáveis sem framework, e e2e sem banco e sem servidor (`makeTestApp()` + `app.handle`).
- Sem a armadilha do Biome `useImportType` quebrando a DI por reflection; a regra voltou a ser ligada.

**Negativas / cuidados**
- **Quebra de contrato:** todas as respostas (`/health` e `/auth/*`) passaram a vir no envelope. Por isso a versão é `2.0.0` (major).
- **Não há guard global.** A regra "rota nova nasce protegida" é convenção (entra no `.guard()` do `index.ts`) mais um e2e obrigatório de 401 sem token.
- **Campos fora do schema são descartados, não rejeitados** (normalização padrão do Elysia). Isso protege contra mass assignment da mesma forma, mas o cliente não recebe 400 por campo extra.
- O `resolve` do macro roda uma vez por camada (guard e handler). A verificação do token é memoizada por `Request` para não repetir o trabalho.
- O threshold de cobertura do `bun test` é por arquivo: exige 80% de linhas, sem threshold de funções.
