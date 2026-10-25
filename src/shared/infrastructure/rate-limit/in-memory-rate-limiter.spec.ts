import { describe, expect, it } from 'bun:test';
import { InMemoryRateLimiter } from './in-memory-rate-limiter.js';

const makeLimiter = () => {
  let now = 0;
  const limiter = new InMemoryRateLimiter({
    max: 2,
    windowMs: 60_000,
    now: () => now,
  });
  return { limiter, advance: (ms: number) => (now += ms) };
};

describe('InMemoryRateLimiter', () => {
  it('libera até o máximo e barra a partir daí, com o tempo até a janela virar', () => {
    const { limiter, advance } = makeLimiter();
    expect(limiter.hit('k').allowed).toBe(true);
    advance(15_000);
    expect(limiter.hit('k').allowed).toBe(true);
    expect(limiter.hit('k')).toEqual({ allowed: false, retryAfterSeconds: 45 });
  });

  it('chaves são independentes', () => {
    const { limiter } = makeLimiter();
    limiter.hit('a');
    limiter.hit('a');
    expect(limiter.hit('a').allowed).toBe(false);
    expect(limiter.hit('b').allowed).toBe(true);
  });

  it('a janela vencida recomeça a contagem', () => {
    const { limiter, advance } = makeLimiter();
    limiter.hit('k');
    limiter.hit('k');
    limiter.hit('k');
    advance(60_000);
    expect(limiter.hit('k')).toEqual({ allowed: true, retryAfterSeconds: 60 });
  });

  it('apaga as chaves vencidas para não crescer sem limite', () => {
    const { limiter, advance } = makeLimiter();
    limiter.hit('velho');
    advance(60_000);
    limiter.hit('novo');
    expect(limiter.size).toBe(1);
  });
});
