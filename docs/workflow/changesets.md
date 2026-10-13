# Changesets

Changesets dá **versionamento rastreável**: cada PR declara o que mudou e qual o tamanho do bump (patch/minor/major), e a versão + `CHANGELOG.md` são gerados disso, sem ninguém editar a versão na mão. A versão do `package.json` também aparece no OpenAPI (ver [openapi.md](../code/libs/openapi.md)).

1. Toda mudança relevante num PR inclui um `bun run changeset` (gera um `.md` em `.changeset/` com o bump e o resumo). O CI (`changeset-check` em `ci.yml`) falha o PR se faltar.
2. Mudança que não deve gerar release (ex: só doc) usa `bunx changeset add --empty`.
3. Ao mergear na `main`, o workflow `release.yml` roda a action `changesets/action`. Se houver changesets pendentes, ela abre ou atualiza sozinha um PR "Version Packages" com o bump de versão e o `CHANGELOG.md` prontos. Você só revisa e mergeia esse PR.
4. O `changelog` está configurado com o gerador padrão (`@changesets/cli/changelog`, sem links do GitHub). Para ter changelog com links de PR/commit, instale `@changesets/changelog-github` e troque o campo `"changelog"` do `.changeset/config.json` para `["@changesets/changelog-github", { "repo": "18-SOAT/Tech.Challenge.API" }]`.
5. `baseBranch` no `.changeset/config.json` é `"main"`, o branch padrão de `github.com/18-SOAT/Tech.Challenge.API`.

## Categoria do resumo

O resumo escrito no `bun run changeset` (o texto que vai para o `CHANGELOG.md`) começa com uma das categorias abaixo, em português. Isso é independente do `<tipo>` do commit/branch (que fica em inglês, ver [commits.md](commits.md)), porque o changeset é lido por qualquer pessoa que consulta o changelog, não só por quem mexe no código:

- **Melhoria:** funcionalidade nova ou melhoria em algo que já existe.
- **Correção:** correção de bug.
- **Ajuste:** mudança pontual sem impacto funcional direto (refatoração, configuração, formatação etc.).

Exemplos:

```
Melhoria: adiciona validação de CPF/CNPJ no cadastro de cliente
Correção: corrige cálculo de orçamento quando há peça duplicada
Ajuste: renomeia variável de ambiente do banco
```
