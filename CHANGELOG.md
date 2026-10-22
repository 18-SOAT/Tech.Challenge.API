# tech-challenge-api

## 2.3.0

### Minor Changes

- a9ec030: Melhoria: adiciona a criação da OS com orçamento automático. O ADMIN abre a ordem pelo CPF/CNPJ e pela placa (POST /orders, com os serviços pedidos no balcão) e atribui o mecânico (PATCH /service-orders/:id/assignee). O mecânico responsável (ou um ADMIN) inclui serviços e peças com o preço congelado do catálogo, corrige ou remove itens e conclui o diagnóstico (POST /service-orders/:id/complete-diagnosis), que gera o orçamento em AWAITING_APPROVAL e o envia ao e-mail do cliente. Também inclui o reparo adicional (POST /orders/:id/service-orders) e o detalhe da OS (GET /service-orders/:id)
- 1422cfc: Melhoria: adiciona a gestão da equipe pelo ADMIN (POST/QUERY /employees, GET /employees/:id e PATCH /employees/:id/role): o funcionário cadastrado recebe por e-mail o link para definir a senha, e o papel pode ser alterado desde que sempre reste ao menos um ADMIN; o seed passa a criar também um MECHANIC de demonstração
- ab79007: Melhoria: adiciona o primeiro acesso do cliente cadastrado no balcão (POST /auth/first-access, por CPF/CNPJ) e a redefinição de senha (POST /auth/password-reset), ambos com link de acesso enviado por e-mail (Mailpit no docker compose) e resposta sempre igual, com ou sem cadastro; o link (POST /auth/set-password) tem validade curta, vale uma vez e não é aceito como token de sessão

## 2.2.0

### Minor Changes

- 5fc7e5c: Melhoria: adiciona o CRUD de peças e insumos (/products) com controle de estoque por livro-razão: entrada e ajuste (motivo obrigatório) gravam a movimentação e o saldo na mesma transação, extrato por produto e consulta de produtos abaixo do estoque mínimo
- dfa2f90: Melhoria: adiciona o CRUD do catálogo de serviços (/services), com preço validado pelo VO Money, desativação e consulta pelo mecânico

## 2.1.0

### Minor Changes

- fdfc615: CRUD de clientes (`/customers`, só ADMIN): cadastro no balcão, listagem paginada com o método HTTP `QUERY`, detalhe, alteração e exclusão bloqueada quando o cliente tem login, veículos ou ordens de serviço.
- 75549d6: CRUD de veículos (`/vehicles`, só ADMIN) com validação de placa no padrão antigo (ABC1234) e Mercosul (ABC1D23): cadastro vinculado ao cliente, listagem paginada via `QUERY` (por cliente e/ou placa), detalhe, alteração (inclusive conversão da placa para Mercosul) e exclusão bloqueada quando há ordens de serviço.

### Patch Changes

- 9f25989: Rotas protegidas passam a autenticar antes de validar o corpo: sem token responde 401 (e papel errado 403) mesmo com body inválido, em vez de 400.

## 2.0.0

### Major Changes

- e4cf7ff: Melhoria: migra a API de NestJS para Bun + Elysia. Todas as respostas passam a usar o envelope `{ data, message, status }` (inclusive `/health` e `/auth/*`), erros de domínio seguem um catálogo único com status HTTP padronizado, e a documentação OpenAPI passa a ser gerada a partir dos mesmos schemas que validam cada rota (`/openapi`).

### Minor Changes

- 20be8bd: Melhoria: ambiente completo com `docker compose up --build` (Postgres + migrations + seed + API). Adiciona a migration inicial do banco, um usuário ADMIN de demonstração (`admin@oficina.com` / `admin12345`) e o `GET /health` passa a checar o banco, respondendo `503` quando ele está indisponível.

## 1.0.0

### Major Changes

- b1045c5: Novidade: Adiciona modulo de autenticação, login, registre-se e /me

### Minor Changes

- 92f4b5e: Novidade: Adiciona a base do banco do projeto
- e93c37b: Novidade: Adiciona enums usados no projeto de acordo com as entidades

### Patch Changes

- 07e565c: Melhoria: Adiciona padrão para mensagens no changeset
- abb8403: Melhoria: Adiciona documentação sobre workflow e código
- aec1f8b: Docs: Adiciona template para entidades do sistema
- e522e58: Correção: Ajusta githubActions, changeset version e `PR` template no `CI`
