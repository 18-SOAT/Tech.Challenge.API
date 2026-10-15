import 'dotenv/config';
import { defineConfig } from 'prisma/config';

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
    // `prisma db seed` roda este comando (o Prisma 7 não roda seed sozinho após migrate).
    seed: 'bun prisma/seed.ts',
  },
  datasource: {
    url: process.env.DATABASE_URL,
  },
});
