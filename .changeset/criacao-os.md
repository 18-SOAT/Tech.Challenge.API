---
"tech-challenge-api": minor
---

Melhoria: adiciona a criação da OS com orçamento automático. O ADMIN abre a ordem pelo CPF/CNPJ e pela placa (POST /orders, com os serviços pedidos no balcão) e atribui o mecânico (PATCH /service-orders/:id/assignee). O mecânico responsável (ou um ADMIN) inclui serviços e peças com o preço congelado do catálogo, corrige ou remove itens e conclui o diagnóstico (POST /service-orders/:id/complete-diagnosis), que gera o orçamento em AWAITING_APPROVAL e o envia ao e-mail do cliente. Também inclui o reparo adicional (POST /orders/:id/service-orders) e o detalhe da OS (GET /service-orders/:id)
