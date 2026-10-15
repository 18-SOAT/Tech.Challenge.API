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
- **Custo:** perde o fail-fast. Um `DATABASE_URL` errado não derruba o boot, só aparece na primeira query. Para cobrir isso, o `GET /health` faz um `SELECT 1` (com timeout de 2s) através do port `DatabaseHealthCheck` (`shared/infrastructure/health/`): responde `200` com `database: 'up'` ou `503` com `database: 'down'`. No e2e o port é o `FakeDatabaseHealthCheck`, então o teste continua sem banco.

### Desligamento

```typescript
// server.ts
createApp({ ... }).onStop(() => shared.prisma.$disconnect()).listen(env.PORT);
```

Fecha o pool de conexões quando o servidor para, sem deixar conexões penduradas no Postgres a cada restart.

## Migrations e seed

O `schema.prisma` descreve como o banco **deve ficar**. A migration é o SQL versionado que **leva o banco até lá** (`prisma/migrations/<timestamp>_<nome>/migration.sql`), o que torna a evolução do banco reproduzível em qualquer máquina.

- `bun run prisma:migrate --name <descricao>` (`migrate dev`): só em desenvolvimento. Compara o schema com o banco, **gera** o SQL e aplica. Commite a pasta gerada junto com a mudança no schema.
- `bun run prisma:deploy` (`migrate deploy`): **só aplica** as migrations que já existem, nunca gera. É o que roda no container `migrate` do compose.
- `bun run db:seed` (`prisma/seed.ts`, configurado em `prisma.config.ts`): cria o ADMIN de demonstração. É idempotente (não faz nada se o e-mail já existe) e reaproveita os VOs `Email`/`Password`, o `BcryptPasswordHasher` e o `IdGenerator`. O Prisma 7 não roda o seed sozinho depois do `migrate`; ele é chamado explicitamente.

No `docker-compose.yml`, migração e seed rodam num serviço próprio (`migrate`, executa e encerra) antes da `api`, do mesmo jeito que um Job/initContainer no Kubernetes. Assim a imagem da API não carrega o CLI do Prisma, e réplicas da API nunca disputam a mesma migração.

## Código gerado

O `prisma generate` (roda no `postinstall`) escreve o client em `src/generated/prisma/`, que está no `.gitignore`. O schema é `prisma/schema.prisma` e a configuração (migrations, datasource) é `prisma.config.ts`.

## Repositories concretos ficam em cada módulo de negócio, não aqui

`PrismaCustomerRepository`, `PrismaVehicleRepository` etc. são específicos do seu aggregate (conhecem o formato da tabela e as queries que aquele aggregate precisa). Eles ficam em `modules/xxx/infrastructure/persistence/` e recebem o `PrismaClient` no construtor. Ver [Repository](../patterns/repository.md) para interface/implementação/mapper.

Não coloque nada específico de negócio em `shared/infrastructure/prisma/`.
