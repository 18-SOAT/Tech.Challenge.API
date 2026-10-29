# tech-challenge-api

## 2.5.0

### Minor Changes

- e5bc5a0: Login único pelo e-mail canônico: aliases da mesma caixa de entrada (pontos e `+tag` no Gmail, `googlemail.com`, `+tag` no Outlook/Hotmail/Live, iCloud, Proton e Fastmail) não criam mais contas separadas. Cadastro, primeiro acesso e cadastro de funcionário com alias de um login existente recebem o mesmo 409 de e-mail em uso; login e redefinição de senha aceitam qualquer alias; o rate limit por conta passa a contar pelo e-mail canônico. Nova coluna `users.email_canonical` (`@unique`), com migration que faz o backfill e falha explicitamente se já houver contas duplicadas.

## 2.4.1

### Patch Changes

- 11b3a4d: Correção: elimina as 7 vulnerabilidades apontadas pelo bun audit nas dependências do CLI do Prisma (fast-uri por atualização; deepmerge-ts e mysql2 por overrides), move o HEALTHCHECK para o Dockerfile e adiciona o workflow de segurança (bun audit, gitleaks em todo o histórico e trivy no Dockerfile, no lockfile e nas imagens runtime e migrate) com o relatório em docs/security/relatorio-vulnerabilidades.md.

## 2.4.0

### Minor Changes

- 04d0277: Melhoria: adiciona a gestão administrativa das Ordens e das OS: listagem de OS com filtros por status, mecânico, cliente e período (QUERY /service-orders), a Fila de OS na ordem de atendimento — em execução, aguardando aprovação e em diagnóstico, pela chegada da Ordem (QUERY /service-orders/queue) —, a listagem e o detalhe da Ordem com as OS, o andamento e os totais orçado e aprovado (QUERY /orders e GET /orders/:id) e o tempo médio de execução, global e por serviço, comparado à duração estimada do catálogo (QUERY /service-orders/execution-time). O MECHANIC só vê as OS atribuídas a ele.
- 1784d77: Melhoria: endurece a camada HTTP. As rotas públicas de auth (login, cadastro, primeiro acesso, redefinição e definição de senha) ganham rate limit configurável por env (RATE_LIMIT_MAX, RATE_LIMIT_WINDOW_SECONDS), com 429 e Retry-After; no login e na redefinição a contagem também é por e-mail. Toda resposta passa a levar headers de segurança (CSP, nosniff, X-Frame-Options, HSTS, Referrer-Policy, no-store), com uma CSP própria para a documentação Scalar em /openapi. CORS só para as origens de CORS_ORIGINS (vazio = nenhuma), com o método QUERY liberado. O env é validado no boot: JWT_SECRET com no mínimo 32 caracteres, portas, URL e as variáveis novas falham alto em vez de virar padrão em silêncio.

## 2.3.0

### Minor Changes

- bf2ff4d: Melhoria: adiciona a aprovação e a rejeição do orçamento (POST /service-orders/:id/approve e /reject), pelo cliente dono da ordem ou por um ADMIN registrando a decisão. Aprovar congela o valor, passa a OS para IN_EXECUTION, baixa as peças do estoque e coloca a ordem em andamento numa única transação; com saldo insuficiente nada é gravado e a OS continua aguardando aprovação. Também adiciona os testes de integração contra Postgres real (bun run test:integration)
- a9ec030: Melhoria: adiciona a criação da OS com orçamento automático. O ADMIN abre a ordem pelo CPF/CNPJ e pela placa (POST /orders, com os serviços pedidos no balcão) e atribui o mecânico (PATCH /service-orders/:id/assignee). O mecânico responsável (ou um ADMIN) inclui serviços e peças com o preço congelado do catálogo, corrige ou remove itens e conclui o diagnóstico (POST /service-orders/:id/complete-diagnosis), que gera o orçamento em AWAITING_APPROVAL e o envia ao e-mail do cliente. Também inclui o reparo adicional (POST /orders/:id/service-orders) e o detalhe da OS (GET /service-orders/:id)
- 3f5757c: Melhoria: adiciona a finalização da OS pelo mecânico responsável (POST /service-orders/:id/finish), a entrega do veículo pelo ADMIN (POST /orders/:id/deliver, só com todas as OS finalizadas ou rejeitadas) e a consulta do andamento pelo cliente (GET /me/orders e GET /me/orders/:id), com os status do enunciado calculados a partir da Ordem e das OS e o orçamento item a item. Transições simultâneas da mesma OS passam a ser barradas com 409 (lock otimista pelo status), e a entrega e o reparo adicional travam a Ordem para nunca sobrar OS aberta num veículo entregue
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
