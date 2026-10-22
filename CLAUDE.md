# Contexto do projeto

**Tech Challenge FIAP** — MVP de back-end para uma oficina mecânica de médio porte, que hoje controla tudo por planilha/papel e quer um **Sistema Integrado de Atendimento e Execução de Serviços**: cliente acompanha a OS em tempo real, autoriza reparos extras, e a oficina ganha gestão interna eficiente. Vale 90% da nota da fase.

Stack: **Bun** (runtime + gerenciador de pacotes + test runner) + **Elysia** + TypeScript. Validação e contratos HTTP com **TypeBox** (`t` do Elysia), documentação da API com **`@elysia/openapi`** (Scalar em `/openapi`), JWT com **`jose`**, lint + format com **Biome**. Git hooks com **Husky** (pre-commit roda lint-staged, pre-push roda os testes). CI no **GitHub Actions** (`.github/workflows/ci.yml`). Versionamento com **Changesets** (`.changeset/`, `.github/workflows/release.yml`). Banco de dados **PostgreSQL** via **Prisma ORM**, containerizado com **Docker**/`docker-compose`, autenticação **JWT** (Bearer) nas rotas administrativas.

O projeto segue **DDD (Domain-Driven Design)** tático, com **Clean Architecture + Ports & Adapters** (monolito modular, camadas `domain/application/infrastructure/presentation` por módulo). O Elysia fica restrito à camada `presentation/` — domínio e aplicação não conhecem o framework.

> Decisões de arquitetura registradas em [`docs/adr/`](docs/adr/) — ex: [ADR 0001](docs/adr/0001-stack-bun-elysia.md), a troca de NestJS para Bun + Elysia.

## Escopo funcional obrigatório

- **Criação de OS**: identificar cliente por CPF/CNPJ, cadastrar veículo (placa, marca, modelo, ano), incluir serviços solicitados e peças/insumos, gerar orçamento automático, enviar pro cliente aprovar.
- **Acompanhamento de OS**: status `Recebida → Em diagnóstico → Aguardando aprovação → Em execução → Finalizada → Entregue`, transição automática conforme ações do sistema, consulta do progresso via API pelo cliente.
- **Gestão administrativa**: CRUD de clientes, veículos, serviços, peças/insumos (com controle de estoque), listagem/detalhe de OS, tempo médio de execução dos serviços.
- **Segurança e qualidade**: JWT nas APIs administrativas, validação de dados sensíveis (CPF/CNPJ, placa), testes unitários e de integração nos fluxos principais, cobertura mínima de 80% nos domínios críticos.

## Entregáveis da fase

> **Fonte de verdade:** o enunciado `Fase 1 - Tech Challenge-1.pdf` (fora do repositório, em `~/Desktop/Fiap/`). Em caso de dúvida sobre requisito, consulte o PDF, não este resumo.

A entrega é **um único PDF** com identificação (curso SOAT, fase 1, grupo, nomes, RMs, Discord, tecnologias) e os links abaixo. A avaliação considera **só a branch e o hash de commit informados nele**.

- **Repositório** (`github.com/18-SOAT/Tech.Challenge.API`): **público** durante toda a correção, sem credenciais/tokens/dados sensíveis, versão identificada por branch/tag/hash. Com Dockerfile, `docker-compose.yml`, testes com cobertura ≥ 80% nos domínios críticos, documentação OpenAPI e o relatório da análise de vulnerabilidades.
- **`main` protegida**: tudo chega nela via Pull Request.
- **README.md** com, no mínimo: objetivo, descrição da solução, arquitetura, tecnologias, pré-requisitos, como executar, como rodar os testes, como acessar a documentação da API, decisão e justificativa do banco, usuários/credenciais de demonstração ou procedimento de autenticação, estrutura de diretórios, link da documentação DDD e link do vídeo.
- **Documentação DDD**: link no Miro (ou equivalente) acessível sem pedir permissão, **e** exportada no repositório em `docs/ddd/` (`event-storming.pdf`, `diagramas.pdf`, `linguagem-ubiqua.md`). Deve cobrir Event Storming da criação da OS, do acompanhamento da OS e da gestão de peças/insumos; eventos, comandos, políticas, atores, agregados, entidades, objetos de valor, bounded contexts, linguagem ubíqua, glossário e a relação com o código. Diagramas genéricos ou que não batem com o código não contam.
  - O item "diagramas solicitados na disciplina de DDD" cobre: **Domain Storytelling** As-Is e To-Be (linguagem pictográfica: atores, objetos de trabalho, atividades), **classificação de subdomínios** (Core/Suporte/Genérico) e **Context Map com padrões** (OHS, Cliente/Fornecedor, Conformista, ACL).
  - Fontes versionadas em `docs/ddd/`: `event-storming.drawio`, `diagramas.drawio` (draw.io) e `domain-storytelling/*.egn` (egon.io); SVGs exportados em `event-storming/`, `diagramas/` e `domain-storytelling/`; índice visual em `docs/ddd/README.md` (como exportar está lá). O link externo é o viewer do diagrams.net sobre o raw do GitHub. **Na entrega, troque `main` pela tag/hash entregue nesses links.** Ao alterar uma fonte, exporte o PDF de novo.
  - **A linguagem ubíqua manda nos nomes:** termo novo do domínio entra primeiro em `docs/ddd/linguagem-ubiqua.md`. A tabela "Relação com o código" já traz o caminho final de cada elemento: ao implementar, crie o arquivo nesse caminho. Se o caminho ou o modelo mudar, atualize a tabela e os diagramas no mesmo PR. A documentação descreve o modelo, não o progresso: o progresso fica nas issues.
