# Segurança HTTP

O que a camada HTTP faz antes de qualquer regra de negócio: limitar tentativas nas rotas públicas, mandar headers de segurança em toda resposta e liberar CORS só para origens conhecidas. Tudo é montado no `createApp` (`src/app.ts`) e configurado pelo env (`src/shared/infrastructure/config/env.ts`).

## Rate limit

| Onde | Chave | Por quê |
|---|---|---|
| `POST /auth/login` | IP **e** e-mail canônico | Força bruta de senha. A contagem por e-mail pega quem tenta a mesma conta de vários IPs; pelo e-mail canônico, variar o alias (`j.oao+1@`) não reinicia a contagem. |
| `POST /auth/password-reset` | IP **e** e-mail canônico | Disparo de e-mail em massa para a mesma caixa. |
| `POST /auth/register`, `/auth/first-access`, `/auth/set-password` | IP | Rotas públicas: cadastro em massa, disparo de e-mail, tentativa de token. |

- **Limite:** `RATE_LIMIT_MAX` requisições por `RATE_LIMIT_WINDOW_SECONDS` (padrão: 10 por 60 s), cada rota com a própria contagem.
- **Resposta:** `429` no envelope padrão, com o header `Retry-After` em segundos.
- **Janela fixa em memória** (`InMemoryRateLimiter`, atrás do port `RateLimiter`): serve a um container só. Com várias instâncias da API, o contador precisaria ser compartilhado; troca-se o adapter (ex: Redis) sem mexer no plugin.
- **IP do cliente:** vem do socket. Com `TRUST_PROXY=true` vem do primeiro item do `X-Forwarded-For`. Só ligue atrás de um proxy reverso que reescreve esse header; sem proxy, o cliente forjaria um IP novo a cada requisição e fugiria do limite.
- **Por que não está no use case:** limitar tentativas é proteção da borda HTTP, não regra do login. O plugin (`src/shared/presentation/http/rate-limit.plugin.ts`) usa `onBeforeHandle` com `as: 'scoped'`, que roda depois do parse do body (a chave do login precisa do e-mail) e vale só para a rota envolvida.

## Headers de segurança

Plugin `src/shared/presentation/http/security-headers.plugin.ts`, num `onRequest`: o hook já é global no Elysia, então vale para toda resposta, inclusive 404 e 500.

| Header | Valor | Protege contra |
|---|---|---|
| `Content-Security-Policy` | API: `default-src 'none'; frame-ancestors 'none'` | Resposta aberta no navegador e interpretada como página |
| `X-Content-Type-Options` | `nosniff` | Navegador "adivinhando" que JSON é script |
| `X-Frame-Options` | `DENY` | Clickjacking (API ou doc dentro de iframe) |
| `Referrer-Policy` | `no-referrer` | Vazamento de URL para outros sites |
| `Strict-Transport-Security` | `max-age=31536000; includeSubDomains` | Downgrade para HTTP (ignorado pelo navegador em HTTP local) |
| `Cross-Origin-Opener-Policy` | `same-origin` | Outra janela manipulando a nossa |
| `Cache-Control` | `no-store` (fora da doc) | Cache guardando token ou dado pessoal |

**A CSP da doc é outra.** O Scalar em `/openapi` é uma página: carrega script do jsDelivr, usa estilo e um `<script>` de configuração inline e busca a especificação na própria API. A CSP de `/openapi` libera só isso. Afrouxar a CSP da API inteira para a doc funcionar trocaria a segurança de todas as rotas pela conveniência de uma.

## CORS

Plugin oficial `@elysiajs/cors`, com as origens de `CORS_ORIGINS` (lista separada por vírgula).

- **Vazio = nenhuma origem** (seguro por padrão): o navegador de outro site não recebe `Access-Control-Allow-Origin` e barra a resposta. Clientes fora do navegador (curl, Postman, outro back-end) não passam por CORS.
- **Métodos:** inclui `QUERY`, que é o método das listagens. Fora da lista, o preflight do navegador barraria todas.
- **Sem `credentials`:** o token vai no header `Authorization`, não em cookie.
- **`Retry-After` exposto:** para o front ler o tempo de espera do 429.

## Env

| Variável | Padrão | Validação no boot |
|---|---|---|
| `JWT_SECRET` | — | Obrigatória, mínimo 32 caracteres |
| `PORT`, `SMTP_PORT` | 3000, 1025 | Inteiro de 1 a 65535 |
| `APP_URL` | `http://localhost:3000` | URL completa |
| `CORS_ORIGINS` | vazio | Cada item é uma origem (`http://host:porta`, sem caminho) |
| `RATE_LIMIT_MAX`, `RATE_LIMIT_WINDOW_SECONDS` | 10, 60 | Inteiros positivos |
| `TRUST_PROXY` | `false` | `true` ou `false` |

Valor inválido derruba a subida com a mensagem do que corrigir. Ele nunca vira o padrão em silêncio.

A análise de vulnerabilidades (dependências, segredos no histórico, Dockerfile e imagens) está em [`docs/security/relatorio-vulnerabilidades.md`](../../security/relatorio-vulnerabilidades.md).
