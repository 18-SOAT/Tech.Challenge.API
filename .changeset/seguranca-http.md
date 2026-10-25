---
"tech-challenge-api": minor
---

Melhoria: endurece a camada HTTP. As rotas públicas de auth (login, cadastro, primeiro acesso, redefinição e definição de senha) ganham rate limit configurável por env (RATE_LIMIT_MAX, RATE_LIMIT_WINDOW_SECONDS), com 429 e Retry-After; no login e na redefinição a contagem também é por e-mail. Toda resposta passa a levar headers de segurança (CSP, nosniff, X-Frame-Options, HSTS, Referrer-Policy, no-store), com uma CSP própria para a documentação Scalar em /openapi. CORS só para as origens de CORS_ORIGINS (vazio = nenhuma), com o método QUERY liberado. O env é validado no boot: JWT_SECRET com no mínimo 32 caracteres, portas, URL e as variáveis novas falham alto em vez de virar padrão em silêncio.
