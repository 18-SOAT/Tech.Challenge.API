---
"tech-challenge-api": major
---

Melhoria: migra a API de NestJS para Bun + Elysia. Todas as respostas passam a usar o envelope `{ data, message, status }` (inclusive `/health` e `/auth/*`), erros de domínio seguem um catálogo único com status HTTP padronizado, e a documentação OpenAPI passa a ser gerada a partir dos mesmos schemas que validam cada rota (`/openapi`).
