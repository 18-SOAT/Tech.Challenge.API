export interface RateLimitResult {
  allowed: boolean;
  // Segundos até a janela da chave virar (vai no header Retry-After do 429).
  retryAfterSeconds: number;
}

// Conta uma tentativa para a chave (ex: "login:ip:203.0.113.7") e diz se ela ainda
// cabe no limite. Port: o adapter em memória serve a um container só; com várias
// instâncias da API, o contador precisaria ser compartilhado (ex: Redis).
export interface RateLimiter {
  hit(key: string): RateLimitResult;
}
