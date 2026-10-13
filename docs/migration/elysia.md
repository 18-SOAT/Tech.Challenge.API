# Migração: `mechanic-system` (NestJS) → `Tech.Challenge.API` (Bun + Elysia)

## Por que migrar

O projeto começou em grupo com NestJS. Com o grupo desfeito, o desenvolvimento segue com uma pessoa, e a escolha passou a ser Bun + Elysia, uma stack que o autor já domina e que tem menos cerimônia por rota (sem módulo/provider/decorator por recurso). Também gera validação, tipos e OpenAPI a partir de um único schema.

**É migração, não reescrita.** A arquitetura (DDD tático + Clean Architecture + Ports & Adapters) foi feita para que o framework HTTP fosse só um adapter de entrada. O domínio não importa nada do Nest, então ele fica como está. Muda só a camada que fala HTTP e a forma de ligar as dependências.

**O histórico foi mantido.** A `main` deste repositório começa com o histórico completo do `18SOAT/mechanic-system` (até o `468f95f`, PR #38), com a autoria original de cada commit. A migração acontece **em cima** dele, PR a PR, então o `git blame` dos arquivos de domínio continua apontando para quem escreveu e por quê.

> Este documento é de trabalho e vale enquanto a migração estiver em andamento. Ao concluir a Fase 7, ele é resumido num ADR (`docs/adr/0001-stack-bun-elysia.md`: contexto, decisão, consequências) e removido, junto com os avisos de migração do `README.md` e do `CLAUDE.md`.

## De → para

| NestJS (`mechanic-system`) | Elysia (`Tech.Challenge.API`) | Doc |
|---|---|---|
| `xxx.module.ts` (`providers`, `{ provide: TOKEN, useClass }`) | `xxx.container.ts` (instancia na mão e injeta pelo construtor) | [README](../code/README.md#composition-root-modulocontainerts) |
| `@Global() PrismaModule` / `JwtTokenModule` | `shared/shared.container.ts` | [services-pattern](../code/infra/services-pattern.md) |
| Tokens `Symbol` (`USER_REPOSITORY`) + `@Inject` | removidos: o tipo da interface basta | [repository](../code/patterns/repository.md) |
| `@Injectable()` em use cases/adapters | classe TypeScript comum | [use-case](../code/patterns/use-case.md) |
| `@Controller` com vários métodos | `presentation/index.ts` + um handler (factory) por operação | [controller](../code/patterns/controller.md) |
| `APP_GUARD` global + `@Public()` | `.guard({ auth: true })` no `index.ts`, públicas fora | [controller](../code/patterns/controller.md#regra-rota-nova-nasce-protegida) |
| `JwtAuthGuard` + `@CurrentUser()` | macro `auth` com `resolve` → `({ user })` tipado | [auth](../code/patterns/auth.md) |
| `@nestjs/jwt` (`JwtService`) | `jose` no adapter `JoseTokenService` | [auth](../code/patterns/auth.md#adapter-josetokenservice) |
| `ValidationPipe` + `class-validator` + `@IsCpfCnpj` | schema TypeBox (`t`) + `FormatRegistry('cpf-cnpj')` | [dto](../code/patterns/dto.md) |
| `HttpException` (`Unauthorized`, `Conflict`, `BadRequest`) nos use cases | catalogs `DomainError` (`AuthError`, `UserError`, `CustomerError`) | [error-handling](../code/patterns/error-handling.md) |
| `DomainExceptionFilter` (`@Catch`) | plugin `errorHandler` (`onError`, `as: 'global'`) | [error-handling](../code/patterns/error-handling.md#errorhandler-plugin-global-que-mapeia-code--status-http) |
| `ResponseInterceptor` | helper `ok(data, status)` + `Envelope(schema)` | [error-handling](../code/patterns/error-handling.md#envelope-de-sucesso-ok) |
| `@nestjs/swagger` (`@ApiProperty`, `@ApiResponse`) | `@elysia/openapi` lendo os schemas da rota | [openapi](../code/libs/openapi.md) |
| `PrismaService extends PrismaClient` + `onModuleDestroy` | `createPrismaClient()` + `app.onStop` | [database](../code/infra/database.md) |
| pnpm | Bun (`bun install`, `bun.lock`) | [CLAUDE.md](../../CLAUDE.md#comandos) |
| Vitest + supertest | `bun test` + `app.handle(new Request())` | [CLAUDE.md](../../CLAUDE.md#testes) |
| `nest build` | sem build: Bun executa TS direto; `tsc --noEmit` só para checar tipos | — |
| Biome com `useImportType: off` (quebrava a DI) | `useImportType` ligado de novo (não há DI por decorator) | — |

## O que muda em cada parte do código existente

Como o histórico veio junto, "copiar" aqui significa **manter o arquivo e editar no lugar**. Os arquivos que não servem mais são removidos no PR da fase correspondente.

| Arquivo atual | O que acontece |
|---|---|
| `src/shared/domain/**`, `src/modules/*/domain/**` (entities, VOs, enums, validators, ports) + specs | mantém; VOs passam a lançar catalogs; os `Symbol` dos ports saem |
| `src/shared/application/use-case.interface.ts` | mantém sem mudança |
| `src/shared/presentation/controllers/health.controller.ts` + `test/health.e2e-spec.ts` | vira `shared/presentation/health/health.handler.ts` (pública, `GET /health`, envelope com `{ status: 'ok', dateTime }`) + e2e com `app.handle` |
| `src/modules/auth/application/**` | sem decorators, com catalogs no lugar das `HttpException` |
| `src/modules/*/infrastructure/**` (repos Prisma, mappers, `BcryptPasswordHasher`) | sem decorators, recebem o `PrismaClient` |
| `src/shared/infrastructure/jwt/token-service.port.ts` (+ `pickAuthClaims`) | mantém; `JwtTokenService` vira `JoseTokenService` |
| `src/modules/auth/presentation/dtos/*.response.dto.ts` + spec | mantém, com schema TypeBox ao lado de cada um |
| `src/modules/auth/presentation/dtos/*.request.dto.ts` | reescritos como schemas TypeBox (mesmas regras e mensagens) |
| `prisma/schema.prisma`, `prisma.config.ts` | mantém |
| `test/fakes/**` | mantém (sem `Symbol`) |
| `biome.json`, `.husky/*`, `.changeset/config.json`, `.github/**`, `.env.example` | adaptados para o Bun |
| `package.json` | `name` passa a `tech-challenge-api`; a versão (`1.0.0`) e o `CHANGELOG.md` continuam, para o versionamento seguir do ponto em que estava |
| `docs/code/**`, `docs/workflow/**`, `CLAUDE.md`, `README.md` | reescritos para o Elysia (Fase 1) |
| `docs/diagrams/database.drawio` | mantém sem mudança |

**É removido** (cada um no PR da fase que o substitui): `*.module.ts`, `main.ts`, `jwt-auth.guard.ts`, `jwt-token.module.ts`, `prisma.module.ts`/`prisma.service.ts`, decorators `@Public`/`@CurrentUser`, `is-cpf-cnpj.decorator.ts`, `nest-cli.json`, `tsconfig.build.json`, `vitest.config*.ts`, `pnpm-lock.yaml`, `pnpm-workspace.yaml`, e as dependências `@nestjs/*`, `class-validator`, `class-transformer`, `reflect-metadata`, `rxjs`, `supertest`, `vitest`.

## Versionamento

O projeto está em `1.0.0`. A migração muda o **formato das respostas**: toda resposta passa a vir no envelope `{ data, message, status }`, inclusive `/health` e `/auth/*`. Para quem consome a API isso é uma quebra de contrato, então o PR que expõe as rotas no Elysia (Fase 7) leva um changeset **major**, e a migração fecha em `2.0.0`. As fases internas (scaffold, domain, infra) são `patch`/`minor` ou `--empty`, conforme o impacto.

## Fases

Cada fase é uma branch + PR com changeset. Marque o checkbox no PR que concluir a fase.

### Fase 1: `docs/migracao-elysia`
- [ ] `CLAUDE.md`, `README.md`, `docs/code/**`, `docs/workflow/**`, `docs/migration/elysia.md`, num PR sobre a `main` com o histórico importado (changeset `--empty`)
- Os hooks e o CI ainda são os da versão Nest (pnpm) até a Fase 2. Commite com o pnpm instalado ou com `HUSKY=0`.

### Fase 2: `chore/scaffold-bun-elysia`
- [ ] Trocar as dependências no `package.json` existente (sai Nest/pnpm, entram `elysia`, `@elysia/openapi`, `jose`, `@types/bun`), com pin das versões. Não usar `bun create elysia`, porque ele geraria um projeto novo por cima do existente.
- [ ] Remover `pnpm-lock.yaml`/`pnpm-workspace.yaml`, gerar `bun.lock`; `name` → `tech-challenge-api`
- [ ] `tsconfig.json`: `module`/`moduleResolution: "bundler"`, `types: ["bun-types"]`, `strict`, sem `experimentalDecorators`/`emitDecoratorMetadata`
- [ ] `biome.json` (copiado; sai `unsafeParameterDecoratorsEnabled`, `useImportType` ligado)
- [ ] Husky `pre-commit` (bloqueia main, regex de branch, rejeita `package-lock.json`/`yarn.lock`/`pnpm-lock.yaml`, `bunx lint-staged`) e `pre-push` (bloqueia main, `bun test`)
- [ ] Changesets (`.changeset/config.json`, scripts)
- [ ] `.github/workflows/ci.yml` (`oven-sh/setup-bun`: install `--frozen-lockfile`, `bun run ci`, `bun run typecheck`, `bun test`, changeset-check) e `release.yml`; `PULL_REQUEST_TEMPLATE.md`
- [ ] `.env.example` (`DATABASE_URL`, `JWT_SECRET`, `JWT_EXPIRES_IN`, `PORT`)

### Fase 3: `build/prisma`
- [ ] `prisma/schema.prisma`, `prisma.config.ts`, `postinstall: prisma generate`, `src/generated/` no `.gitignore`
- [ ] `shared/infrastructure/prisma/client.ts` (`createPrismaClient`)

### Fase 4: `refactor/import-domain`
- [ ] Copiar domain + specs + `test/fakes/`
- [ ] `DomainError` + catalogs `AuthError`, `UserError`, `CustomerError`, `SharedError`
- [ ] VOs (`Email`, `Password`, `Document`, `Phone`) lançando catalogs
- [ ] Remover os `Symbol` dos ports
- [ ] Specs com `bun:test`

### Fase 5: `refactor/application-infrastructure`
- [ ] Use cases + `AuthClaimsResolver` sem Nest, lançando catalogs (some o `try/catch` de `buildValueObjects`)
- [ ] Repos Prisma, mappers, `BcryptPasswordHasher` sem decorators; mapear `P2002` → `DomainError`
- [ ] `JoseTokenService` (falha no boot sem `JWT_SECRET`)
- [ ] `shared.container.ts` + `auth.container.ts`

### Fase 6: `feat/http-foundation`
- [ ] `shared/presentation/http/envelope.ts` (`ok`, `Envelope`, `ApiError`)
- [ ] `shared/presentation/http/error-handler.plugin.ts` (`STATUS_MAP` + teste que cobre todos os `XxxErrorCode`)
- [ ] `shared/presentation/http/formats.ts` (`cpf-cnpj`, `phone`)
- [ ] `shared/presentation/auth/auth.plugin.ts` (macro `auth`)
- [ ] `src/app.ts` (`createApp(deps)`: errorHandler → openapi → health → módulos) e `src/server.ts`
- [ ] `GET /health` (pública) migrada + `test/health.e2e.spec.ts`

### Fase 7: `feat/auth-routes`
- [ ] `modules/auth/presentation/index.ts` + handlers `register`, `login`, `me`
- [ ] Schemas de request (mesmas regras e mensagens dos DTOs atuais) e response
- [ ] `test/auth.e2e.spec.ts`: 201/400/409 no register, 200/401 no login, 200/401 (sem token e token inválido) no me
- [ ] Confirmar no e2e que o guard do `index.ts` + `auth: true` no handler não verificam o token duas vezes; atualizar o [controller.md](../code/patterns/controller.md#handler-que-precisa-do-usuário-logado) se o comportamento for outro
- [ ] `/openapi` mostrando o envelope em cada status e o cadeado no `/auth/me`
- [ ] Remover o que sobrou do Nest (ver "É removido") e conferir com `grep -r "@nestjs" src test` vazio
- [ ] Changeset **major** (fecha em `2.0.0`)
- [ ] Escrever o ADR `docs/adr/0001-stack-bun-elysia.md`, remover este arquivo e os avisos de migração do `README.md`/`CLAUDE.md`

### Depois da migração (fora deste plano)
- Criar as tasks do restante do escopo
- `GET /health` checando o banco (`SELECT 1`); hoje ele só responde que o processo está de pé
- Dockerfile (`oven/bun`) + `docker-compose` (app + Postgres)
- Rate limiting no login
- CRUDs (clientes, veículos, serviços, peças/estoque) e o domínio de OS

## Como verificar ao final da Fase 7

1. `bun run ci && bun run typecheck && bun test` verdes, e o CI verde no PR.
2. `bun run test:cov` cobrindo os domínios críticos (meta de 80%).
3. `bun run dev` → `/openapi`: as rotas `/auth/*` com o envelope em cada status, e o `/auth/me` com cadeado.
4. Com Postgres local (`bun run prisma:migrate`):
   - `POST /auth/register` → 201; repetido → 409; CPF inválido → 400
   - `POST /auth/login` → 200 com `accessToken`; senha errada → 401 `Credenciais inválidas.`
   - `GET /auth/me` com Bearer → 200; sem token ou com token inválido → 401
