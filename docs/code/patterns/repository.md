# Repository

Repository segue o padrão Ports & Adapters: uma interface (port) pertencente ao domain e uma implementação concreta (adapter) na infrastructure.

## Interface (port)

```typescript
// modules/customer/domain/repositories/customer.repository.ts
export interface CustomerRepository {
  findById(id: string): Promise<Customer | null>;
  findByDocument(document: string): Promise<Customer | null>;
  save(customer: Customer): Promise<void>;
}
```

O port é só a interface: não há token de injeção (`Symbol`) ao lado dela. Tokens só são necessários quando um container de DI resolve dependências em runtime, porque as interfaces somem na compilação. Aqui quem liga port → adapter é o composition root, em código TypeScript normal, e o compilador garante que o adapter implementa a interface.

## Nomenclatura: sem prefixo `I`

A interface mantém o nome limpo (`CustomerRepository`) porque é a abstração principal, a que aparece em todo Use Case. A implementação concreta carrega o qualificador, porque é o detalhe substituível:

```typescript
// modules/customer/infrastructure/persistence/prisma-customer.repository.ts
export class PrismaCustomerRepository implements CustomerRepository {
  constructor(private readonly prisma: PrismaClient) {}
  // ...
}
```

## Ligando no composition root

```typescript
// modules/customer/customer.container.ts
export function makeCustomerContainer(shared: SharedContainer) {
  const customerRepository: CustomerRepository = new PrismaCustomerRepository(shared.prisma);
  return {
    createCustomer: new CreateCustomerUseCase(customerRepository),
  };
}
```

Anotar a variável com o tipo do port (`: CustomerRepository`) deixa claro que, dali em diante, ninguém depende do Prisma.

## Interface base genérica: mantenha mínima

```typescript
// shared/domain/repository.interface.ts
export interface Repository<T, ID = string> {
  findById(id: ID): Promise<T | null>;
  save(entity: T): Promise<void>;
}
```

Coloque na interface base só operações realmente universais. Não force um `delete()` em todo repository se nem todo aggregate pode ser deletado. Cada `XxxRepository` específico estende a base e adiciona só as queries que seu aggregate precisa (Interface Segregation Principle).

## Transações: port nomeado pela operação

Quando uma operação precisa ser atômica entre aggregates, o port é nomeado pela **operação de negócio**, não por tabela, e o adapter abre a transação por dentro. Exemplo: `CustomerRegistrationRepository.register(user, customer)` cria User + Customer numa transação, ou os dois existem ou nenhum.

### Por que não Unit of Work

| | Repository por operação (adotado) | Unit of Work |
|---|---|---|
| Fronteira da transação | Dentro do adapter Prisma | No use case, que abre/fecha a transação |
| Use case | Não sabe que existe transação | Orquestra a transação |
| Repositories | Inalterados | Todos precisam aceitar o client da transação (`tx`) |
| Custo | Um port a mais por fluxo atômico | Infra de UoW + o tipo `tx` do Prisma tende a vazar para a application |

Os fluxos atômicos do projeto são poucos (cadastro, aprovação de orçamento, movimentação de estoque), então um port por fluxo sai mais barato e mantém domain e application sem Prisma. Se o número de fluxos crescer a ponto de os ports se multiplicarem, a troca para Unit of Work deve ser registrada em ADR.

### Regras

