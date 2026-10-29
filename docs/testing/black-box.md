# Testes black-box: levantamento por módulo

Este documento descreve o que a API promete a quem a consome (um front-end, por exemplo): quem pode chamar cada rota, os fluxos, as regras observáveis por HTTP e os erros. É a **fonte de verdade dos testes black-box** (`test/black-box/`): o teste nasce daqui, e não da leitura do código.

Os termos (Ordem, Ordem de Serviço, orçamento, e-mail canônico…) seguem a [linguagem ubíqua](../ddd/linguagem-ubiqua.md).

## As três camadas de teste

| Camada | Onde | O que prova | O que não alcança |
|---|---|---|---|
| Unitário | `src/**/*.spec.ts` | Regra de domínio e orquestração do use case, com fakes | HTTP, banco, e-mail |
| e2e com fakes | `test/*.e2e.spec.ts` | Rota, validação, envelope, status, com `makeTestApp()` e `app.handle()` | Adapters Prisma, transações, locks |
| Integração | `test/integration/` | Use case + adapter Prisma contra Postgres real (rollback, corrida) | A camada HTTP |
| **Black-box** | `test/black-box/` | **A API inteira, só por HTTP**, com Postgres e Mailpit reais | O que não é observável pela API |

O black-box é a única camada em que nada é substituído: o teste não importa use case nem repository, só chama URLs, lê respostas e lê e-mails no Mailpit.

## Convenções

- **Envelope:** toda resposta é `{ data, message, status }`. Erro tem `data: null`.
- **DELETE:** responde 200 com `data: null`.
- **Listagens:** usam o método `QUERY`, com os filtros no body. Paginação: `page` inteiro ≥ 1 (padrão 1) e `limit` de 1 a 100 (padrão 20); fora disso, 400. A resposta é `{ items, total, page, limit }`.
- **Ordem das checagens:** autenticação → autorização → validação do body → regra de negócio. Uma requisição sem token recebe 401, mesmo com body inválido; com papel errado, 403, mesmo com body inválido (`auth.plugin.ts` checa no `transform`, antes da validação).
- **Validação de entrada** (TypeBox ou value object) → 400. Os únicos 422 são regras de domínio (`ORDER_VEHICLE_NOT_OWNED_BY_CUSTOMER` e `SERVICE_ORDER_ASSIGNEE_NOT_MECHANIC`).
- **Campo fora do schema** é descartado pelo Elysia, não vira 400. Se não sobrar campo num PATCH, o `minProperties` responde 400.
- **Rota inexistente** → 404. **Body malformado** → 400.

## 1. Matriz de autorização

**Contrato:** o teste `test/black-box/authorization.black-box.spec.ts` faz parse desta tabela e roda um caso por célula. Alterar uma permissão no código exige alterar esta tabela no mesmo PR; caso contrário, o teste falha.

Formato (não mude sem mudar o parser):
- a rota é escrita como `` `MÉTODO /caminho` ``;
- cada célula é o status HTTP esperado ou `—` (combinação que não se aplica: não é testada).

Perfis:
- **Anônimo:** sem header `Authorization`.
- **CUSTOMER:** cliente logado que **não** é dono do recurso.
- **CUSTOMER dono:** cliente dono da Ordem. Só se aplica às rotas com regra de dono.
- **MECHANIC:** mecânico que **não** é o responsável pela OS (ou rota sem responsável).
- **MECHANIC responsável:** mecânico atribuído à OS. Só se aplica às rotas da OS.
- **ADMIN:** atendente.

Nas rotas públicas só a coluna Anônimo é preenchida: o token é ignorado.

Para as células de sucesso, o teste prepara o recurso no estado em que a rota tem sucesso (ex: OS em `AWAITING_APPROVAL` para aprovar, produto sem uso para excluir). A matriz testa **quem pode**; as regras de estado ficam nos cenários da seção 2.

