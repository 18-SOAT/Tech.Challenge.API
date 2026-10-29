# ADR 0003 — Camadas de teste: unitário, e2e com fakes, integração e black-box

- **Status:** aceito
- **Data:** 2026-10-29
- **Versão:** `2.5.1`

> O número 0002 está reservado para a decisão do banco de dados (#17).

## Contexto

O [ADR 0001](0001-stack-bun-elysia.md) trouxe o `createApp(deps)` testável com fakes: o e2e chama `app.handle()` sem servidor e sem banco. Isso deixa o `bun test` rápido e o pre-push sem Docker, mas nenhum teste exercitava a API como ela roda de verdade:
- os adapters Prisma atrás de uma rota;
- as transações, os locks e os updates condicionais disparados por HTTP;
- a montagem real dos containers (`server.ts`);
- o envio de e-mail por SMTP.

Os testes de integração (`test/integration/`) cobrem parte disso, mas chamam os use cases direto, sem a camada HTTP.

## Decisão

Quatro camadas, cada uma provando o que as outras não alcançam:

| Camada | Onde | Prova | Roda em |
|---|---|---|---|
| Unitário | `src/**/*.spec.ts` | Regra de domínio e orquestração do use case, com fakes | `bun test` (pre-push e CI) |
| e2e com fakes | `test/*.e2e.spec.ts` | Rota, validação, envelope e status, com `makeTestApp()` | `bun test` (pre-push e CI) |
| Integração | `test/integration/` | Use case + adapter Prisma contra Postgres real: rollback e corrida | `bun run test:integration` (CI) |
| Black-box | `test/black-box/` | A API inteira só por HTTP, com Postgres e Mailpit reais | `bun run test:black-box` (CI) |

Para o black-box:
- **A especificação vem antes do teste.** O contrato está em [`docs/testing/black-box.md`](../testing/black-box.md). A matriz de autorização é lida desse documento pelo próprio teste: permissão alterada no código sem alterar a matriz faz o teste falhar.
- **A app é a mesma do servidor.** O `buildApp(env)` (`src/build-app.ts`) monta os containers reais, e o `server.ts` só lê o ambiente e chama `.listen()`. O teste sobe essa montagem numa porta aleatória com um ambiente explícito (banco `*_test`, Mailpit, rate limit alto) e chama por `fetch`.
- **Nada é assinado nem inserido por fora.** Os tokens saem de `POST /auth/login`, e os recursos são criados pela API. A exceção é o reset do banco: TRUNCATE e o seed do ADMIN e do MECHANIC (`seedDemoEmployees`).
- **E-mail pelo Mailpit.** O teste lê pela API REST dele, com polling, porque o envio é fire-and-forget depois do commit.

## Consequências

**Positivas**
- A cobertura chega ao que o fake esconde: SQL dos adapters, locks, rollback por HTTP e conteúdo real dos e-mails.
- A matriz de autorização vira contrato executável e conferido contra o OpenAPI: rota nova sem linha na matriz quebra o teste.
- O pre-push continua sem Docker.

**Negativas / cuidados**
- O CI ganha um job com `services: postgres` e `mailpit`, mais lento que o `bun test`.
- Os testes black-box rodam em série, porque compartilham o banco e a caixa do Mailpit.
- Um teste que precisa provar "nenhum e-mail enviado" tem de esperar um intervalo curto, então fica mais lento por natureza.
