# Tech Challenge API — Oficina Mecânica

Back-end do **Tech Challenge FIAP** (SOAT): sistema integrado de atendimento e execução de serviços para uma oficina mecânica de médio porte. Cobre ordens de serviço, clientes, veículos e peças/estoque, aplicando DDD e boas práticas de qualidade e segurança.

## Stack

Bun · Elysia · TypeScript · TypeBox · PostgreSQL + Prisma ORM · OpenAPI (Scalar) · JWT (`jose`) · Biome · Husky · Changesets · Docker/docker-compose

## Pré-requisitos

- [Docker](https://docs.docker.com/get-docker/) com Docker Compose v2 — para subir o ambiente completo
- [Bun](https://bun.sh) 1.4.3 (`curl -fsSL https://bun.sh/install | bash`) — para desenvolver e rodar os testes fora do Docker

## Rodando com Docker (ambiente completo)

```bash
cp .env.example .env   # preencha JWT_SECRET (ex: openssl rand -base64 32)
docker compose up --build
```

O compose sobe três serviços, nesta ordem:

1. **postgres** (PostgreSQL 17), que só é considerado pronto quando o `pg_isready` responde;
2. **migrate**, um job de execução única: aplica as migrations versionadas (`prisma migrate deploy`), roda o seed e encerra;
3. **api**, que só sobe depois que o `migrate` terminou com sucesso.

A API fica em `http://localhost:3000`, a documentação em `http://localhost:3000/openapi` e o `GET /health` checa também o banco (responde `503` se ele cair).

```bash
docker compose down      # para os containers (mantém os dados)
docker compose down -v   # para e apaga o volume do banco
```

### Usuário de demonstração

O seed cria um funcionário **ADMIN** (idempotente: rodar de novo não duplica):

| E-mail | Senha |
|---|---|
| `admin@oficina.com` | `admin12345` |

Altere com `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD` no `.env`. Para autenticar: `POST /auth/login` com essas credenciais e use o `accessToken` como `Authorization: Bearer <token>`.

## Rodando localmente (sem Docker para a API)

```bash
bun install
cp .env.example .env            # preencha JWT_SECRET
docker compose up -d postgres   # ou um Postgres local apontado pelo DATABASE_URL
bun run prisma:deploy           # aplica as migrations
bun run db:seed                 # cria o ADMIN de demonstração
bun run dev                     # watch mode (bun run start = sem watch)
```

Para mudar o schema: edite `prisma/schema.prisma` e rode `bun run prisma:migrate --name <descricao>`, que gera a nova migration em `prisma/migrations/` (versionada no git).

## Testes

```bash
bun test            # unitários + e2e
bun run test:cov    # cobertura
```

## Qualidade

```bash
bun run typecheck   # tsc --noEmit (o Bun não checa tipos ao executar)
bun run lint        # biome lint
bun run check       # biome lint + format --write
bun run ci          # checagem usada no CI (não escreve nada)
```

## Documentação

- [Documentação DDD](docs/ddd/README.md): Domain Storytelling, Event Storming, subdomínios, context map, agregados e [linguagem ubíqua](docs/ddd/linguagem-ubiqua.md)
- [Modelo de dados](docs/diagrams/database.svg) (fonte: [database.drawio](docs/diagrams/database.drawio))
- [Arquitetura e padrões de código](docs/code/README.md)
- [Workflow de git (branch, commit, PR, changesets)](docs/workflow/README.md)
- [Decisões de arquitetura (ADRs)](docs/adr/)

## Licença

Uso acadêmico (FIAP), sem licença pública.
