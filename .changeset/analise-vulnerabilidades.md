---
"tech-challenge-api": patch
---

Correção: elimina as 7 vulnerabilidades apontadas pelo bun audit nas dependências do CLI do Prisma (fast-uri por atualização; deepmerge-ts e mysql2 por overrides), move o HEALTHCHECK para o Dockerfile e adiciona o workflow de segurança (bun audit, gitleaks em todo o histórico e trivy no Dockerfile, no lockfile e nas imagens runtime e migrate) com o relatório em docs/security/relatorio-vulnerabilidades.md.