| Rota | Anônimo | CUSTOMER | CUSTOMER dono | MECHANIC | MECHANIC responsável | ADMIN |
|---|---|---|---|---|---|---|
| `GET /health` | 200 | — | — | — | — | — |
| `GET /openapi` | 200 | — | — | — | — | — |
| `POST /auth/register` | 201 | — | — | — | — | — |
| `POST /auth/login` | 200 | — | — | — | — | — |
| `POST /auth/first-access` | 202 | — | — | — | — | — |
| `POST /auth/password-reset` | 202 | — | — | — | — | — |
| `POST /auth/set-password` | 200 | — | — | — | — | — |
| `GET /auth/me` | 401 | 200 | — | 200 | — | 200 |
| `POST /employees` | 401 | 403 | — | 403 | — | 201 |
| `QUERY /employees` | 401 | 403 | — | 403 | — | 200 |
| `GET /employees/:id` | 401 | 403 | — | 403 | — | 200 |
| `PATCH /employees/:id/role` | 401 | 403 | — | 403 | — | 200 |
| `POST /customers` | 401 | 403 | — | 403 | — | 201 |
| `QUERY /customers` | 401 | 403 | — | 403 | — | 200 |
| `GET /customers/:id` | 401 | 403 | — | 403 | — | 200 |
| `PATCH /customers/:id` | 401 | 403 | — | 403 | — | 200 |
| `DELETE /customers/:id` | 401 | 403 | — | 403 | — | 200 |
| `POST /vehicles` | 401 | 403 | — | 403 | — | 201 |
| `QUERY /vehicles` | 401 | 403 | — | 403 | — | 200 |
| `GET /vehicles/:id` | 401 | 403 | — | 403 | — | 200 |
| `PATCH /vehicles/:id` | 401 | 403 | — | 403 | — | 200 |
| `DELETE /vehicles/:id` | 401 | 403 | — | 403 | — | 200 |
| `QUERY /services` | 401 | 403 | — | 200 | — | 200 |
| `GET /services/:id` | 401 | 403 | — | 200 | — | 200 |
| `POST /services` | 401 | 403 | — | 403 | — | 201 |
| `PATCH /services/:id` | 401 | 403 | — | 403 | — | 200 |
| `DELETE /services/:id` | 401 | 403 | — | 403 | — | 200 |
| `QUERY /products` | 401 | 403 | — | 200 | — | 200 |
| `GET /products/:id` | 401 | 403 | — | 200 | — | 200 |
| `QUERY /products/:id/stock-movements` | 401 | 403 | — | 200 | — | 200 |
| `POST /products` | 401 | 403 | — | 403 | — | 201 |
| `PATCH /products/:id` | 401 | 403 | — | 403 | — | 200 |
| `DELETE /products/:id` | 401 | 403 | — | 403 | — | 200 |
| `POST /products/:id/stock/entries` | 401 | 403 | — | 403 | — | 201 |
| `POST /products/:id/stock/adjustments` | 401 | 403 | — | 403 | — | 201 |
| `POST /orders` | 401 | 403 | — | 403 | — | 201 |
| `POST /orders/:id/service-orders` | 401 | 403 | — | 403 | — | 201 |
| `POST /orders/:id/deliver` | 401 | 403 | — | 403 | — | 200 |
| `QUERY /orders` | 401 | 403 | — | 403 | — | 200 |
| `GET /orders/:id` | 401 | 403 | — | 403 | — | 200 |
| `PATCH /service-orders/:id/assignee` | 401 | 403 | — | 403 | — | 200 |
| `QUERY /service-orders/execution-time` | 401 | 403 | — | 403 | — | 200 |
| `QUERY /service-orders` | 401 | 403 | — | 200 | — | 200 |
| `QUERY /service-orders/queue` | 401 | 403 | — | 200 | — | 200 |
| `GET /service-orders/:id` | 401 | 403 | — | 403 | 200 | 200 |
| `POST /service-orders/:id/services` | 401 | 403 | — | 403 | 201 | 201 |
| `POST /service-orders/:id/products` | 401 | 403 | — | 403 | 201 | 201 |
| `PATCH /service-orders/:id/items/:itemId` | 401 | 403 | — | 403 | 200 | 200 |
| `DELETE /service-orders/:id/items/:itemId` | 401 | 403 | — | 403 | 200 | 200 |
| `POST /service-orders/:id/complete-diagnosis` | 401 | 403 | — | 403 | 200 | 200 |
| `POST /service-orders/:id/finish` | 401 | 403 | — | 403 | 200 | 200 |
| `POST /service-orders/:id/approve` | 401 | 403 | 200 | 403 | 403 | 200 |
| `POST /service-orders/:id/reject` | 401 | 403 | 200 | 403 | 403 | 200 |
| `GET /me/orders` | 401 | 200 | — | 403 | — | 403 |
| `GET /me/orders/:id` | 401 | 404 | 200 | 403 | — | 403 |

