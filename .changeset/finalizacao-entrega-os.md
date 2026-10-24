---
"tech-challenge-api": minor
---

Melhoria: adiciona a finalização da OS pelo mecânico responsável (POST /service-orders/:id/finish), a entrega do veículo pelo ADMIN (POST /orders/:id/deliver, só com todas as OS finalizadas ou rejeitadas) e a consulta do andamento pelo cliente (GET /me/orders e GET /me/orders/:id), com os status do enunciado calculados a partir da Ordem e das OS e o orçamento item a item. Transições simultâneas da mesma OS passam a ser barradas com 409 (lock otimista pelo status), e a entrega e o reparo adicional travam a Ordem para nunca sobrar OS aberta num veículo entregue
