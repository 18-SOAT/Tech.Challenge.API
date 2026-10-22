---
"tech-challenge-api": minor
---

Melhoria: adiciona a aprovação e a rejeição do orçamento (POST /service-orders/:id/approve e /reject), pelo cliente dono da ordem ou por um ADMIN registrando a decisão. Aprovar congela o valor, passa a OS para IN_EXECUTION, baixa as peças do estoque e coloca a ordem em andamento numa única transação; com saldo insuficiente nada é gravado e a OS continua aguardando aprovação. Também adiciona os testes de integração contra Postgres real (bun run test:integration)
