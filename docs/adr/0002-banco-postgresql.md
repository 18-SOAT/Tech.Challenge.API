# ADR 0002 — Banco de dados: PostgreSQL

- **Status:** aceito
- **Data:** 2026-11-02

## Contexto

O enunciado deixa o banco livre, mas pede que a escolha seja justificada. O domínio da oficina tem estas características:

- **É relacional por natureza.** Um cliente tem veículos. Uma Ordem (a passagem do veículo pela oficina) agrupa Ordens de Serviço, e cada uma tem itens (serviços e peças/insumos) que apontam para o catálogo e para o estoque. Quase toda consulta importante cruza essas tabelas: o detalhamento da OS, a fila do mecânico, a área do cliente e o tempo médio de execução.
- **Tem operações que precisam ser atômicas.** Aprovar um orçamento baixa o estoque de cada peça, grava os movimentos de estoque, congela o valor e muda o status, tudo de uma vez. Se faltar saldo de uma peça, nada pode ficar pela metade. Duas aprovações concorrentes da mesma peça também não podem deixar o estoque negativo.
- **Tem unicidade que é regra de negócio.** CPF/CNPJ, placa, SKU e e-mail não podem se repetir, inclusive quando duas requisições chegam ao mesmo tempo.
- **Precisa de histórico.** O histórico de status da OS e o razão (ledger) de movimentos de estoque são dados que crescem e são consultados por período.

## Decisão

Usar **PostgreSQL 17**, acessado pelo **Prisma ORM 7** com o driver adapter `@prisma/adapter-pg`.

- **Transações ACID** nos fluxos principais (aprovação do orçamento, abertura da OS, entrega). Os testes de integração em `test/integration/` provam o rollback quando falta saldo e o comportamento sob decisões concorrentes.
- **Constraints no banco** (`UNIQUE`, `FOREIGN KEY`, `NOT NULL`) como última linha de defesa. A aplicação valida antes, mas é o banco que garante a regra quando há corrida entre duas requisições. Uma violação de `UNIQUE` vira `409 Conflict`, e não `500`.
- **Schema versionado:** o `prisma/schema.prisma` é a fonte da verdade e as migrations em `prisma/migrations/` são aplicadas por um job dedicado no docker-compose (`prisma migrate deploy`).
- **Tipos adequados:** `uuid` para identificadores e `Decimal(10,2)` para dinheiro (sem erro de ponto flutuante).

## Alternativas consideradas

- **MongoDB (documentos):** os dados se cruzam o tempo todo (cliente ↔ veículo ↔ OS ↔ produto), então seria preciso duplicar dados ou fazer *lookups* manuais. As transações entre vários documentos existem, mas exigem replica set e são menos naturais. A unicidade entre coleções também ficaria mais frágil.
- **MySQL/MariaDB:** também atenderia os requisitos. O PostgreSQL ganhou pelo suporte mais completo a tipos (`uuid` nativo, `numeric` exato), pelo comportamento transacional mais previsível e pela familiaridade da equipe.
- **SQLite:** é simples para desenvolvimento, mas tem concorrência de escrita limitada e não representa um ambiente real de produção.

## Consequências

**Positivas**
- As regras de integridade (unicidade, referências, saldo de estoque dentro da transação) ficam garantidas no banco, e não só no código.
- O Prisma gera tipos a partir do schema, então mudar uma coluna quebra a compilação onde ela é usada.
- A imagem oficial `postgres:17-alpine` sobe no compose com healthcheck, sem nenhuma instalação local.

**Negativas / cuidados**
- Mudar o modelo exige uma migration. É o preço do schema rígido, e as migrations ficam no git.
- O domínio não conhece o Prisma: os repositórios em `infrastructure/persistence` traduzem entre entidades e linhas (mappers). Isso dá mais código, mas mantém o domínio independente do banco.
