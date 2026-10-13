# Convenção de commits

Seguimos [Conventional Commits](https://www.conventionalcommits.org/), usando o mesmo vocabulário de tipos da [nomenclatura de branch](branching.md): `feat`, `fix`, `docs`, `chore`, `refactor`, `test`, `ci`, `build`, `perf`, `style`.

## Formato

```
<tipo>: <descrição>
```

Opcionalmente com escopo: `<tipo>(<escopo>): <descrição>`.

A descrição fica em português; o `<tipo>` fica em inglês, para bater com a nomenclatura de branch e com a ferramentagem (Changesets, CI).

Exemplos:
- `feat: cadastro de cliente com validação de CPF/CNPJ`
- `fix: corrige cálculo de orçamento com peça duplicada`
- `docs: documenta padrão de repository e mapper`

## Commit não substitui Changeset

O commit descreve a mudança no histórico do git. O changeset (ver [changesets.md](changesets.md)) descreve a mudança para o CHANGELOG e para o versionamento. São coisas diferentes e uma não dispensa a outra: toda mudança relevante em PR ainda precisa do `bun run changeset`.
