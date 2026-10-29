// Leitura dos e-mails capturados pelo Mailpit (API REST em /api/v1). O envio da
// API é fire-and-forget depois do commit: o e-mail chega um pouco depois da
// resposta HTTP, por isso a leitura é por polling com timeout.
const MAILPIT_URL = process.env.MAILPIT_URL ?? 'http://localhost:8025';
const POLL_INTERVAL_MS = 100;
const TIMEOUT_MS = 5000;
const NO_EMAIL_WAIT_MS = 500;

export interface Email {
  subject: string;
  to: string[];
  text: string;
}

interface MessageSummary {
  ID: string;
  Subject: string;
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function search(to: string): Promise<MessageSummary[]> {
  const query = encodeURIComponent(`to:"${to}"`);
  const response = await fetch(`${MAILPIT_URL}/api/v1/search?query=${query}`);
  if (!response.ok) {
    throw new Error(`Mailpit respondeu ${response.status} na busca.`);
  }
  const { messages } = (await response.json()) as {
    messages: MessageSummary[];
  };
  return messages;
}

async function read(id: string): Promise<Email> {
  const response = await fetch(`${MAILPIT_URL}/api/v1/message/${id}`);
  const message = (await response.json()) as {
    Subject: string;
    To: { Address: string }[];
    Text: string;
  };
  return {
    subject: message.Subject,
    to: message.To.map(({ Address }) => Address),
    text: message.Text,
  };
}

export async function clearInbox(): Promise<void> {
  const response = await fetch(`${MAILPIT_URL}/api/v1/messages`, {
    method: 'DELETE',
  });
  if (!response.ok) {
    throw new Error(
      `Mailpit indisponível em ${MAILPIT_URL} (rode \`docker compose up -d mailpit\`).`,
    );
  }
}

export async function waitForEmail(
  to: string,
  { subject }: { subject?: string } = {},
): Promise<Email> {
  const deadline = Date.now() + TIMEOUT_MS;
  while (Date.now() < deadline) {
    const found = (await search(to)).find(
      (message) => !subject || message.Subject.includes(subject),
    );
    if (found) return read(found.ID);
    await sleep(POLL_INTERVAL_MS);
  }
  throw new Error(
    `Nenhum e-mail para ${to}${subject ? ` com assunto "${subject}"` : ''} em ${TIMEOUT_MS}ms.`,
  );
}

// "Nenhum e-mail" só se prova esperando: dá ao envio assíncrono a chance de chegar.
export async function expectNoEmail(to: string): Promise<void> {
  await sleep(NO_EMAIL_WAIT_MS);
  const messages = await search(to);
  if (messages.length > 0) {
    throw new Error(
      `Esperava nenhum e-mail para ${to}, chegaram ${messages.length}.`,
    );
  }
}

// Para quando o cenário não sabe a quem o e-mail iria (ex: documento inexistente):
// a caixa inteira tem de continuar vazia — o resetWorld a esvazia antes do teste.
export async function expectEmptyInbox(): Promise<void> {
  await sleep(NO_EMAIL_WAIT_MS);
  const response = await fetch(`${MAILPIT_URL}/api/v1/messages`);
  const { total } = (await response.json()) as { total: number };
  if (total > 0) {
    throw new Error(`Esperava a caixa vazia, chegaram ${total} e-mails.`);
  }
}

// Linha do corpo montada por AuthMailer.linkLines.
export function extractAccessToken(email: Email): string {
  const match = email.text.match(
    /Token \(para POST \/auth\/set-password\): (\S+)/,
  );
  if (!match?.[1]) {
    throw new Error(`E-mail "${email.subject}" sem token de acesso.`);
  }
  return match[1];
}
