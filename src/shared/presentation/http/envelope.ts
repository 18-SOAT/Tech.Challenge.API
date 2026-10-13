import { status, type TSchema, t } from 'elysia';

// Envelope padrão de toda resposta: { data, message, status }.
// Ver docs/code/patterns/error-handling.md#envelope-de-sucesso-ok.

// Sucesso: o handler devolve `ok(dto)` ou `ok(dto, 201)`. O `status()` do Elysia
// coloca o código HTTP no tipo de retorno — é por ele que a entrada certa de
// `response` valida e documenta a resposta.
// Overloads: sem o código, o tipo fica no literal 200 (e não em `number`), senão o
// Elysia não casa o retorno com a entrada `200` do `response`.
export function ok<T>(
  data: T,
): ReturnType<typeof status<200, { data: T; message: null; status: 200 }>>;
export function ok<T, const Code extends number>(
  data: T,
  code: Code,
): ReturnType<typeof status<Code, { data: T; message: null; status: Code }>>;
// Implementação: a tipagem pública vem das overloads acima.
export function ok(data: unknown, code = 200): any {
  return status(code, { data, message: null, status: code });
}

export const Envelope = <T extends TSchema>(data: T) =>
  t.Object({
    data,
    message: t.Null(),
    status: t.Number({ examples: [200] }),
  });

// Um único schema de erro pra API inteira: só o status e a mensagem variam.
export const ApiError = t.Object(
  {
    data: t.Null(),
    message: t.String({ examples: ['Credenciais inválidas.'] }),
    status: t.Number({ examples: [401] }),
  },
  { title: 'ApiError' },
);

export type ApiErrorBody = typeof ApiError.static;
