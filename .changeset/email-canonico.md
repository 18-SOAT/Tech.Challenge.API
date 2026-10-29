---
"tech-challenge-api": minor
---

Login único pelo e-mail canônico: aliases da mesma caixa de entrada (pontos e `+tag` no Gmail, `googlemail.com`, `+tag` no Outlook/Hotmail/Live, iCloud, Proton e Fastmail) não criam mais contas separadas. Cadastro, primeiro acesso e cadastro de funcionário com alias de um login existente recebem o mesmo 409 de e-mail em uso; login e redefinição de senha aceitam qualquer alias; o rate limit por conta passa a contar pelo e-mail canônico. Nova coluna `users.email_canonical` (`@unique`), com migration que faz o backfill e falha explicitamente se já houver contas duplicadas.
