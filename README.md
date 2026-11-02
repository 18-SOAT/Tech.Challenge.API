# Tech Challenge API — Oficina Mecânica

Back-end do **Tech Challenge FIAP — SOAT (Software Architecture), Fase 1**: o MVP de um sistema integrado de atendimento e execução de serviços para uma oficina mecânica de médio porte.

> 🎥 **Vídeo da entrega:** _link a definir_ · 🧭 **Documentação DDD:** [`docs/ddd/`](docs/ddd/README.md)

## Sumário

- [Objetivo](#objetivo)
- [Descrição da solução](#descrição-da-solução)
- [Arquitetura](#arquitetura)
- [Tecnologias](#tecnologias)
- [Banco de dados: decisão e justificativa](#banco-de-dados-decisão-e-justificativa)
- [Pré-requisitos](#pré-requisitos)
- [Execução](#execução)
- [Autenticação e usuários de demonstração](#autenticação-e-usuários-de-demonstração)
- [Documentação da API (OpenAPI)](#documentação-da-api-openapi)
- [Testes](#testes)
- [Segurança e análise de vulnerabilidades](#segurança-e-análise-de-vulnerabilidades)
- [Estrutura de diretórios](#estrutura-de-diretórios)
- [Ambiente de desenvolvimento (VS Code)](#ambiente-de-desenvolvimento-vs-code)
- [Documentação](#documentação)

## Objetivo

Hoje a oficina controla atendimento, diagnóstico, execução e entrega dos veículos com anotações manuais e planilhas. Isso causa erros na priorização dos atendimentos, falhas no controle de peças e insumos, dificuldade em acompanhar o status dos serviços, perda do histórico de clientes e veículos e um fluxo de orçamentos e autorizações ineficiente.

O objetivo deste MVP é **digitalizar esse fluxo de ponta a ponta**. A oficina passa a ter gestão interna segura, e o cliente acompanha o andamento e autoriza os reparos pela API.

| Problema da oficina | Como o sistema resolve |
|---|---|
| Priorização dos atendimentos | Fila de Ordens de Serviço por status e por mecânico responsável |
| Controle de peças e insumos | Estoque com razão (ledger) de movimentos, baixado de forma atômica na aprovação do orçamento |
| Acompanhamento do status | Máquina de estados com histórico de cada transição, consultável pelo cliente |
| Perda de histórico | Clientes, veículos e todas as Ordens persistidos no PostgreSQL |
| Orçamentos e autorizações | Orçamento calculado automaticamente e aprovado ou rejeitado pelo próprio cliente via API |

## Descrição da solução

Uma API REST monolítica em TypeScript que cobre:

**Criação da Ordem de Serviço**
- Cliente identificado por **CPF ou CNPJ**, com dígitos verificadores validados (`/customers`).
- Veículo com placa (padrão antigo e **Mercosul**, validada), marca, modelo e ano (`/vehicles`).
- O atendente abre a **Ordem** (a passagem do veículo pela oficina) em `POST /orders`, que nasce com a primeira **Ordem de Serviço** (OS).
- O mecânico inclui **serviços** e **peças/insumos** na OS (`POST /service-orders/:id/services` e `/products`).
- O **orçamento é gerado automaticamente** a partir dos itens. Ao concluir o diagnóstico, ele fica disponível para o cliente aprovar.
- O cliente **aprova ou rejeita** (`POST /service-orders/:id/approve` e `/reject`), e a decisão fica registrada. Na aprovação, o valor é congelado e o estoque é baixado numa única transação.
- Reparos adicionais descobertos durante a execução viram uma nova OS dentro da mesma Ordem (`POST /orders/:id/service-orders`), com orçamento próprio.

**Acompanhamento**

Os status do enunciado são distribuídos entre a Ordem e as suas Ordens de Serviço, e cada mudança é feita pela ação correspondente do sistema (nunca por um "set status" livre):

| Status do enunciado | Onde fica no modelo | Ação que leva a ele |
|---|---|---|
| Recebida | `Order.RECEIVED` | Abrir a Ordem |
| Em diagnóstico | `ServiceOrder.IN_DIAGNOSIS` | A OS nasce em diagnóstico |
| Aguardando aprovação | `ServiceOrder.AWAITING_APPROVAL` | `complete-diagnosis` |
| Em execução | `ServiceOrder.IN_EXECUTION` | `approve` (ou `REJECTED` com `reject`) |
| Finalizada | `ServiceOrder.FINISHED` | `finish` |
| Entregue | `Order.DELIVERED` | `POST /orders/:id/deliver` |

As regras de transição ficam nas entidades de domínio, e uma transição inválida responde com erro. Cada mudança grava uma linha no histórico de status. O cliente consulta as próprias Ordens em `GET /me/orders` e `GET /me/orders/:id`.

**Gestão administrativa**
- CRUD de clientes, veículos, serviços (`/services`) e peças/insumos (`/products`), com controle de estoque.
- Listagem e detalhamento de Ordens e de Ordens de Serviço, incluindo a fila do mecânico (`/service-orders/queue`).
- **Tempo médio de execução** dos serviços (`GET /service-orders/execution-time`).
- Funcionários (`/employees`) com papéis **ADMIN** (atendente/gestor) e **MECHANIC**.

## Arquitetura

**Monolito modular** com **DDD tático** e **Clean Architecture + Ports & Adapters**.

- **Por que monolito:** o enunciado pede um MVP monolítico. Separar em módulos por contexto de negócio (`customer`, `vehicle`, `inventory`, `service-order`, `auth`, `employee`) mantém o deploy simples e, ao mesmo tempo, deixa cada contexto isolado o bastante para virar um serviço no futuro.
- **Por que DDD:** a complexidade está nas regras (transições de status, orçamento, estoque, quem pode decidir). Por isso elas moram em **entidades, agregados e value objects**, com os nomes da [linguagem ubíqua](docs/ddd/linguagem-ubiqua.md), e não espalhadas em controllers.
- **Por que Clean Architecture:** o domínio não depende de framework nem de banco. Isso permite testar as regras isoladamente e trocar o adaptador HTTP ou o de persistência sem mexer no núcleo. Foi o que permitiu migrar de NestJS para Elysia sem alterar o domínio ([ADR 0001](docs/adr/0001-stack-bun-elysia.md)).

Cada módulo tem quatro camadas:

```text
            ┌──────────────────────────── módulo ────────────────────────────┐
 HTTP ───▶  │ presentation  →  application  →  domain  ◀──  infrastructure  │ ───▶ PostgreSQL / SMTP
            │ (rotas Elysia,   (use cases)    (entidades,   (repositórios     │
            │  schemas,                        VOs, regras,  Prisma, JWT,     │
            │  auth)                           ports)        e-mail)          │
            └─────────────────────────────────────────────────────────────────┘
```

| Camada | Responsabilidade | Depende de |
|---|---|---|
| `domain/` | Entidades, agregados, value objects (CPF/CNPJ, placa, dinheiro, e-mail), regras e transições, interfaces dos repositórios (ports) | nada |
| `application/` | Use cases: orquestram o domínio e os repositórios, sem regra de negócio própria | `domain` |
| `infrastructure/` | Adapters de saída: repositórios Prisma e mappers, JWT, e-mail, hash de senha | `domain` (implementa os ports) |
| `presentation/` | Adapters de entrada: rotas, schemas TypeBox de request e response, guards de autenticação. **É a única camada que importa o Elysia** | `application` |

Não existe container de injeção de dependência. Cada módulo tem um `<modulo>.container.ts` (composition root) que liga os adapters concretos aos use cases de forma explícita. Os detalhes e padrões de código estão em [`docs/code/`](docs/code/README.md), e as decisões em [`docs/adr/`](docs/adr/).

## Tecnologias

| Tecnologia | Uso | Por quê |
|---|---|---|
| **TypeScript** | Linguagem | Tipagem estática para modelar o domínio com segurança |
| **[Bun](https://bun.sh) 1.4.3** | Runtime, gerenciador de pacotes e test runner | Uma ferramenta só no lugar de Node + npm + Jest/Vitest. Executa TypeScript direto e roda a suíte inteira em segundos |
| **[Elysia](https://elysiajs.com)** | Framework HTTP | Leve, feito para o Bun, com tipagem de ponta a ponta. Ver [ADR 0001](docs/adr/0001-stack-bun-elysia.md) |
| **TypeBox** (`t` do Elysia) | Validação e contratos | Um único schema por rota gera a validação, o tipo do handler e a documentação OpenAPI, então os três não divergem |
| **@elysia/openapi** (Scalar) | Documentação da API | OpenAPI gerado a partir dos próprios schemas, com interface interativa para testar as rotas |
| **PostgreSQL 17** | Banco de dados | Ver [decisão abaixo](#banco-de-dados-decisão-e-justificativa) |
| **Prisma ORM 7** | Acesso a dados e migrations | Schema declarativo, tipos gerados e migrations versionadas no git |
| **jose** | JWT | Biblioteca padrão de JOSE/JWT, sem dependências nativas |
| **bcryptjs** | Hash de senha | Algoritmo lento por design, que resiste a força bruta |
| **Nodemailer** + **Mailpit** | E-mail | Envio dos links de primeiro acesso e de redefinição de senha. Em desenvolvimento, o Mailpit captura tudo sem entregar a ninguém |
| **Docker / docker-compose** | Ambiente | Sobe API, banco, migrations e Mailpit com um comando |
| **Biome** | Lint e formatação | Substitui ESLint + Prettier com uma ferramenta só, bem mais rápida |
| **Husky + lint-staged** | Git hooks | O pre-commit formata e checa, e o pre-push roda os testes |
| **GitHub Actions** | CI | Lint, typecheck, testes com cobertura e análise de segurança em todo PR |
| **Changesets** | Versionamento | Versão semântica e `CHANGELOG.md` gerados a partir dos PRs |

## Banco de dados: decisão e justificativa

Escolhemos o **PostgreSQL**. A decisão completa está no [ADR 0002](docs/adr/0002-banco-postgresql.md), e o modelo de dados em [`docs/diagrams/database.svg`](docs/diagrams/database.svg).

- **O domínio é relacional:** cliente → veículos → Ordem → Ordens de Serviço → itens → catálogo e estoque. As consultas principais cruzam essas tabelas.
- **Transações ACID:** a aprovação do orçamento baixa o estoque de várias peças, registra os movimentos, congela o valor e muda o status, tudo ou nada. Os testes de integração provam o rollback com saldo insuficiente e o comportamento sob aprovações concorrentes.
- **Integridade garantida no banco:** constraints `UNIQUE` (CPF/CNPJ, placa, SKU, e-mail) e chaves estrangeiras seguram as regras mesmo quando duas requisições chegam ao mesmo tempo. Uma violação de unicidade responde `409`.
- **Tipos adequados:** `uuid` para identificadores e `Decimal(10,2)` para dinheiro (sem erro de ponto flutuante).

Alternativas descartadas: MongoDB (dados muito relacionados e transações entre documentos menos naturais) e SQLite (concorrência de escrita limitada).

## Pré-requisitos

- [Docker](https://docs.docker.com/get-docker/) com Docker Compose v2, para subir o ambiente completo.
- [Bun](https://bun.sh) 1.4.3 (`curl -fsSL https://bun.sh/install | bash`), apenas para desenvolver e rodar os testes fora do Docker.
- `openssl` (opcional), para gerar o `JWT_SECRET`.

## Execução

### Com Docker (ambiente completo)

```bash
cp .env.example .env
# preencha JWT_SECRET no .env (mínimo de 32 caracteres), por exemplo com: openssl rand -base64 32
docker compose up --build
```

O compose sobe os serviços nesta ordem:

1. **postgres** (PostgreSQL 17): só é considerado pronto quando o `pg_isready` responde.
2. **mailpit**: SMTP de demonstração. A caixa de entrada fica em `http://localhost:8025`.
3. **migrate**: job de execução única. Aplica as migrations (`prisma migrate deploy`), roda o seed e encerra. Ele fica separado da API para que a imagem final não carregue o CLI do Prisma.
4. **api**: só sobe depois que o `migrate` termina com sucesso.

| Endereço | O que é |
|---|---|
| `http://localhost:3000` | API |
| `http://localhost:3000/openapi` | Documentação interativa (Scalar) |
| `http://localhost:3000/health` | Health check (checa o banco e responde `503` se ele cair) |
| `http://localhost:8025` | Mailpit: e-mails enviados pela API |

```bash
docker compose down      # para os containers (mantém os dados)
docker compose down -v   # para e apaga o volume do banco (recomeça do zero)
```

### Localmente (API fora do Docker)

```bash
bun install                            # também roda o prisma generate
cp .env.example .env                   # preencha JWT_SECRET
docker compose up -d postgres mailpit  # ou um Postgres local apontado pelo DATABASE_URL
bun run prisma:deploy                  # aplica as migrations
bun run db:seed                        # cria o ADMIN e o MECHANIC de demonstração
bun run dev                            # watch mode (bun run start = sem watch)
```

Para mudar o schema, edite `prisma/schema.prisma` e rode `bun run prisma:migrate --name <descricao>`. Isso gera a nova migration em `prisma/migrations/`, que é versionada no git.

## Autenticação e usuários de demonstração

As rotas administrativas exigem **JWT (Bearer)**, e cada rota declara os papéis permitidos.

O seed cria dois funcionários. Ele é idempotente: rodar de novo não duplica nada.

| Papel | E-mail | Senha | Pode |
|---|---|---|---|
| ADMIN | `admin@oficina.com` | `admin12345` | Tudo: cadastros, abrir e entregar Ordens, atribuir mecânico, ver o tempo médio |
| MECHANIC | `mecanico@oficina.com` | `mecanico12345` | Trabalhar nas OS atribuídas a ele: itens, diagnóstico, finalização |

Os valores podem ser trocados com `SEED_ADMIN_*` e `SEED_MECHANIC_*` no `.env`.

**Como autenticar:**

1. `POST /auth/login` com `{ "email": "admin@oficina.com", "password": "admin12345" }`.
2. Use o `accessToken` da resposta no header `Authorization: Bearer <token>`. No Scalar, basta colá-lo em **Authentication**.

**Primeiro acesso:** funcionários novos são cadastrados pelo ADMIN (`POST /employees`) e recebem por e-mail um link para definir a senha. Clientes podem criar conta em `POST /auth/register` ou pedir o link de primeiro acesso. Em ambiente local, todos os e-mails aparecem no Mailpit (`http://localhost:8025`). O cliente autenticado acompanha as próprias Ordens em `/me/orders` e aprova ou rejeita os orçamentos delas.

## Documentação da API (OpenAPI)

Com a API rodando, acesse **`http://localhost:3000/openapi`**. A interface (Scalar) lista todas as rotas agrupadas por módulo, com os schemas de request e response e os exemplos, e permite executar as chamadas com o token. Toda resposta segue o envelope `{ data, message, status }`.

## Testes

O projeto tem três camadas de teste. O [ADR 0003](docs/adr/0003-camadas-de-teste.md) explica por que existe cada uma.

| Camada | O que prova | Comando | Precisa de |
|---|---|---|---|
| **Unitários + e2e** | Regras de domínio e use cases isolados, e rotas via `app.handle` com fakes (inclui 401 sem token em toda rota protegida) | `bun test` | nada |
| **Integração** | Adapters Prisma contra Postgres real: rollback da aprovação do orçamento, concorrência, unicidade | `bun run test:integration` | Postgres |
| **Black-box** | A API real só por HTTP, com Postgres e Mailpit: fluxos completos e a [matriz de autorização](docs/testing/black-box.md) | `bun run test:black-box` | Postgres + Mailpit |

```bash
bun test                                 # unitários + e2e
bun run test:cov                         # idem, com relatório de cobertura

docker compose up -d postgres mailpit
bun run test:integration                 # cria o banco mechanic_system_test e aplica as migrations
bun run test:black-box
```

Os testes de integração e black-box usam `TEST_DATABASE_URL` (padrão `postgresql://postgres:postgres@localhost:5432/mechanic_system_test`). O nome precisa terminar em `_test`, porque as tabelas são esvaziadas a cada teste. O black-box lê os e-mails no Mailpit (`MAILPIT_URL`, padrão `http://localhost:8025`).

### Evidência de cobertura

O mínimo de **80% de linhas é exigido por arquivo** (`coverageThreshold` no [`bunfig.toml`](bunfig.toml)), e não só na média. Assim, nenhum arquivo dos domínios críticos fica descoberto sem quebrar o build. O CI roda `bun test --coverage` em todo PR.

Resultado de `bun run test:cov` na versão entregue:

```text
All files  |  % Funcs 99.78  |  % Lines 99.97
814 pass · 0 fail · 84 arquivos
```

### Qualidade de código

```bash
bun run typecheck   # tsc --noEmit (o Bun não checa tipos ao executar)
bun run lint        # biome lint
bun run check       # biome lint + format --write
bun run ci          # checagem usada no CI (não escreve nada)
```

## Segurança e análise de vulnerabilidades

- **Relatório:** [`docs/security/relatorio-vulnerabilidades.md`](docs/security/relatorio-vulnerabilidades.md). Resultado: **0 vulnerabilidades** nas dependências, **0 segredos** no histórico do git e **0 problemas** de configuração no Dockerfile, com as tratativas documentadas.
- **Ferramentas:** `bun audit` (dependências), [gitleaks](https://github.com/gitleaks/gitleaks) (segredos em todo o histórico) e [Trivy](https://github.com/aquasecurity/trivy) (dependências, Dockerfile e imagens).
- **Contínuo:** o workflow [`security.yml`](.github/workflows/security.yml) repete a análise em todo PR e semanalmente.
- **Na aplicação:** JWT com segredo obrigatório, senhas com bcrypt, rate limit nas rotas públicas de autenticação, headers de segurança, CORS fechado por padrão e validação de CPF/CNPJ e placa nos value objects. Detalhes em [`docs/code/infra/security.md`](docs/code/infra/security.md).

## Estrutura de diretórios

```text
.
├── src/
│   ├── server.ts               # monta os containers reais e sobe o servidor
│   ├── app.ts                  # createApp(deps): plugins globais + rotas (testável com fakes)
│   ├── modules/                # um módulo por contexto de negócio
│   │   ├── auth/               # login, registro, primeiro acesso, redefinição de senha
│   │   ├── employee/           # funcionários (ADMIN, MECHANIC)
│   │   ├── customer/           # clientes (CPF/CNPJ)
│   │   ├── vehicle/            # veículos (placa)
│   │   ├── inventory/          # serviços, peças/insumos e estoque
│   │   ├── service-order/      # Ordem, Ordem de Serviço, orçamento, status
│   │   └── user/               # conta de acesso (e-mail, senha)
│   │       └── <modulo>/
│   │           ├── domain/          # entidades, VOs, regras, ports
│   │           ├── application/     # use cases
│   │           ├── infrastructure/  # repositórios Prisma, adapters
│   │           ├── presentation/    # rotas Elysia e schemas
│   │           └── <modulo>.container.ts
│   ├── shared/                 # VOs e erros comuns, JWT, e-mail, Prisma, plugins HTTP
│   └── generated/prisma/       # cliente gerado pelo Prisma (não editar)
├── test/
│   ├── *.e2e.spec.ts           # rotas com fakes (app.handle)
│   ├── fakes/ · helpers/       # repositórios em memória e utilitários
│   ├── integration/            # Postgres real
│   └── black-box/              # API real por HTTP
├── prisma/                     # schema.prisma, migrations/, seed.ts
├── docs/
│   ├── ddd/                    # Event Storming, diagramas, linguagem ubíqua
│   ├── adr/                    # decisões de arquitetura
│   ├── code/                   # arquitetura e padrões de código
│   ├── diagrams/               # modelo de dados
│   ├── security/               # relatório de vulnerabilidades
│   ├── testing/                # levantamento dos testes black-box
│   └── workflow/               # branch, commit, PR, changesets
├── .github/workflows/          # ci, security, release
├── Dockerfile                  # multi-stage: migrate e runtime
└── docker-compose.yml          # postgres, mailpit, migrate, api
```

Os testes unitários ficam ao lado do código que testam (`*.spec.ts` dentro de `src/`).

## Ambiente de desenvolvimento (VS Code)

Ao abrir o projeto, o VS Code sugere as extensões de [`.vscode/extensions.json`](.vscode/extensions.json):

| Extensão | Por quê |
|---|---|
| [Biome](https://marketplace.visualstudio.com/items?itemName=biomejs.biome) | Formata ao salvar e mostra os erros de lint com as mesmas regras do CI. Prettier e ESLint ficam marcados como indesejados para não conflitar |
| [Prisma](https://marketplace.visualstudio.com/items?itemName=Prisma.prisma) | Destaque de sintaxe, autocomplete e formatação do `schema.prisma` |
| [Bun for VS Code](https://marketplace.visualstudio.com/items?itemName=oven.bun-vscode) | Executar e depurar a API e os testes com o Bun |
| [Container Tools (Docker)](https://marketplace.visualstudio.com/items?itemName=ms-azuretools.vscode-docker) | Subir e parar o compose e ver os logs dos containers pelo editor |
| [Draw.io Integration](https://marketplace.visualstudio.com/items?itemName=hediet.vscode-drawio) | Editar os diagramas `.drawio` de `docs/ddd/` e `docs/diagrams/` sem sair do editor |
| [GitHub Actions](https://marketplace.visualstudio.com/items?itemName=github.vscode-github-actions) | Validação e autocomplete dos workflows, além do status das execuções |

O [`.vscode/settings.json`](.vscode/settings.json) já define o Biome como formatador padrão, com formatação ao salvar.

## Documentação

- [Documentação DDD](docs/ddd/README.md): Domain Storytelling, Event Storming (criação da OS, acompanhamento, peças e insumos), subdomínios, context map, agregados, [linguagem ubíqua](docs/ddd/linguagem-ubiqua.md) e a relação com o código. Exportações em PDF: [`event-storming.pdf`](docs/ddd/event-storming.pdf) e [`diagramas.pdf`](docs/ddd/diagramas.pdf).
- [Modelo de dados](docs/diagrams/database.svg) (fonte: [`database.drawio`](docs/diagrams/database.drawio))
- [Arquitetura e padrões de código](docs/code/README.md)
- [Decisões de arquitetura (ADRs)](docs/adr/)
- [Testes black-box](docs/testing/black-box.md)
- [Workflow de git (branch, commit, PR, changesets)](docs/workflow/README.md)
- [Changelog](CHANGELOG.md)

## Licença

Uso acadêmico (FIAP), sem licença pública.
