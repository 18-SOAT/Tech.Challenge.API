import { readFileSync } from 'node:fs';
import { join } from 'node:path';

// A matriz de autorização mora só em docs/testing/black-box.md (seção 1): este
// parser a transforma em casos de teste. Mudou uma permissão no código sem mudar a
// tabela → o caso correspondente falha.
export const MATRIX_DOC = join(
  import.meta.dir,
  '../../../docs/testing/black-box.md',
);

export const PROFILES = [
  'ANONYMOUS',
  'CUSTOMER',
  'CUSTOMER_OWNER',
  'MECHANIC',
  'MECHANIC_ASSIGNEE',
  'ADMIN',
] as const;
export type Profile = (typeof PROFILES)[number];

const HEADER =
  '| Rota | Anônimo | CUSTOMER | CUSTOMER dono | MECHANIC | MECHANIC responsável | ADMIN |';
const ROW = /^\| `([A-Z]+) (\/[^`]*)` \|(.+)\|$/;

export interface MatrixCase {
  route: string; // "MÉTODO /caminho", a chave usada nos testes
  method: string;
  path: string;
  profile: Profile;
  expected: number;
}

export function readAuthorizationMatrix(
  markdown = readFileSync(MATRIX_DOC, 'utf8'),
): MatrixCase[] {
  const lines = markdown.split('\n');
  const start = lines.findIndex((line) => line.trim() === HEADER);
  if (start === -1) {
    throw new Error(`Cabeçalho da matriz não encontrado em ${MATRIX_DOC}.`);
  }

  const cases: MatrixCase[] = [];
  // Pula o cabeçalho e a linha separadora; a tabela acaba na primeira linha vazia.
  for (const line of lines.slice(start + 2)) {
    if (!line.trim()) break;
    const match = line.trim().match(ROW);
    if (!match) throw new Error(`Linha da matriz fora do formato: ${line}`);
    const [, method, path, rest] = match as unknown as [
      string,
      string,
      string,
      string,
    ];
    const cells = rest.split('|').map((cell) => cell.trim());
    if (cells.length !== PROFILES.length) {
      throw new Error(`Linha da matriz com ${cells.length} colunas: ${line}`);
    }
    cells.forEach((cell, i) => {
      if (cell === '—') return;
      if (!/^\d{3}$/.test(cell)) {
        throw new Error(`Célula "${cell}" inválida na linha: ${line}`);
      }
      cases.push({
        route: `${method} ${path}`,
        method,
        path,
        profile: PROFILES[i] as Profile,
        expected: Number(cell),
      });
    });
  }
  return cases;
}

export const routesOf = (cases: MatrixCase[]) => [
  ...new Set(cases.map(({ route }) => route)),
];
