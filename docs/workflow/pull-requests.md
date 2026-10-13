# Pull Requests

## Idioma

Comentários de revisão e a descrição do PR são escritos em **português (PT-BR)**. Toda a documentação em `docs/` também está em português; só o código (nomes de classes, métodos, variáveis) fica em inglês.

## Checklist antes de abrir o PR

- [ ] Branch segue a convenção ([branching.md](branching.md)).
- [ ] `bun run changeset` incluído, descrevendo a mudança, ou `bunx changeset add --empty` se a mudança não deve gerar release (ex: só doc). Ver [changesets.md](changesets.md).
- [ ] `bun run ci` passa localmente (lint + format, mesma checagem do CI).
- [ ] `bun run typecheck` passa (o Bun não checa tipos ao rodar; só esse script pega erro de tipo).
- [ ] `bun test` passa, com testes cobrindo a mudança (ver `CLAUDE.md`, seção "Testes").
- [ ] Rota nova ou alterada conferida em `/openapi` (ver [checklist de rota](../code/libs/openapi.md#checklist-de-rota-nova)).
- [ ] Se o PR avança a migração, o checklist de [`docs/migration/elysia.md`](../migration/elysia.md) foi atualizado.
