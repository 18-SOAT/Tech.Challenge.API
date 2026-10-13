# Database (Prisma)

## Cliente Prisma: uma instância, criada no container compartilhado

```typescript
// shared/infrastructure/prisma/client.ts
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../../../generated/prisma/client.js';

export const createPrismaClient = (connectionString: string) =>
  new PrismaClient({ adapter: new PrismaPg({ connectionString }) });
```

```typescript
// shared/shared.container.ts
const prisma = createPrismaClient(env.DATABASE_URL);
```

Uma única instância para a aplicação inteira (um pool de conexões só), criada no `shared.container.ts` e repassada aos repositories pelo construtor. O cliente não sabe nada sobre `Customer`, `Vehicle` ou qualquer conceito de negócio: ele só gerencia a conexão.

### Conexão lazy (sem `$connect` no boot)

O Prisma conecta sozinho na primeira query, então não existe `$connect()` no startup.

- **Ganho:** a aplicação sobe sem banco. É isso que deixa o e2e (que monta a app com fakes) e o CI rodarem sem Postgres.
- **Custo:** perde o fail-fast. Um `DATABASE_URL` errado não derruba o boot, só aparece na primeira query. Hoje o `GET /health` só confirma que o processo está de pé. Para cobrir isso, ele deve passar a fazer um `SELECT 1`.

### Desligamento

```typescript
// server.ts
createApp({ ... }).onStop(() => shared.prisma.$disconnect()).listen(env.PORT);
```

Fecha o pool de conexões quando o servidor para, sem deixar conexões penduradas no Postgres a cada restart.

## Código gerado

O `prisma generate` (roda no `postinstall`) escreve o client em `src/generated/prisma/`, que está no `.gitignore`. O schema é `prisma/schema.prisma` e a configuração (migrations, datasource) é `prisma.config.ts`.

## Repositories concretos ficam em cada módulo de negócio, não aqui

`PrismaCustomerRepository`, `PrismaVehicleRepository` etc. são específicos do seu aggregate (conhecem o formato da tabela e as queries que aquele aggregate precisa). Eles ficam em `modules/xxx/infrastructure/persistence/` e recebem o `PrismaClient` no construtor. Ver [Repository](../patterns/repository.md) para interface/implementação/mapper.

Não coloque nada específico de negócio em `shared/infrastructure/prisma/`.