Observações sobre a matriz:
- **`QUERY /service-orders` e `/queue` para MECHANIC:** nunca dão 403. A lista vem restrita às OS dele, e um filtro `assigneeId` de outro mecânico é ignorado (`ServiceOrder.assigneeScopeFor`). Isso é cenário em `SO-Q02`.
- **`GET /me/orders/:id` de outro cliente → 404, e não 403:** a API não confirma que a Ordem existe.
- **Aprovar/rejeitar:** o guard só exige token; quem decide é o cliente dono ou o ADMIN (`Order.assertQuoteCanBeDecidedBy`). Um id inexistente dá 404 antes da checagem de dono.
- **O CUSTOMER não tem rota de veículos nem de perfil próprio** além de `GET /auth/me` e `/me/orders`.
- **`GET /openapi/json`** (spec gerada pelo plugin) não entra na matriz; é usado só para conferir que a matriz cobre todas as rotas.

## 2. Cenários por módulo

Os IDs são estáveis: o teste da #36 usa o ID no nome (`it('AUTH-03: login com alias do e-mail', …)`), e um cenário removido não tem o ID reaproveitado.

### auth

| ID | Cenário | Passos (HTTP) | Esperado |
|---|---|---|---|
| AUTH-01 | Auto-cadastro e login | `POST /auth/register` com documento, e-mail, telefone e senha → `POST /auth/login` | 201 com o usuário; login 200 com `accessToken`; `GET /auth/me` com o token devolve `type: CUSTOMER` e o `customerId` |
| AUTH-02 | Cadastro com alias de e-mail em uso | Cadastro com `joaosilva@gmail.com` → cadastro com `j.o.a.o.silva+x@googlemail.com` e outro documento | Segundo: 409 `USER_EMAIL_ALREADY_IN_USE` |
| AUTH-03 | Login com alias | Cadastro com `joaosilva@gmail.com` → login com `JoaoSilva+loja@gmail.com` | 200 |
| AUTH-04 | Alias não se aplica a domínio corporativo | Cadastro com `ana@empresa.com.br` → cadastro com `ana+x@empresa.com.br` | Segundo: 201 (são caixas diferentes) |
| AUTH-05 | Credenciais inválidas | Login com e-mail inexistente; login com senha errada | Os dois: 401 `AUTH_INVALID_CREDENTIALS`, com a mesma mensagem |
| AUTH-06 | Documento já cadastrado no balcão | ADMIN `POST /customers` → `POST /auth/register` com o mesmo documento | 409 `CUSTOMER_DOCUMENT_ALREADY_IN_USE` (o caminho é o primeiro acesso) |
| AUTH-07 | Primeiro acesso | ADMIN `POST /customers` → `POST /auth/first-access` com o documento → ler o e-mail no Mailpit → `POST /auth/set-password` com o token → login | 202; e-mail "Defina sua senha de acesso" para o e-mail do cadastro, com o token; set-password 200; login 200 |
| AUTH-08 | Primeiro acesso sem enumeração | `POST /auth/first-access` com documento válido inexistente; e com documento de cliente que já tem login | 202 nos dois; nenhum e-mail no Mailpit |
| AUTH-09 | Primeiro acesso com documento inválido | `POST /auth/first-access` com CPF de dígito errado | 400 |
| AUTH-10 | Redefinição de senha | `POST /auth/password-reset` → e-mail "Redefinição de senha" → `set-password` com senha nova → login com a senha nova e com a antiga | 202; set-password 200; login novo 200; login antigo 401 |
| AUTH-11 | Link de uso único | Repetir o `set-password` do AUTH-10 com o mesmo token | 400 `AUTH_ACCESS_LINK_INVALID` |
| AUTH-12 | Redefinição sem enumeração | `POST /auth/password-reset` com e-mail sem login | 202; nenhum e-mail |
| AUTH-13 | Token inválido no set-password | `set-password` com token adulterado; com o `accessToken` de sessão no lugar do token do link | 400 nos dois (audiências diferentes) |
| AUTH-14 | Token do link não vale como Bearer | Token do e-mail no header `Authorization` de `GET /auth/me` | 401 |
| AUTH-15 | Validação | Senha com menos de 8 caracteres; e-mail sem domínio; telefone com 9 dígitos | 400 |
| AUTH-16 | Rate limit por IP | App com limite baixo: estourar `POST /auth/login` com o mesmo IP | 429 com header `Retry-After` e o envelope padrão |
| AUTH-17 | Rate limit por conta | App com limite baixo: estourar `POST /auth/login` com o mesmo e-mail (escrito como aliases diferentes) vindo de IPs diferentes (`X-Forwarded-For`) | 429: o limite por conta usa o e-mail canônico |
| AUTH-18 | Rotas autenticadas fora do rate limit | App com limite baixo: muitas chamadas a `GET /auth/me` | Sempre 200 |

