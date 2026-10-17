# Domain Storytelling

Histórias de como a oficina trabalha, contadas na **linguagem pictográfica** do Domain Storytelling:

- **Atores**: quem age (pessoa ou sistema).
- **Objetos de trabalho**: aquilo com que se trabalha (veículo, ficha, orçamento, estoque).
- **Atividades**: o verbo, desenhado na seta entre ator e objeto.

Cada número é uma frase, lida na ordem: *ator → atividade → objeto de trabalho → (para outro ator)*. Cada ator aparece **uma vez** por história, e as setas numeradas contam a sequência a partir dele. Objetos de trabalho podem se repetir para as setas não se cruzarem.

São dois grupos de histórias:

- **As-Is**: o processo atual, com papel, planilha e telefone. Mostra as **dores** que justificam o sistema.
- **To-Be**: o mesmo trabalho com o sistema. Cada frase vira comandos e eventos do [Event Storming](linguagem-ubiqua.md#event-storming-em-texto).

As fontes são os arquivos `.egn` em [`domain-storytelling/`](domain-storytelling/). Eles abrem no VS Code com a extensão **Egon.io — The Domain Story Modeler** ou em [egon.io](https://egon.io) (*Import*). A imagem exportada (*Export → SVG*) fica ao lado, com o mesmo nome.

## Atores e objetos de trabalho

| Ator | Ícone | No código |
|---|---|---|
| Cliente | pessoa | `Customer` (com login opcional, `UserType.CUSTOMER`) |
| Atendente | pessoa | `Employee` com `EmployeeRole.ADMIN` |
| Mecânico | pessoa | `Employee` com `EmployeeRole.MECHANIC` |
| Sistema | sistema | a API (`src/`) |
| Fornecedor | pessoa | ator externo, **não modelado** no código (só origina a entrada de estoque) |

| Objeto de trabalho | Ícone | No código |
|---|---|---|
| Veículo | carro | `Vehicle` |
| CPF/CNPJ | documento | `Document` (VO) |
| Ordem | documento | `Order` |
| Ordem de Serviço | documento | `ServiceOrder` |
| Orçamento | dinheiro / e-mail | `ServiceOrder` em `AWAITING_APPROVAL` + `approvedAmount` |
| Peças e insumos, Produto | pasta / documento | `Product` (`PART` / `SUPPLY`) |
| Estoque | pasta | `Product.stockQuantity` + `StockMovement` |
| Histórico de status | informação | `ServiceOrderStatusHistory` |
| Fila de OS | pasta | read model: OS ordenadas por status e chegada |
| Produtos abaixo do mínimo | informação | read model: `stockQuantity < minimumStock` |
| Ficha de papel, Planilha, Ligação, Conversa | documento, pasta, telefone, conversa | só no As-Is: é o que o sistema substitui |

## As-Is: como é hoje

### 1. Chegada e orçamento

![As-Is 1](domain-storytelling/as-is-1-chegada-orcamento.svg)

| # | Frase | Dor |
|---|---|---|
| 1 | **Cliente** *traz* o veículo *ao* **Atendente** | |
| 2 | **Atendente** *anota dados* em ficha de papel | Sem histórico de clientes e veículos |
| 3 | **Atendente** *repassa* a ficha *ao* **Mecânico** | Prioridade decidida "de cabeça" |
| 4 | **Mecânico** *avalia* o veículo | |
| 5 | **Mecânico** *anota peças* na ficha | Itens ilegíveis ou esquecidos |
| 6 | **Mecânico** *devolve* a ficha *ao* **Atendente** | |
| 7 | **Atendente** *calcula à mão* em planilha de preços | Erro de cálculo; preço muda entre orçamentos |
| 8 | **Atendente** *liga e informa o preço* por ligação *ao* **Cliente** | Orçamento sem registro |
| 9 | **Cliente** *aprova* por ligação *ao* **Atendente** | Aprovação sem prova (quem, quando, quanto) |

### 2. Execução e estoque

![As-Is 2](domain-storytelling/as-is-2-execucao-estoque.svg)

| # | Frase | Dor |
|---|---|---|
| 1 | **Atendente** *avisa da aprovação* em conversa *ao* **Mecânico** | Serviço começa sem aprovação clara |
| 2 | **Mecânico** *retira peças* do estoque | |
| 3 | **Mecânico** *não dá baixa* na planilha de estoque | Saldo errado; falta peça sem aviso |
| 4 | **Mecânico** *executa serviço* no veículo | |
| 5 | **Cliente** *pergunta o andamento* por ligação *ao* **Atendente** | Cliente sem visibilidade |
| 6 | **Atendente** *pergunta* em conversa *ao* **Mecânico** | Interrupção da execução |

### 3. Entrega

![As-Is 3](domain-storytelling/as-is-3-entrega.svg)

| # | Frase | Dor |
|---|---|---|
| 1 | **Mecânico** *avisa o término* *ao* **Atendente** | Sem registro de quando terminou |
| 2 | **Atendente** *avisa que está pronto* por ligação *ao* **Cliente** | |
| 3 | **Cliente** *paga* *ao* **Atendente** | |
| 4 | **Atendente** *entrega* o veículo *ao* **Cliente** | |
| 5 | **Atendente** *arquiva na gaveta* a ficha de papel | Impossível medir tempo médio de execução |

## To-Be: com o sistema

### 1. Criação da OS

![To-Be 1](domain-storytelling/to-be-1-criacao-os.svg)

| # | Frase | Event Storming |
|---|---|---|
| 1 | **Cliente** *traz* o veículo *ao* **Atendente** | — |
| 2 | **Atendente** *informa* o CPF/CNPJ *ao* **Sistema** | *Identificar cliente* → `Cliente identificado` |
| 3 | **Atendente** *registra* o veículo no **Sistema** | *Cadastrar veículo* → `Veículo cadastrado` |
| 4 | **Atendente** *abre* a ordem no **Sistema** | *Abrir ordem* → `Ordem aberta` → `OS criada` |
| 5 | **Atendente** *atribui* a OS *ao* **Mecânico** | *Atribuir mecânico* → `Mecânico atribuído` |
| 6 | **Mecânico** *consulta* a fila de OS no **Sistema** | *Consultar fila de OS* (read model, por status e chegada) |
| 7 | **Mecânico** *diagnostica* o veículo | — |
| 8 | **Mecânico** *inclui itens* (serviços e peças) na OS no **Sistema** | *Incluir serviço / peça* → `Serviço incluído`, `Peça/insumo incluído` |
| 9 | **Sistema** *gera* o orçamento | *Concluir diagnóstico* → `Diagnóstico concluído` → `Orçamento gerado` |
| 10 | **Sistema** *envia* o orçamento *ao* **Cliente** | `Orçamento enviado para aprovação` (e-mail) |

### 2. Acompanhamento

![To-Be 2](domain-storytelling/to-be-2-acompanhamento.svg)

| # | Frase | Event Storming |
|---|---|---|
| 1 | **Cliente** *consulta* a OS no **Sistema** | *Consultar andamento* (read model) |
| 2 | **Cliente** *aprova ou rejeita* o orçamento no **Sistema** | `Orçamento aprovado` / `Orçamento rejeitado` |
| 3 | **Sistema** *baixa peças* do estoque | `Estoque baixado`, na mesma transação da aprovação |
| 4 | **Mecânico** *executa serviços* no veículo | — |
| 5 | **Mecânico** *finaliza* a OS no **Sistema** | *Finalizar OS* → `OS finalizada` |
| 6 | **Sistema** *registra* o histórico de status | política: toda transição grava `ServiceOrderStatusHistory` |
| 7 | **Atendente** *entrega* o veículo *ao* **Cliente** | *Entregar veículo* → `Ordem entregue` |

### 3. Peças e insumos

![To-Be 3](domain-storytelling/to-be-3-pecas-insumos.svg)

| # | Frase | Event Storming |
|---|---|---|
| 1 | **Fornecedor** *entrega* peças e insumos *ao* **Atendente** | — (fora do sistema) |
| 2 | **Atendente** *cadastra* o produto no **Sistema** | *Cadastrar produto* → `Produto cadastrado` |
| 3 | **Atendente** *registra* a entrada de estoque no **Sistema** | *Registrar entrada* → `Entrada de estoque registrada` |
| 4 | **Sistema** *baixa*, na aprovação do orçamento, o estoque | `Estoque baixado` |
| 5 | **Atendente** *consulta* os produtos abaixo do mínimo no **Sistema** | *Consultar produtos abaixo do mínimo* (read model) |
| 6 | **Atendente** *ajusta*, após inventário, o estoque no **Sistema** | *Ajustar estoque* → `Estoque ajustado` |

## Antes × Depois

| Dor (As-Is) | Solução (To-Be) | Onde aparece no modelo |
|---|---|---|
| Ficha de papel, sem histórico de cliente e veículo | Cadastro com CPF/CNPJ e placa validados | `Customer`, `Vehicle`, `Document`, `LicensePlate` |
| Prioridade decidida "de cabeça" | Fila de OS ordenada por status e chegada; mecânico responsável atribuído | read model *Fila de OS*, `Mecânico atribuído` |
| Cálculo à mão, preço muda entre orçamentos | Orçamento gerado a partir do catálogo, com preço congelado nos itens | `Orçamento gerado`, `ServiceItem`/`ProductItem` (snapshot) |
| Orçamento e aprovação por telefone, sem prova | Orçamento por e-mail; aprovação/rejeição registrada no sistema pelo cliente autenticado, com valor congelado e histórico | `Orçamento enviado`, `Orçamento aprovado` / `rejeitado`, `approvedAmount` |
| Peça retirada sem baixa, saldo errado | Baixa automática e atômica na aprovação; livro-razão de movimentações; consulta de produtos abaixo do mínimo | `Estoque baixado`, `StockMovement`, read model *Produtos abaixo do mínimo* |
| Cliente liga para saber o andamento | Consulta do status e do histórico pela API, com primeiro acesso por e-mail | read model *Andamento da ordem*, `Acesso ativado` |
| Aviso de boca entre atendente e mecânico | Transições de status explícitas na OS | `ServiceOrderStatus`, `OS finalizada` |
| Ficha arquivada na gaveta, sem métrica | Histórico append-only → tempo médio de execução | `ServiceOrderStatusHistory` |
