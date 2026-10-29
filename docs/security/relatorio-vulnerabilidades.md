# Relatório de análise de vulnerabilidades

Análise de segurança do repositório `18-SOAT/Tech.Challenge.API`: dependências, segredos no histórico do git, configuração do Dockerfile e imagens Docker. Este relatório é o entregável exigido pelo enunciado; a análise roda de novo a cada PR e toda semana pelo workflow [`security.yml`](../../.github/workflows/security.yml).

- **Data da análise:** 2026-10-24
- **Base analisada:** branch `ci/analise-vulnerabilidades` (sobre `feat/seguranca-http`, com todas as dependências da fase, inclusive o `@elysiajs/cors`)
- **Resultado final:** **0 vulnerabilidades** nas dependências (produção e desenvolvimento), **0 segredos** no histórico, **0 problemas** de configuração no Dockerfile. As imagens Docker são analisadas pelo CI (ver [Imagens Docker](#4-imagens-docker)). A análise manual registrou **1 risco conhecido**, de regra de negócio, já tratado no issue [#46](https://github.com/18-SOAT/Tech.Challenge.API/issues/46) (ver [Riscos conhecidos](#6-riscos-conhecidos-análise-manual)).

## Ferramentas

| Ferramenta | Versão | O que analisa |
|---|---|---|
| `bun audit` | Bun 1.4.3 | Dependências do `bun.lock` contra o banco de advisories do GitHub (GHSA) |
| [gitleaks](https://github.com/gitleaks/gitleaks) | 8.30.1 | Segredos (tokens, senhas, chaves) em **todo o histórico** do git e na árvore atual |
| [Trivy](https://github.com/aquasecurity/trivy) | 0.76.1 | Dependências (`fs`), boas práticas do Dockerfile (`config`) e pacotes do sistema e da aplicação dentro das imagens (`image`) |

## 1. Dependências (`bun audit` e `trivy fs`)

A primeira execução encontrou **7 vulnerabilidades (2 high, 3 moderate, 2 low)**. Todas estavam **dentro do CLI do Prisma** (`prisma`, devDependency), nenhuma em código que a API executa:

| Pacote | Versão | Severidade | Advisory | Quem puxa | Presente em | Tratativa |
|---|---|---|---|---|---|---|
| `fast-uri` | 3.1.8 | moderate (2), low (2) | [GHSA-w74x-v6f9-j3xg](https://github.com/advisories/GHSA-w74x-v6f9-j3xg), [GHSA-wjr9-j795-jxcr](https://github.com/advisories/GHSA-wjr9-j795-jxcr), [GHSA-xhq7-xmqj-769h](https://github.com/advisories/GHSA-xhq7-xmqj-769h), [GHSA-333x-w4r6-6crp](https://github.com/advisories/GHSA-333x-w4r6-6crp) | `prisma > @prisma/dev > @prisma/streams-local > ajv` | CLI de dev, imagem `migrate` | **Corrigido:** `bun audit fix` → 3.1.9 (dentro do range) |
| `deepmerge-ts` | 7.1.5 | **high** | [GHSA-ggr8-5vv4-36mx](https://github.com/advisories/GHSA-ggr8-5vv4-36mx) (stack exhaustion em grafo recursivo) | `prisma > @prisma/config` (versão fixa) | CLI de dev, imagem `migrate` | **Corrigido:** `overrides` → 8.0.2 |
| `mysql2` | 3.15.3 | **high**, moderate | [GHSA-3f6p-5ww8-9rcr](https://github.com/advisories/GHSA-3f6p-5ww8-9rcr) (downgrade de auth vaza senha), [GHSA-rgwj-5xj2-c3m3](https://github.com/advisories/GHSA-rgwj-5xj2-c3m3) (zip bomb) | `prisma` (versão fixa) | CLI de dev, imagem `migrate` | **Corrigido:** `overrides` → 3.24.6 |

**Por que `overrides`:** o `prisma@7.10.0` fixa `deepmerge-ts` e `mysql2` em versões exatas, então nenhuma atualização normal chega até eles (`bun audit fix` reporta "blocked by a dependent's range"). O `overrides` do `package.json` força a versão corrigida dentro da árvore do Prisma.

**Validação dos overrides:** o `deepmerge-ts` subiu de major (7 → 8) e é usado pelo `@prisma/config` para carregar o `prisma.config.ts`. Conferido que o CLI continua funcionando: `prisma validate`, `prisma generate` e `prisma migrate diff` (gera o SQL das 12 tabelas) passam, assim como typecheck e os testes. O `mysql2` nem é usado em execução (o banco é PostgreSQL); ele só vem como dependência do CLI.

**Resultado após as tratativas:**

```text
$ bun audit
No vulnerabilities found (checked 227 packages)

$ trivy fs --scanners vuln --include-dev-deps .
bun.lock │ bun │ 0
```

**Por que o risco já era baixo antes:** a imagem da API (`runtime`) instala só dependências de produção (`bun install --production`), sem o CLI do Prisma. O CLI existia na imagem `migrate`, um job de execução única que aplica as migrations e o seed numa rede interna do compose, sem receber entrada de usuário.

## 2. Segredos no histórico (`gitleaks`)

O enunciado exige o repositório sem credenciais, senhas ou tokens. O gitleaks varreu **todo o histórico** (`--log-opts="--all"`, 98 commits com conteúdo; merges não trazem conteúdo novo) e a árvore atual. Foram 7 achados da regra genérica `generic-api-key`, todos **falsos positivos**:

| Onde | O que é | Por que não é segredo |
|---|---|---|
| `README.md`, 1º commit (`90dddec`) | Token do badge do CircleCI no README do template NestJS | Público, do projeto `nestjs/nest`, presente em todo starter do Nest; já removido do README |
| `prisma/seed.ts:26` e `:31` | Senha **de demonstração** do MECHANIC (a linha mudou de lugar quando o seed virou função) | Credencial de demo, documentada por exigência do enunciado e substituível por `SEED_MECHANIC_PASSWORD` |
| `test/http-security.e2e.spec.ts:88` e `:97` | Senha fictícia de teste | Teste e2e com fakes, sem banco nem usuário real |
| `test/black-box/support/actors.ts:12` e `data.ts:38` | Senha de demo do MECHANIC (a do seed) e senha fictícia dos testes black-box | Valem só contra o banco `*_test`, esvaziado a cada teste |

Os sete estão no [`.gitleaksignore`](../../.gitleaksignore) **por fingerprint** (commit + arquivo + regra + linha), não por pasta: um segredo novo nos mesmos arquivos continua sendo detectado. A varredura da árvore também apontou o `.env` local, que é **ignorado pelo git** (`.gitignore`) e não aparece em nenhum commit, o que é o comportamento esperado.

**Resultado:** `no leaks found`.

## 3. Dockerfile (`trivy config`)

27 verificações; 1 falha **LOW**: [DS-0026](https://avd.aquasec.com/misconfig/ds-0026), falta de `HEALTHCHECK` no Dockerfile.

**Tratativa:** o health check existia só no `docker-compose.yml`. Ele foi movido para o estágio `runtime` do Dockerfile, para acompanhar a imagem aonde ela rodar, e removido do compose para não haver duas definições. **Resultado:** 0 falhas.

Boas práticas que o Dockerfile já seguia: multi-stage (a imagem final não leva devDependencies nem ferramentas de build), usuário sem privilégio (`USER bun`), versão da imagem base fixa (`oven/bun:1.4.3-slim`) e `--frozen-lockfile` em todo install.

## 4. Imagens Docker (`trivy image`)

O CI constrói as duas imagens que o compose sobe, `runtime` (API) e `migrate` (migrations + seed), e analisa os pacotes do sistema (Debian slim) e da aplicação com `--severity HIGH,CRITICAL --ignore-unfixed`. CVE com correção publicada derruba o job; CVE do sistema base ainda sem correção não tem ação possível no projeto e não bloqueia. O resultado de cada execução fica no log do job `image` do workflow `security`.

Para rodar localmente (precisa de Docker):

```bash
docker build --target runtime -t tech-challenge-api:runtime .
docker run --rm -v /var/run/docker.sock:/var/run/docker.sock aquasec/trivy:0.76.1 \
  image --severity HIGH,CRITICAL --ignore-unfixed tech-challenge-api:runtime
```

## 5. Controles de segurança da aplicação

Além das dependências, a API já tem controles que reduzem a superfície de ataque (detalhe em [`docs/code/infra/security.md`](../code/infra/security.md)):

- **Autenticação JWT** (Bearer) em toda rota administrativa, com papéis (`ADMIN`, `MECHANIC`) e regra por recurso (mecânico só na OS atribuída; cliente só nas próprias Ordens).
- **Rate limit** nas rotas públicas de auth (por IP e, no login e na redefinição, por e-mail canônico), contra força bruta e disparo de e-mail.
- **Headers de segurança** em toda resposta (CSP, `nosniff`, `X-Frame-Options`, HSTS, `no-store`) e **CORS** só para origens configuradas.
- **Validação de entrada** na borda (TypeBox) e de dados sensíveis no domínio (CPF/CNPJ, placa, e-mail).
- **Senhas** com bcrypt e comparação de custo constante no login (sem enumeração de e-mail por tempo de resposta); **link de acesso** de uso único e validade curta.
- **Env validado no boot:** `JWT_SECRET` com no mínimo 32 caracteres; configuração inválida derruba a subida.

## 6. Riscos conhecidos (análise manual)

Ferramentas automáticas acham dependência vulnerável, segredo e configuração errada, mas não acham **falha de regra de negócio**: uma requisição válida usada de um jeito que o sistema não previu. Os riscos abaixo vieram de revisão manual e ficam registrados com a tratativa.

| Risco | Vetor | Categoria | Impacto antes da tratativa | Quando o risco sobe | Tratativa | Status |
|---|---|---|---|---|---|---|
| Várias contas para o mesmo e-mail | Aliases da mesma caixa de entrada viravam logins diferentes, porque a unicidade do login comparava só o e-mail em minúsculas: pontos no Gmail (`j.o.a.o@gmail.com`), domínio alternativo (`@googlemail.com`) e sub-endereçamento (`joao+1@gmail.com`, aceito também por Outlook, iCloud, Proton e Fastmail) | [OWASP API6:2023](https://owasp.org/API-Security/editions/2023/en/0xa6-unrestricted-access-to-sensitive-business-flows/) — acesso irrestrito a fluxo de negócio | **Baixo:** o auto-cadastro exige CPF/CNPJ único, então cada conta extra precisava de outro documento (barreira fraca, já que CPF com dígito válido é fácil de gerar); o rate limit do `/auth/register` limita o volume por IP | Qualquer benefício por conta: validação de cartão, cupom, período grátis | **E-mail canônico:** forma usada só para unicidade e busca do login (minúsculas, `googlemail.com` → `gmail.com`, pontos ignorados no Gmail, `+tag` removido nos provedores que o tratam como alias), na coluna `users.email_canonical` (`@unique`). Alias de um login existente recebe o mesmo 409 do e-mail em uso; o e-mail digitado é preservado para envio; o rate limit por conta conta pelo e-mail canônico | Tratado — [#46](https://github.com/18-SOAT/Tech.Challenge.API/issues/46) |

Quando entrar validação de cartão, o e-mail canônico é uma camada, não a solução inteira: o controle principal passa a ser o fingerprint do cartão no gateway de pagamento (o mesmo cartão em várias contas), somado ao rate limit.

## Como reproduzir

```bash
bun audit
gitleaks git . --log-opts="--all" --redact
trivy fs --scanners vuln,secret --include-dev-deps .
trivy config .
```

Sem os binários instalados, as mesmas análises rodam por Docker (`zricethezav/gitleaks:v8.30.1`, `aquasec/trivy:0.76.1`) ou pelo workflow [`security.yml`](../../.github/workflows/security.yml), que roda em todo PR para o `main`, a cada push no `main`, toda segunda-feira e sob demanda (`workflow_dispatch`).
