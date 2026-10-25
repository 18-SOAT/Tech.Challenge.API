import { SharedError } from '../errors/shared.error.js';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Provedores em que aliases chegam na mesma caixa de entrada. Só eles têm o
// `+tag` removido: num domínio corporativo, `joao+vendas@` pode ser outra caixa.
// Se esta lista mudar, o backfill da migration `email_canonical` é a referência
// histórica — e-mails já gravados não são recalculados sozinhos.
const DOMAIN_ALIASES: Record<string, string> = {
  'googlemail.com': 'gmail.com',
};
const DOTS_IGNORED = new Set(['gmail.com']);
const PLUS_ADDRESSING = new Set([
  'gmail.com',
  'outlook.com',
  'hotmail.com',
  'live.com',
  'msn.com',
  'icloud.com',
  'me.com',
  'mac.com',
  'proton.me',
  'protonmail.com',
  'pm.me',
  'fastmail.com',
]);

export class Email {
  private constructor(readonly value: string) {}

  static create(raw: string): Email {
    const normalized = raw.trim().toLowerCase();
    if (!EMAIL_PATTERN.test(normalized)) {
      throw SharedError.invalidEmail();
    }
    return new Email(normalized);
  }

  // E-mail canônico: a forma usada só para unicidade e busca do login, para que
  // aliases da mesma caixa não virem contas diferentes. O envio usa sempre o `value`.
  get canonical(): string {
    const at = this.value.lastIndexOf('@');
    let local = this.value.slice(0, at);
    const rawDomain = this.value.slice(at + 1);
    const domain = DOMAIN_ALIASES[rawDomain] ?? rawDomain;

    if (PLUS_ADDRESSING.has(domain)) local = local.split('+')[0] ?? local;
    if (DOTS_IGNORED.has(domain)) local = local.replaceAll('.', '');
    return `${local}@${domain}`;
  }
}