### employee

| ID | Cenário | Passos (HTTP) | Esperado |
|---|---|---|---|
| EMP-01 | Cadastro com link de acesso | ADMIN `POST /employees` (MECHANIC) → e-mail "Bem-vindo à equipe: defina sua senha" → `set-password` → login | 201; e-mail com token; set-password 200; login 200 e `GET /auth/me` com `role: MECHANIC` |
| EMP-02 | E-mail (ou alias) em uso | `POST /employees` com o e-mail de um cliente, escrito como alias | 409 `USER_EMAIL_ALREADY_IN_USE` |
| EMP-03 | Link expirado ou perdido | `POST /auth/password-reset` com o e-mail do funcionário | 202 e novo e-mail; o fluxo é o de redefinição |
| EMP-04 | Troca de papel | `PATCH /employees/:id/role` MECHANIC → ADMIN → login de novo | 200; o token antigo continua autorizando com o papel antigo até expirar (403 em rota de ADMIN), embora `GET /auth/me` já mostre `role: ADMIN` (relê do banco); o novo login acessa as rotas de ADMIN |
| EMP-05 | Mesmo papel | `PATCH` com o papel atual | 200, sem mudança |
| EMP-06 | Último ADMIN | Com um só ADMIN, rebaixá-lo | 409 `EMPLOYEE_LAST_ADMIN` |
| EMP-07 | Listagem e detalhe | `QUERY /employees` com filtro `role` e `name`; `GET /employees/:id` inexistente | 200 ordenado por nome; 404 |
| EMP-08 | Validação | Papel fora de ADMIN/MECHANIC; nome vazio | 400 |

### customer

| ID | Cenário | Passos (HTTP) | Esperado |
|---|---|---|---|
| CUS-01 | CRUD | `POST` → `GET /:id` → `PATCH` (nome, `phone: null`) → `QUERY` com filtro `name` e `document` → `DELETE` → `GET /:id` | 201; 200; 200 sem telefone; o cliente aparece na listagem; 200; 404 |
| CUS-02 | Documento normalizado | `POST` com CPF formatado (`529.982.247-25`) | 201 e o documento gravado só com dígitos |
| CUS-03 | Validação do documento | CPF com dígito errado; CPF com todos os dígitos iguais; CNPJ inválido; 12 dígitos | 400 em todos |
| CUS-04 | Outras validações | Telefone com 9 ou 12 dígitos; e-mail inválido; `PATCH` com body vazio | 400 |
| CUS-05 | Documento duplicado | Dois `POST` com o mesmo documento | 409 `CUSTOMER_DOCUMENT_ALREADY_IN_USE` |
| CUS-06 | Documento imutável | `PATCH` só com `document`; `PATCH` com `document` e `name` | 400 (nada sobra para alterar); 200 com o nome novo e o documento antigo |
| CUS-07 | Exclusão de cliente com login | Cliente do AUTH-01 → `DELETE` | 409 `CUSTOMER_HAS_LINKED_ACCESS` |
| CUS-08 | Exclusão de cliente com veículo | Cliente com veículo → `DELETE` | 409 `CUSTOMER_HAS_DEPENDENCIES` |
| CUS-09 | Paginação | `QUERY` com `limit: 0`, `limit: 101`, `page: 0` | 400 |

### vehicle

