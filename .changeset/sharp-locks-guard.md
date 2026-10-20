---
"tech-challenge-api": patch
---

Rotas protegidas passam a autenticar antes de validar o corpo: sem token responde 401 (e papel errado 403) mesmo com body inválido, em vez de 400.