- **Vídeo** no YouTube (público, ≤ 15 min, correspondente ao commit informado): proposta, arquitetura e camadas, escolha do banco, Event Storming, elementos de DDD, fluxo de criação/acompanhamento da OS, serviços/peças/insumos, orçamento (geração e aprovação), mudança de status, autenticação, execução, OpenAPI, testes e resultado da análise de vulnerabilidades.

Requisitos funcionais que o PDF detalha além do escopo acima: **registro da aprovação ou rejeição do orçamento**, **validação da placa do veículo** e **tratamento adequado das transações** nos fluxos principais.

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
- `bun run test:integration` — testes de integração contra Postgres real (`test/integration/`; banco `TEST_DATABASE_URL`, padrão `mechanic_system_test`)
- `bun run lint` — biome lint
- `bun run format` — biome format --write
- `bun run check` — biome check --write (lint + format, usado pelo lint-staged)
- `bun run ci` — biome ci (mesma checagem do CI, sem escrever nada)
- `bun run changeset` — cria um novo arquivo de changeset
- `bun run changeset:status` — mostra se há changeset pendente comparado ao `main` (o que o CI roda em PRs)
- `bun run version` — aplica os changesets pendentes: bump de versão + `CHANGELOG.md`
- `bun run prisma:generate` / `prisma:validate`
- `bun run prisma:migrate --name <descricao>` — `prisma migrate dev`: gera uma nova migration em `prisma/migrations/` a partir do schema (só em desenvolvimento)
- `bun run prisma:deploy` — `prisma migrate deploy`: só aplica as migrations versionadas (o que o container `migrate` roda)
- `bun run db:seed` — cria o ADMIN e o MECHANIC de demonstração (idempotente; `prisma/seed.ts`)
- `docker compose up --build` — ambiente completo: postgres → migrate (migrations + seed) → api

> Use sempre `bun run <script>` para scripts do `package.json`. `bun test` (sem `run`) é o test runner nativo; `bun run ci` (com `run`) é necessário porque `bun ci` é outro comando do próprio Bun.

## Testes

- Regras de negócio de domínio (entidades, value objects, use cases) têm teste unitário com `bun test`, sem subir o Elysia — teste a classe isolada, com os fakes de `test/fakes/`.
- Testes de rota ficam em `test/*.e2e.spec.ts`: montam a app com `makeTestApp()` (`test/fakes/make-test-app.ts` — o `createApp` com fakes no lugar dos adapters) e chamam `app.handle(jsonRequest(...))` (`test/helpers/http.ts`) — sem servidor HTTP real, sem banco.
- Todo módulo com rota protegida tem e2e chamando a rota **sem token** e esperando 401.
- Testes de integração ficam em `test/integration/*.integration.spec.ts`: usam os adapters Prisma contra um banco `*_test` (`test/integration/database.ts` cria o banco, aplica as migrations e esvazia as tabelas). Ficam fora do `bun test` (`pathIgnorePatterns` no `bunfig.toml`) e rodam com `bun run test:integration`. Use para provar o que o fake não prova: rollback de transação e corrida resolvida por update condicional.
- Cobertura: `bun run test:cov` exige 80% de linhas **por arquivo** (`bunfig.toml`); o CI roda `bun test --coverage`.
- Imports de teste vêm de `bun:test` (`describe`, `it`, `expect`, `beforeEach`, `mock`).

## Fluxo de Changesets

Toda mudança relevante em PR precisa de `bun run changeset` (ou `bunx changeset add --empty` se for só doc). Detalhe em [`docs/workflow/changesets.md`](docs/workflow/changesets.md).

## Convenção de nomes de branch

`<tipo>/<descricao>`, com `<tipo>` em `feat, fix, docs, chore, refactor, test, ci, build, perf, style` — validado no `.husky/pre-commit`. Detalhe em [`docs/workflow/branching.md`](docs/workflow/branching.md).

## Convenção de commit e idioma de PR

Commits seguem Conventional Commits com os mesmos tipos da branch; comentário e descrição de PR são em português. Detalhe em [`docs/workflow/commits.md`](docs/workflow/commits.md) e [`docs/workflow/pull-requests.md`](docs/workflow/pull-requests.md).