| ID | Cenário | Passos (HTTP) | Esperado |
|---|---|---|---|
| VEH-01 | CRUD | `POST` → `GET /:id` → `PATCH` (modelo) → `QUERY` por `customerId` e por placa → `DELETE` | 201; 200; 200; encontrado; 200 |
| VEH-02 | Formatos de placa | `POST` com `ABC1234` (antiga), `ABC1D23` (Mercosul), `abc-1d23` | 201; placa gravada em maiúsculas, sem hífen |
| VEH-03 | Placa inválida | `AB1234`, `ABCD123`, `ABC12D3` | 400 |
| VEH-04 | Busca por placa normalizada | `QUERY` com `plate` em minúsculas e com hífen | Encontra o veículo |
| VEH-05 | Placa duplicada | Dois `POST` com a mesma placa; `PATCH` de outro veículo para essa placa | 409 `VEHICLE_LICENSE_PLATE_ALREADY_IN_USE` |
| VEH-06 | Cliente inexistente | `POST` com `customerId` válido inexistente | 404 `CUSTOMER_NOT_FOUND` |
| VEH-07 | Ano | `year: 1899`; ano atual + 2; ano atual + 1 | 400; 400; 201 |
| VEH-08 | Exclusão com OS | Veículo com Ordem → `DELETE` | 409 `VEHICLE_HAS_SERVICE_ORDERS` |
| VEH-09 | Dono imutável | `PATCH` com `customerId` e `model` | 200; o dono continua o mesmo |

### inventory

| ID | Cenário | Passos (HTTP) | Esperado |
|---|---|---|---|
| INV-01 | CRUD de serviço | `POST /services` (nome, preço, duração estimada) → `GET` → `PATCH` → `QUERY` → `DELETE` | 201; 200; 200; 200; 200 |
| INV-02 | Nome de serviço duplicado | `POST` "Troca de óleo" → `POST` "troca de óleo" | 409 `SERVICE_NAME_ALREADY_IN_USE` |
| INV-03 | Validação de serviço | Preço negativo; preço com 3 casas; duração 0 | 400 |
| INV-04 | Serviço desativado | `PATCH` `active: false` → abrir Ordem com esse serviço / incluí-lo numa OS | 409 `SERVICE_ORDER_INACTIVE_CATALOG_ITEM` |
| INV-05 | Serviço em uso | Serviço numa OS → `DELETE /services/:id` | 409 `SERVICE_IN_USE` |
| INV-06 | Cadastro de produto | `POST /products` com `sku: "filtro-01"` | 201; SKU `FILTRO-01`; estoque 0 |
| INV-07 | SKU | SKU duplicado (outra caixa); SKU com caractere inválido | 409 `PRODUCT_SKU_ALREADY_IN_USE`; 400 |
| INV-08 | Entrada de estoque | `POST /products/:id/stock/entries` (10) → `GET /products/:id` | 201; estoque 10 |
| INV-09 | Ajuste | Ajuste −3 com motivo; ajuste sem motivo; ajuste 0 | 201 e estoque 7; 400; 400 |
| INV-10 | Ajuste deixaria saldo negativo | Com estoque 7, ajuste −8 | 409 `PRODUCT_INSUFFICIENT_STOCK`; estoque continua 7 |
| INV-11 | Histórico de movimentações | `QUERY /products/:id/stock-movements` depois de INV-08 e INV-09 | Entrada (IN) e ajuste (ADJUSTMENT), com quantidade e motivo; produto inexistente → 404 |
| INV-12 | Abaixo do mínimo | Produtos com estoque abaixo, igual e acima do `minimumStock` → `QUERY /products` com `belowMinimum: true` | Só o de estoque abaixo do mínimo |
| INV-13 | Estoque só muda por movimentação | `POST /products` com `stockQuantity: 10`; `PATCH` só com `stockQuantity`; `PATCH` com `stockQuantity` e `name` | Nasce com 0; 400; 200 com o nome novo e o estoque inalterado |
| INV-14 | Produto em uso | Produto numa OS ou com movimentação → `DELETE` | 409 `PRODUCT_IN_USE` |

### service-order

**SO-01: fluxo feliz de ponta a ponta.** Um teste só, com as checagens a cada passo:

