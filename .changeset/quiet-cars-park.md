---
"tech-challenge-api": minor
---

CRUD de veículos (`/vehicles`, só ADMIN) com validação de placa no padrão antigo (ABC1234) e Mercosul (ABC1D23): cadastro vinculado ao cliente, listagem paginada via `QUERY` (por cliente e/ou placa), detalhe, alteração (inclusive conversão da placa para Mercosul) e exclusão bloqueada quando há ordens de serviço.
