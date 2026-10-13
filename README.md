# Tech Challenge API — Oficina Mecânica

Back-end do **Tech Challenge FIAP** (SOAT): sistema integrado de atendimento e execução de serviços para uma oficina mecânica de médio porte. Cobre ordens de serviço, clientes, veículos e peças/estoque, aplicando DDD e boas práticas de qualidade e segurança.

## Stack

Bun · Elysia · TypeScript · TypeBox · PostgreSQL + Prisma ORM · OpenAPI (Scalar) · JWT (`jose`) · Biome · Husky · Changesets · Docker/docker-compose

## Pré-requisitos

- [Bun](https://bun.sh) (`curl -fsSL https://bun.sh/install | bash`)
- PostgreSQL (local ou via `docker-compose`, quando disponível)

## Instalação

```bash
bun install
cp .env.example .env   # preencha DATABASE_URL e JWT_SECRET
bun run prisma:migrate
```

## Rodando

```bash
bun run dev     # watch mode
bun run start   # sem watch
```

A documentação da API fica em `http://localhost:3000/openapi`.

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

- [Arquitetura e padrões de código](docs/code/README.md)
- [Workflow de git (branch, commit, PR, changesets)](docs/workflow/README.md)
- [Decisões de arquitetura (ADRs)](docs/adr/)
- [Contexto do projeto e escopo](CLAUDE.md)

## Licença

Uso acadêmico (FIAP), sem licença pública.