- **Regra de negócio na Entity, não no adapter.** O use case carrega os aggregates, chama os métodos da Entity (que validam e mudam o estado) e entrega o resultado ao port. O adapter só persiste tudo numa transação.
- **Invariante que depende do estado atual do banco** (estoque suficiente, status ainda válido) é garantida no adapter com **update condicional**: um `updateMany` com a condição no `where`. Se `count === 0`, o adapter lança o `DomainError` correspondente, e a exceção desfaz a transação inteira. Isso fecha a corrida entre duas requisições simultâneas sem subir o isolamento para `SERIALIZABLE`.
- **Erro do Prisma não sai da infrastructure**: `P2002` e afins viram `DomainError` (ver [Erros de unicidade do banco](#erros-de-unicidade-do-banco)).
- **O fake in-memory também é atômico**: valida tudo antes de mutar qualquer coleção, para que o teste unitário do use case enxergue o mesmo comportamento de "tudo ou nada".

### Lote ou interativa

| Forma | Quando usar | Exemplo |
|---|---|---|
| `$transaction([op1, op2])` (lote) | Escritas independentes, nenhuma depende do resultado da outra | `register(user, customer)` |
| `$transaction(async (tx) => { ... })` (interativa) | Um passo depende do resultado de outro, ou há update condicional que pode abortar | Aprovação de orçamento, baixa de estoque |

Na forma interativa, todas as queries usam o `tx` recebido, nunca `this.prisma`: uma query feita com `this.prisma` roda fora da transação e não é desfeita no rollback.

### Exemplo de referência: aprovação de orçamento

Aprovar congela o valor, muda o status, grava o histórico e baixa o estoque, tudo atômico.

```typescript
// modules/service-order/domain/ports/service-order-approval.repository.ts
export interface ServiceOrderApprovalRepository {
  approve(serviceOrder: ServiceOrder, movements: StockMovement[]): Promise<void>;
}
```

```typescript
// modules/service-order/application/use-cases/approve-quote.use-case.ts
async execute(input: ApproveQuoteInput): Promise<void> {
  const serviceOrder = await this.serviceOrders.findById(input.serviceOrderId);
  if (!serviceOrder) throw ServiceOrderError.notFound();

  serviceOrder.approve(); // a Entity valida o status e congela o valor
  await this.approvalRepository.approve(serviceOrder, serviceOrder.stockOutMovements());
}
```

```typescript
// modules/service-order/infrastructure/persistence/prisma-service-order-approval.repository.ts
async approve(serviceOrder: ServiceOrder, movements: StockMovement[]): Promise<void> {
  await this.prisma.$transaction(async (tx) => {
    // Update condicional: se outra requisição já aprovou/rejeitou, nada é atualizado.
    const { count } = await tx.serviceOrder.updateMany({
      where: { id: serviceOrder.idValue, status: 'AWAITING_APPROVAL' },
      data: ServiceOrderMapper.toApprovalObject(serviceOrder),
    });
    if (count === 0) throw ServiceOrderError.notAwaitingApproval();

    await tx.serviceOrderStatusHistory.create({
      data: ServiceOrderMapper.toHistoryObject(serviceOrder),
    });

    for (const movement of movements) {
      // Só baixa se houver saldo; senão aborta e desfaz tudo acima.
      const { count } = await tx.product.updateMany({
        where: { id: movement.productId, stockQuantity: { gte: movement.quantity } },
        data: { stockQuantity: { decrement: movement.quantity } },
      });
      if (count === 0) throw ProductError.insufficientStock();

      await tx.stockMovement.create({ data: StockMovementMapper.toObject(movement) });
    }
  });
}
```

A rejeição segue o mesmo formato, sem a parte de estoque (status + histórico).

## Mapper: `toEntity` / `toObject`

Os tipos gerados pelo Prisma são planos e públicos; as Entities de domain são encapsuladas e carregam Value Objects e comportamento. O Mapper é a fronteira de tradução entre os dois. Ele vive na infrastructure, ao lado do repository, e nunca dentro da Entity (isso levaria um import do Prisma para o domain).

```typescript
// modules/customer/infrastructure/persistence/customer.mapper.ts
export class CustomerMapper {
  static toEntity(record: PrismaCustomer): Customer {
    return Customer.restore({ id: record.id, document: record.document /* ... */ });
  }

  static toObject(entity: Customer): Prisma.CustomerUncheckedCreateInput {
    return { id: entity.idValue, document: entity.documentValue /* ... */ };
  }
}
```

### Quando cada um roda

| Operação | O que acontece |
|---|---|
| Criação | `Customer.create(input)` constrói a Entity (não há nada para ler) → `save()` chama `toObject` |
| Leitura (`findById`, `findAll`) | O Prisma retorna o(s) registro(s) → `toEntity` (por item, em listas) |
| Atualização | `findById` (`toEntity`, carrega o estado atual) → altera via método da Entity → `save` (`toObject`) |

A atualização é a única operação que passa pelos dois, porque lê antes de escrever. Isso se conecta com a regra de [Entity](entity.md): alteração e validação acontecem pela Entity, nunca direto na persistência.

Não releia do banco logo depois de um `create()` simples só pra reconstruir a Entity: ela já está em memória.

## Erros de unicidade do banco

A corrida entre o check de unicidade no use case e o insert pode estourar um `P2002` (unique violation) do Prisma. O repository captura esse erro e relança o `DomainError` correspondente (ex: `CustomerError.documentAlreadyInUse`), para que o código do Prisma não vaze para fora da infrastructure.
