export type ConcurrencyLimits = { maxRunning: number; maxWaiting: number };

export class ConcurrencyGateFullError extends Error {
  constructor() {
    super('Too many operations are already running or waiting.');
    this.name = 'ConcurrencyGateFullError';
  }
}

export class ConcurrencyGate {
  private running = 0;
  private readonly waiting: (() => void)[] = [];

  constructor(private readonly limits: ConcurrencyLimits) {}

  async run<T>(work: () => Promise<T>): Promise<T> {
    await this.acquire();
    try {
      return await work();
    } finally {
      this.release();
    }
  }

  private async acquire(): Promise<void> {
    if (this.running < this.limits.maxRunning) {
      this.running += 1;
      return;
    }
    if (this.waiting.length >= this.limits.maxWaiting) throw new ConcurrencyGateFullError();
    await new Promise<void>((resolve) => this.waiting.push(resolve));
  }

  private release(): void {
    const next = this.waiting.shift();
    if (next) {
      next();
      return;
    }
    this.running -= 1;
  }
}
