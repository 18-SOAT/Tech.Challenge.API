import { status, type TSchema, t } from 'elysia';

// Envelope padrão de toda resposta: { data, message, status }.
// Ver docs/code/patterns/error-handling.md#envelope-de-sucesso-ok.

// Sucesso: o handler devolve `ok(dto)` ou `ok(dto, 201)`. O `status()` do Elysia
// coloca o código HTTP no tipo de retorno — é por ele que a entrada certa de
// `response` valida e documenta a resposta.
export const ok = <T, const Code extends number = 200>(
  data: T,
  code: Code = 200 as Code,
) => status(code, { data, message: null, status: code });

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
