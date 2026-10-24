---
"tech-challenge-api": minor
---

Melhoria: adiciona a gestão administrativa das Ordens e das OS: listagem de OS com filtros por status, mecânico, cliente e período (QUERY /service-orders), a Fila de OS na ordem de atendimento — em execução, aguardando aprovação e em diagnóstico, pela chegada da Ordem (QUERY /service-orders/queue) —, a listagem e o detalhe da Ordem com as OS, o andamento e os totais orçado e aprovado (QUERY /orders e GET /orders/:id) e o tempo médio de execução, global e por serviço, comparado à duração estimada do catálogo (QUERY /service-orders/execution-time). O MECHANIC só vê as OS atribuídas a ele.