| Passo | Quem | Requisição | Esperado |
|---|---|---|---|
| 1 | ADMIN | Prepara: cliente (auto-cadastro, para ter login), veículo, serviço, produto com estoque 10 | — |
| 2 | ADMIN | `POST /orders` com `document`, `plate` e um serviço | 201; Ordem `RECEIVED`; uma OS `IN_DIAGNOSIS` |
| 3 | CUSTOMER | `GET /me/orders/:id` | 200; progresso `RECEIVED` (OS sem responsável) |
| 4 | ADMIN | `PATCH /service-orders/:id/assignee` com o MECHANIC | 200; `/me/orders/:id` passa a mostrar `IN_DIAGNOSIS` |
| 5 | MECHANIC | `POST /service-orders/:id/products` (produto, quantidade 2) | 201; total recalculado com o preço do catálogo |
| 6 | MECHANIC | `POST /service-orders/:id/complete-diagnosis` | 200; OS `AWAITING_APPROVAL`; e-mail "Orçamento da ordem nº N" para o e-mail do cliente, com uma linha por item e o total em reais |
| 7 | CUSTOMER | `POST /service-orders/:id/approve` | 200; OS `IN_EXECUTION` com valor aprovado; Ordem `IN_PROGRESS`; estoque 8; movimentação OUT de 2 |
| 8 | MECHANIC | `POST /service-orders/:id/finish` | 200; OS `FINISHED` |
| 9 | ADMIN | `POST /orders/:id/deliver` | 200; Ordem `DELIVERED` com `deliveredAt`; `/me/orders/:id` mostra `DELIVERED` |
| 10 | ADMIN | `QUERY /service-orders/execution-time` com o intervalo de hoje | A OS entra na média global e na linha do serviço |

**Regras:**

| ID | Cenário | Passos (HTTP) | Esperado |
|---|---|---|---|
| SO-02 | Cliente ou veículo inexistente | `POST /orders` com documento válido sem cadastro; com placa sem cadastro | 404 `CUSTOMER_NOT_FOUND`; 404 `VEHICLE_NOT_FOUND` |
| SO-03 | Veículo de outro cliente | `POST /orders` com documento do cliente A e placa do cliente B | 422 `ORDER_VEHICLE_NOT_OWNED_BY_CUSTOMER` |
| SO-04 | Veículo com Ordem aberta | Duas Ordens para o mesmo veículo (em série) | Segunda: 409 `ORDER_VEHICLE_HAS_OPEN_ORDER`; depois da entrega, uma nova Ordem é aceita |
| SO-05 | Responsável que não é mecânico | `PATCH /assignee` com um ADMIN | 422 `SERVICE_ORDER_ASSIGNEE_NOT_MECHANIC` |
| SO-06 | Diagnóstico sem responsável | `complete-diagnosis` numa OS sem mecânico (pelo ADMIN) | 409 `SERVICE_ORDER_NO_ASSIGNEE` |
| SO-07 | Diagnóstico sem itens | OS sem serviço nem produto → `complete-diagnosis` | 409 `SERVICE_ORDER_EMPTY_QUOTE` |
| SO-08 | Itens só em diagnóstico | OS em `AWAITING_APPROVAL` → incluir, alterar ou remover item | 409 `SERVICE_ORDER_NOT_IN_DIAGNOSIS` |
| SO-09 | Itens | Incluir o mesmo produto duas vezes; alterar a quantidade; remover; quantidade 0 | Quantidade somada; preço unitário mantido; OS recalculada; 400 |
| SO-10 | Transições inválidas | `approve` em `IN_DIAGNOSIS`; `finish` em `AWAITING_APPROVAL`; `assignee` em OS `FINISHED` | 409 em todos (`NOT_AWAITING_APPROVAL`, `NOT_IN_EXECUTION`, `ALREADY_CLOSED`) |
| SO-11 | Rejeição | `reject` → estoque e entrega | OS `REJECTED`; estoque inalterado; `deliver` → 200 (Ordem vai de `RECEIVED` para `DELIVERED`) |
| SO-12 | Saldo insuficiente na aprovação | OS com 5 unidades de um produto com estoque 3 → `approve` | 409 `PRODUCT_INSUFFICIENT_STOCK`; OS continua `AWAITING_APPROVAL` sem valor aprovado; estoque 3; nenhuma movimentação; Ordem continua `RECEIVED` |
| SO-13 | Aprovação depois de repor estoque | Depois do SO-12, entrada de 10 → `approve` | 200 |
| SO-14 | Entrega com OS aberta | Ordem com OS em `IN_EXECUTION` → `deliver` | 409 `ORDER_HAS_OPEN_SERVICE_ORDERS` |
| SO-15 | Entrega repetida | `deliver` duas vezes | Segunda: 409 `ORDER_ALREADY_DELIVERED` |
| SO-16 | Reparo adicional | `POST /orders/:id/service-orders` numa Ordem em andamento; numa Ordem entregue | 201 com nova OS `IN_DIAGNOSIS`; 409 `ORDER_ALREADY_DELIVERED` |
| SO-17 | Aprovação pelo ADMIN | ADMIN registra a decisão do cliente → `approve` | 200 |

