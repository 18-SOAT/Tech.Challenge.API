---
"tech-challenge-api": minor
---

Melhoria: adiciona o primeiro acesso do cliente cadastrado no balcão (POST /auth/first-access, por CPF/CNPJ) e a redefinição de senha (POST /auth/password-reset), ambos com link de acesso enviado por e-mail (Mailpit no docker compose) e resposta sempre igual, com ou sem cadastro; o link (POST /auth/set-password) tem validade curta, vale uma vez e não é aceito como token de sessão
