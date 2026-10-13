# Use Case

Um Use Case representa uma operação de negócio específica. É uma classe TypeScript comum, sem decorator e sem import de framework. Quem o instancia é o composition root (`<modulo>.container.ts`).

## Contrato

```typescript
// shared/application/use-case.interface.ts
export interface UseCase<Input, Output> {
  execute(input: Input): Promise<Output>;
}
```

Todo Use Case implementa essa interface e recebe seus colaboradores **pelo construtor, tipados pela interface do port**, nunca pela classe concreta:

```typescript
export class CreateCustomerUseCase implements UseCase<CreateCustomerInput, Customer> {
  constructor(private readonly customerRepository: CustomerRepository) {}

  async execute(input: CreateCustomerInput): Promise<Customer> {
    if (await this.customerRepository.findByDocument(input.document)) {
      throw CustomerError.documentAlreadyInUse(input.document);
    }
    const customer = Customer.create(input);
    await this.customerRepository.save(customer);
    return customer;
  }
}
```

Como não há DI por reflection, não existe `@Injectable()` nem `@Inject(TOKEN)`. A inversão de dependência continua a mesma: o use case depende da **interface** `CustomerRepository` (domínio), e o container decide que quem atende é o `PrismaCustomerRepository`.

Um Use Case sem input usa `void`:

```typescript
export class ListCustomersUseCase implements UseCase<void, Customer[]> {
  async execute(): Promise<Customer[]> { /* ... */ }
}
```

## Testando

Como o construtor só recebe interfaces, o teste instancia direto com fakes de `test/fakes/`, sem subir nada:

```typescript
const useCase = new CreateCustomerUseCase(new InMemoryCustomerRepository());
```

## Regras

- Um Use Case por operação de negócio.
- O Use Case orquestra: carrega via Repository, chama comportamento na Entity, persiste, chama outros colaboradores (Mailer, Cache) quando a operação exige.
- Regras de negócio e invariantes ficam na Entity (ver [Entity](entity.md)), nunca embutidas no Use Case.
- Um Use Case só recebe outro Use Case quando a operação tem uma dependência de negócio de fato (ver o anti-pattern em [Controller](controller.md)), nunca como orquestrador genérico.
- Nenhuma preocupação de transporte aqui: nunca monte um status HTTP, nunca conheça o envelope de resposta, nunca importe `elysia`. Retorne dado de domínio ou lance um `DomainError` do catalog do módulo (ver [Tratamento de erros](error-handling.md)).