**Consultas:**

| ID | Cenário | Passos (HTTP) | Esperado |
|---|---|---|---|
| SO-Q01 | Fila por prioridade | OS em `IN_DIAGNOSIS`, `AWAITING_APPROVAL` e `IN_EXECUTION`, mais uma `FINISHED` → `QUERY /service-orders/queue` | Ordem: `IN_EXECUTION`, `AWAITING_APPROVAL`, `IN_DIAGNOSIS`; a `FINISHED` não aparece |
| SO-Q02 | Escopo do mecânico | Dois mecânicos com OS cada → `QUERY /service-orders` pelo mecânico A, com e sem `assigneeId` do B | Só as OS do A nos dois casos |
| SO-Q03 | Filtros de data | `QUERY /service-orders/execution-time` com data fora de ISO 8601 | 400 |
| SO-Q04 | Totais da Ordem | Ordem com uma OS aprovada e outra rejeitada → `GET /orders/:id` | `quotedTotal` soma as duas; `approvedTotal` só a aprovada |
| SO-Q05 | Área do cliente | Cliente com duas Ordens → `GET /me/orders` | Só as dele |
| SO-Q06 | Tempo médio por serviço | Duas OS finalizadas, uma com o serviço X → `execution-time` com `serviceId: X` | Só a OS com X; tempo em minutos com 1 casa; `estimatedDurationMinutes` do catálogo para comparação |
| SO-Q07 | Tempo médio sem dados | Intervalo sem OS finalizada | 200 com média 0 |

## 3. Concorrência

Cada cenário dispara as requisições ao mesmo tempo (`Promise.all`) e confere, **pela API**, que só uma passou e que o estado final ficou consistente.

| ID | Cenário | Requisições paralelas | Esperado | O que garante |
|---|---|---|---|---|
| CON-01 | Duas Ordens para o mesmo veículo | 2× `POST /orders` com a mesma placa | Uma 201, outra 409 `ORDER_VEHICLE_HAS_OPEN_ORDER`; `QUERY /orders` mostra uma Ordem | `SELECT … FOR UPDATE` no veículo (`prisma-order-opening.repository.ts`) |
| CON-02 | Dois rebaixamentos de ADMIN | Com 2 ADMINs, cada um rebaixa o outro | Uma 200, outra 409 `EMPLOYEE_LAST_ADMIN`; sobra 1 ADMIN | `FOR UPDATE` nos ADMINs (`prisma-employee.repository.ts`) |
| CON-03 | Duas aprovações da mesma OS | 2× `approve` | Uma 200, outra 409; estoque baixado uma vez só; uma movimentação OUT | Update condicional em `AWAITING_APPROVAL` + transação |
| CON-04 | Aprovar e rejeitar ao mesmo tempo | `approve` + `reject` | Uma 200, outra 409; status final coerente com a que passou; estoque só baixa se a aprovação venceu | Mesmo update condicional |
| CON-05 | Duas baixas do mesmo produto | Com estoque 5, 2× ajuste −3 | Uma 201, outra 409 `PRODUCT_INSUFFICIENT_STOCK`; estoque 2 | `updateMany where stockQuantity >= 3` |
| CON-06 | Duas aprovações disputando o estoque | Estoque 3; duas OS diferentes com 2 unidades cada → 2× `approve` | Uma 200, outra 409 com rollback (OS continua `AWAITING_APPROVAL`); estoque 1 | Update condicional do estoque dentro da transação da aprovação |
| CON-07 | Entrega e reparo adicional | `deliver` + `POST /orders/:id/service-orders` (Ordem com todas as OS finalizadas) | Ou entrega 200 e reparo 409, ou reparo 201 e entrega 409; nunca Ordem entregue com OS aberta | `FOR UPDATE` na Ordem nos dois caminhos |
| CON-08 | Dois cadastros com aliases | `POST /auth/register` com `joao.silva@gmail.com` e `joaosilva+1@gmail.com` | Uma 201, outra 409 `USER_EMAIL_ALREADY_IN_USE` | `@unique` em `users.email_canonical` |
| CON-09 | Placa duplicada em paralelo | 2× `POST /vehicles` com a mesma placa | Uma 201, outra 409 | `@unique` na placa (P2002 → 409) |

## 4. Ambiente de teste

