# Contexto do projeto

**Tech Challenge FIAP** — MVP de back-end para uma oficina mecânica de médio porte, que hoje controla tudo por planilha/papel e quer um **Sistema Integrado de Atendimento e Execução de Serviços**: cliente acompanha a OS em tempo real, autoriza reparos extras, e a oficina ganha gestão interna eficiente. Vale 90% da nota da fase.

Stack: **Bun** (runtime + gerenciador de pacotes + test runner) + **Elysia** + TypeScript. Validação e contratos HTTP com **TypeBox** (`t` do Elysia), documentação da API com **`@elysia/openapi`** (Scalar em `/openapi`), JWT com **`jose`**, lint + format com **Biome**. Git hooks com **Husky** (pre-commit roda lint-staged, pre-push roda os testes). CI no **GitHub Actions** (`.github/workflows/ci.yml`). Versionamento com **Changesets** (`.changeset/`, `.github/workflows/release.yml`). Banco de dados **PostgreSQL** via **Prisma ORM**, containerizado com **Docker**/`docker-compose`, autenticação **JWT** (Bearer) nas rotas administrativas.

O projeto segue **DDD (Domain-Driven Design)** tático, com **Clean Architecture + Ports & Adapters** (monolito modular, camadas `domain/application/infrastructure/presentation` por módulo). O Elysia fica restrito à camada `presentation/` — domínio e aplicação não conhecem o framework.

> Este repositório é a continuação do `mechanic-system` (NestJS), migrado para Bun + Elysia. O plano e o status da migração estão em [`docs/migration/elysia.md`](docs/migration/elysia.md).

## Escopo funcional obrigatório

- **Criação de OS**: identificar cliente por CPF/CNPJ, cadastrar veículo (placa, marca, modelo, ano), incluir serviços solicitados e peças/insumos, gerar orçamento automático, enviar pro cliente aprovar.
- **Acompanhamento de OS**: status `Recebida → Em diagnóstico → Aguardando aprovação → Em execução → Finalizada → Entregue`, transição automática conforme ações do sistema, consulta do progresso via API pelo cliente.
- **Gestão administrativa**: CRUD de clientes, veículos, serviços, peças/insumos (com controle de estoque), listagem/detalhe de OS, tempo médio de execução dos serviços.
- **Segurança e qualidade**: JWT nas APIs administrativas, validação de dados sensíveis (CPF/CNPJ, placa), testes unitários e de integração nos fluxos principais, cobertura mínima de 80% nos domínios críticos.

## Entregáveis da fase

Vídeo (≤15min), documentação DDD (Event Storming dos fluxos de OS e de peças/insumos, diagramas, linguagem ubíqua), código-fonte em repositório privado (Dockerfile + docker-compose + README), relatório de análise de vulnerabilidades, e um PDF com grupo/links/relatório.

⚠️ O repositório privado (`github.com/18-SOAT/Tech.Challenge.API`) precisa dar acesso ao usuário **soatarchitecture**.

A estrutura de pastas, os padrões de código (Use Case, Repository, Handler, tratamento de erro, etc.) e o fluxo de git (branch, commit, PR, changesets) estão documentados em [`docs/code/README.md`](docs/code/README.md) e [`docs/workflow/README.md`](docs/workflow/README.md), respectivamente.

## Você deve ser um professor

Sempre que for implementar algo, **explique o conceito antes de codar**:
- Diga qual conceito de DDD ou do Elysia está envolvido (ex: por que isso é um Value Object e não uma string solta; por que a regra fica na entidade e não no use case; por que um hook precisa de `as: 'global'`).
- Explique o motivo da escolha (trade-offs), não só o "como".
- Depois disso, implemente.
- Responda em português.

## Comandos

- `bun install` — instalar dependências (roda `prisma generate` no postinstall)
- `bun run dev` — subir em modo watch (`bun --watch src/server.ts`)
- `bun run start` — subir sem watch
- `bun run typecheck` — `tsc --noEmit` (**o Bun executa TypeScript sem checar tipos** — esse script é o único que pega erro de tipo)
- `bun test` — testes unitários + e2e (`*.spec.ts`)
- `bun run test:cov` — cobertura (`bun test --coverage`)
- `bun run lint` — biome lint
- `bun run format` — biome format --write
- `bun run check` — biome check --write (lint + format, usado pelo lint-staged)
- `bun run ci` — biome ci (mesma checagem do CI, sem escrever nada)
- `bun run changeset` — cria um novo arquivo de changeset
- `bun run changeset:status` — mostra se há changeset pendente comparado ao `main` (o que o CI roda em PRs)
- `bun run version` — aplica os changesets pendentes: bump de versão + `CHANGELOG.md`
- `bun run prisma:generate` / `prisma:migrate` / `prisma:validate`

> Use sempre `bun run <script>` para scripts do `package.json`. `bun test` (sem `run`) é o test runner nativo; `bun run ci` (com `run`) é necessário porque `bun ci` é outro comando do próprio Bun.

## Testes

- Regras de negócio de domínio (entidades, value objects, use cases) têm teste unitário com `bun test`, sem subir o Elysia — teste a classe isolada, com os fakes de `test/fakes/`.
- Testes de rota ficam em `test/*.e2e.spec.ts`: montam a app com `createApp(depsFake)` e chamam `app.handle(new Request(...))` — sem servidor HTTP real, sem supertest, sem banco.
- Imports de teste vêm de `bun:test` (`describe`, `it`, `expect`, `beforeEach`, `mock`).

## Fluxo de Changesets

Toda mudança relevante em PR precisa de `bun run changeset` (ou `bunx changeset add --empty` se for só doc). Detalhe em [`docs/workflow/changesets.md`](docs/workflow/changesets.md).

## Convenção de nomes de branch

`<tipo>/<descricao>`, com `<tipo>` em `feat, fix, docs, chore, refactor, test, ci, build, perf, style` — validado no `.husky/pre-commit`. Detalhe em [`docs/workflow/branching.md`](docs/workflow/branching.md).

## Convenção de commit e idioma de PR

Commits seguem Conventional Commits com os mesmos tipos da branch; comentário e descrição de PR são em português. Detalhe em [`docs/workflow/commits.md`](docs/workflow/commits.md) e [`docs/workflow/pull-requests.md`](docs/workflow/pull-requests.md).
