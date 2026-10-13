// Corpo de toda resposta da API: { data, message, status }.
export interface EnvelopeBody<T = any> {
  data: T;
  message: string | null;
  status: number;
}

export const readEnvelope = <T = any>(
  response: Response,
): Promise<EnvelopeBody<T>> => response.json() as Promise<EnvelopeBody<T>>;

export const jsonRequest = (
  path: string,
  init: { method?: string; body?: unknown; token?: string } = {},
): Request =>
  new Request(`http://localhost${path}`, {
    method: init.method ?? (init.body === undefined ? 'GET' : 'POST'),
    headers: {
      ...(init.body === undefined
        ? {}
        : { 'content-type': 'application/json' }),
      ...(init.token ? { authorization: `Bearer ${init.token}` } : {}),
    },
    body: init.body === undefined ? undefined : JSON.stringify(init.body),
  });
