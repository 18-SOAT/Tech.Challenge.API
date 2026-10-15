# tech-challenge-api

## 2.0.0

### Major Changes

- e4cf7ff: Melhoria: migra a API de NestJS para Bun + Elysia. Todas as respostas passam a usar o envelope `{ data, message, status }` (inclusive `/health` e `/auth/*`), erros de domínio seguem um catálogo único com status HTTP padronizado, e a documentação OpenAPI passa a ser gerada a partir dos mesmos schemas que validam cada rota (`/openapi`).

### Minor Changes

- 20be8bd: Melhoria: ambiente completo com `docker compose up --build` (Postgres + migrations + seed + API). Adiciona a migration inicial do banco, um usuário ADMIN de demonstração (`admin@oficina.com` / `admin12345`) e o `GET /health` passa a checar o banco, respondendo `503` quando ele está indisponível.

## 1.0.0

### Major Changes

- b1045c5: Novidade: Adiciona modulo de autenticação, login, registre-se e /me

### Minor Changes

- 92f4b5e: Novidade: Adiciona a base do banco do projeto
- e93c37b: Novidade: Adiciona enums usados no projeto de acordo com as entidades

### Patch Changes

- 07e565c: Melhoria: Adiciona padrão para mensagens no changeset
- abb8403: Melhoria: Adiciona documentação sobre workflow e código
- aec1f8b: Docs: Adiciona template para entidades do sistema
- e522e58: Correção: Ajusta githubActions, changeset version e `PR` template no `CI`
