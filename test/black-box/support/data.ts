// Dados únicos por chamada: os cenários criam recursos novos em vez de depender
// do que outro cenário deixou no banco. Os geradores produzem valores válidos para
// os value objects da API (CPF com dígitos verificadores, placa no padrão antigo).
let sequence = 0;

export const nextId = () => ++sequence;

function cpfCheckDigit(digits: number[]): number {
  const factor = digits.length + 1;
  const sum = digits.reduce(
    (total, digit, i) => total + digit * (factor - i),
    0,
  );
  const rest = (sum * 10) % 11;
  return rest === 10 ? 0 : rest;
}

// 9 dígitos a partir do contador (prefixo 1 evita "todos iguais") + 2 verificadores.
export function uniqueCpf(): string {
  const base = `1${String(nextId()).padStart(8, '0')}`.split('').map(Number);
  const first = cpfCheckDigit(base);
  const second = cpfCheckDigit([...base, first]);
  return [...base, first, second].join('');
}

// Padrão antigo (AAA9999): 3 letras fixas + 4 dígitos do contador.
export function uniquePlate(): string {
  return `TST${String(nextId() % 10000).padStart(4, '0')}`;
}

export const uniqueEmail = (prefix: string) =>
  `${prefix}${nextId()}@teste.com.br`;

export const uniqueSku = () => `SKU-${nextId()}`;

export const uniqueName = (prefix: string) => `${prefix} ${nextId()}`;

export const PASSWORD = 'senha-forte-123'; // gitleaks:allow (senha fictícia)
export const PHONE = '11987654321';
