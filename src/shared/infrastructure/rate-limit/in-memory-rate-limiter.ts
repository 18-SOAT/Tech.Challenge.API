import type { RateLimiter, RateLimitResult } from './rate-limiter.port.js';

interface Window {
  count: number;
  resetAt: number;
}

// Janela fixa: um contador por chave, zerado quando a janela vence. Mais simples
// que a janela deslizante (que guarda um instante por requisição); a imprecisão na
// virada da janela (até 2× o limite em sequência) não muda nada contra força bruta.
// `now` é injetável para o teste controlar o tempo sem sleep.
export class InMemoryRateLimiter implements RateLimiter {
  private readonly windows = new Map<string, Window>();
  private lastSweep: number;

  constructor(
    private readonly options: {
      max: number;
      windowMs: number;
      now?: () => number;
    },
  ) {
    this.lastSweep = this.now();
  }

  hit(key: string): RateLimitResult {
    const now = this.now();
    this.sweep(now);
    let window = this.windows.get(key);
    if (!window || window.resetAt <= now) {
      window = { count: 0, resetAt: now + this.options.windowMs };
      this.windows.set(key, window);
    }
    window.count++;
    return {
      allowed: window.count <= this.options.max,
      retryAfterSeconds: Math.ceil((window.resetAt - now) / 1000),
    };
  }

  // Uma vez por janela, apaga as chaves vencidas: sem isso, cada IP que passou pela
  // API ficaria na memória para sempre.
  private sweep(now: number): void {
    if (now - this.lastSweep < this.options.windowMs) return;
    this.lastSweep = now;
    for (const [key, window] of this.windows) {
      if (window.resetAt <= now) this.windows.delete(key);
    }
  }

  private now(): number {
    return (this.options.now ?? Date.now)();
  }

  get size(): number {
    return this.windows.size;
  }
}