Decisões que a implementação (#36) segue:

- **Banco isolado:** `mechanic_system_test`, via `TEST_DATABASE_URL`, nunca o de desenvolvimento. Reusa `prepareTestDatabase()` e `resetDatabase()` de `test/integration/database.ts`, que recusam banco sem sufixo `_test` e aplicam as migrations com `prisma migrate deploy`.
- **Limpeza:** antes de cada teste, `resetDatabase()` (TRUNCATE) e o seed real (`seedDemoEmployees`, exportado de `prisma/seed.ts` e chamado em processo). O seed grava o ADMIN e o MECHANIC de demonstração com bcrypt de verdade.
  - O `seedWorkshop()` dos testes de integração **não** serve: grava `hashedPassword: 'x'`, então ninguém consegue logar.
- **Testes em série:** o banco é compartilhado.
- **App real em processo:**
  - O `src/server.ts` monta os containers reais, mas tem efeito colateral ao ser importado (`readEnv()` + `.listen()`). A #36 extrai a montagem para um `buildApp(env)`, usado pelo `server.ts` e pelo teste.
  - O teste chama `readEnv({ ... })` com valores próprios (o `.env` do desenvolvedor não vaza para o teste): `DATABASE_URL` de teste, `JWT_SECRET` fixo, `SMTP_HOST=localhost`, `SMTP_PORT=1025`, rate limit alto.
  - Sobe com `.listen(0)` (porta aleatória) e é chamado por `fetch`. Para o teste continua black-box, e a cobertura do Bun passa a medir os adapters Prisma.
- **Credenciais:**
  - ADMIN `admin@oficina.com` / `admin12345` e MECHANIC `mecanico@oficina.com` / `mecanico12345`, do seed.
  - CUSTOMER criado por `POST /auth/register`; outros funcionários por `POST /employees` + link no Mailpit.
  - Todos os tokens saem de `POST /auth/login`. Nenhum token é assinado pelo teste.
- **E-mail pelo Mailpit:**
  - SMTP em `localhost:1025`, API em `localhost:8025`.
  - `DELETE /api/v1/messages` antes de cada teste.
  - Os envios são fire-and-forget, depois do commit: o teste faz **polling** em `GET /api/v1/search?query=to:<e-mail>` com timeout curto, em vez de ler logo depois da resposta.
  - O token do link é extraído do corpo do e-mail. Para "nenhum e-mail enviado", o teste espera o mesmo timeout e confere que a busca veio vazia.
  - Nunca SMTP real em teste.
- **Rate limit:**
  - Não há flag para desligar. A suíte usa `RATE_LIMIT_MAX=100000`.
  - Os cenários de 429 (AUTH-16 a AUTH-18) sobem uma segunda instância do app com limite baixo. O limitador é em memória por instância, então os contadores começam zerados.
  - `TRUST_PROXY=true` nessa instância, para variar o IP por `X-Forwarded-For`.
- **Organização:**
  - Testes em `test/black-box/*.black-box.spec.ts`, um arquivo por módulo, mais `authorization.black-box.spec.ts` e `concurrency.black-box.spec.ts`.
  - Script próprio, `bun run test:black-box`, fora do `bun test`: o pre-push continua rápido e sem Docker.
  - Pré-requisito local: `docker compose up -d postgres mailpit`.
- **CI:** um job com `services: postgres` e `mailpit`, rodando migrations e a suíte.

## 5. Achados do levantamento

Pontos encontrados ao levantar as regras. Não são corrigidos aqui: cada um vira issue se o grupo decidir tratar.

1. **Nome de serviço único sem diferenciar maiúsculas só na aplicação.** O use case compara sem caixa, mas o `@unique` de `services.name` diferencia. Dois cadastros paralelos de "Troca de óleo" e "troca de óleo" podem passar os dois.
2. **"Uma Ordem aberta por veículo" depende só do lock.** Não há índice parcial no banco; quem garante é o `FOR UPDATE` na abertura (testado em CON-01).
3. **Edições de itens em diagnóstico: o último vence.** O `save()` da OS compara só o status; duas edições simultâneas em `IN_DIAGNOSIS` não se bloqueiam.
4. **Aprovação não confere se o produto ainda está ativo.** Um produto desativado depois do diagnóstico ainda é baixado na aprovação.
5. **Usuário inativo não é alcançável pela API.** O 401 `AUTH_USER_UNAVAILABLE` existe, mas nenhuma rota desativa um usuário; fica coberto só pelos testes unitários.
