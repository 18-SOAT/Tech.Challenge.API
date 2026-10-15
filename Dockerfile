# syntax=docker/dockerfile:1
# Multi-stage: só o último estágio (runtime) vira a imagem da API. Os outros existem
# pra instalar/gerar coisas sem levar ferramentas de build pra produção.
# Não há etapa de build: o Bun executa TypeScript direto.

ARG BUN_VERSION=1.4.3

# ---------------------------------------------------------------------------
# deps: todas as dependências (inclusive dev, onde está o CLI do Prisma) + client gerado
# ---------------------------------------------------------------------------
FROM oven/bun:${BUN_VERSION}-slim AS deps
WORKDIR /app

# O schema-engine do Prisma (usado pelo migrate) depende da libssl.
RUN apt-get update && apt-get install -y --no-install-recommends openssl \
  && rm -rf /var/lib/apt/lists/*

# Schema ANTES do install: o postinstall roda `prisma generate`, que precisa dele.
# Só manifestos + schema nesta camada → mudar o src/ não reinstala dependências.
COPY package.json bun.lock prisma.config.ts ./
COPY prisma ./prisma
RUN bun install --frozen-lockfile

# ---------------------------------------------------------------------------
# migrate: job de execução única (serviço `migrate` do compose) —
# aplica as migrations versionadas e roda o seed, depois encerra.
# ---------------------------------------------------------------------------
FROM deps AS migrate
# O seed reaproveita código do domínio (VOs, hasher, IdGenerator).
COPY src ./src
CMD ["sh", "-c", "bun run prisma:deploy && bun run db:seed"]

# ---------------------------------------------------------------------------
# prod-deps: só dependências de produção. --ignore-scripts porque o postinstall
# (prisma generate) e o prepare (husky) precisam de devDependencies; o client
# gerado vem pronto do estágio deps.
# ---------------------------------------------------------------------------
FROM oven/bun:${BUN_VERSION}-slim AS prod-deps
WORKDIR /app
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile --production --ignore-scripts

# ---------------------------------------------------------------------------
# runtime: imagem final da API
# ---------------------------------------------------------------------------
FROM oven/bun:${BUN_VERSION}-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production

COPY --from=prod-deps /app/node_modules ./node_modules
COPY package.json tsconfig.json ./
COPY src ./src
COPY --from=deps /app/src/generated ./src/generated

# Usuário sem privilégio (já existe na imagem oven/bun): se a app for comprometida,
# o atacante não é root dentro do container.
USER bun
EXPOSE 3000
CMD ["bun", "src/server.ts"]
