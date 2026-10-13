export interface Env {
  DATABASE_URL: string;
  JWT_SECRET: string;
  JWT_EXPIRES_IN: string;
  PORT: number;
}

// Lido uma vez no boot (o Bun já carrega o .env sozinho). Falha alto: subir sem
// JWT_SECRET assinaria tokens com um segredo vazio.
export function readEnv(
  source: Record<string, string | undefined> = process.env,
): Env {
  const required = (name: 'DATABASE_URL' | 'JWT_SECRET'): string => {
    const value = source[name];
    if (!value) {
      throw new Error(
        `${name} não definido. Configure no .env (ver .env.example).`,
      );
    }
    return value;
  };

  return {
    DATABASE_URL: required('DATABASE_URL'),
    JWT_SECRET: required('JWT_SECRET'),
    JWT_EXPIRES_IN: source.JWT_EXPIRES_IN || '1h',
    PORT: Number(source.PORT) || 3000,
  };
}
