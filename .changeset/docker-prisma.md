---
"tech-challenge-api": minor
---

Melhoria: ambiente completo com `docker compose up --build` (Postgres + migrations + seed + API). Adiciona a migration inicial do banco, um usuário ADMIN de demonstração (`admin@oficina.com` / `admin12345`) e o `GET /health` passa a checar o banco, respondendo `503` quando ele está indisponível.
