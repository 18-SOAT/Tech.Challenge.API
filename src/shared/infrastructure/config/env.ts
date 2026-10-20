export interface Env {
  DATABASE_URL: string;
  JWT_SECRET: string;
  JWT_EXPIRES_IN: string;
  PORT: number;
  // Link de acesso (primeiro acesso / redefinição de senha) enviado por e-mail.
  ACCESS_LINK_EXPIRES_IN: string;
  APP_URL: string; // base pública usada para montar o link no e-mail
  SMTP_HOST: string;
  SMTP_PORT: number;
  SMTP_USER?: string; // vazio = SMTP sem login (Mailpit)
  SMTP_PASS?: string;
  MAIL_FROM: string;
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
    ACCESS_LINK_EXPIRES_IN: source.ACCESS_LINK_EXPIRES_IN || '15m',
    APP_URL: source.APP_URL || 'http://localhost:3000',
    SMTP_HOST: source.SMTP_HOST || 'localhost',
    SMTP_PORT: Number(source.SMTP_PORT) || 1025,
    SMTP_USER: source.SMTP_USER || undefined,
    // Senha de app do Gmail vem exibida em grupos ("abcd efgh ..."): sem espaços.
    SMTP_PASS: source.SMTP_PASS?.replace(/\s/g, '') || undefined,
    MAIL_FROM: source.MAIL_FROM || 'Oficina <nao-responda@oficina.local>',
  };
}
