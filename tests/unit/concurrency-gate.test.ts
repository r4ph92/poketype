import { describe, expect, it } from 'vitest';
import { ConcurrencyGate, ConcurrencyGateFullError } from '../../src/server/accounts/concurrency-gate';

type Deferred = { promise: Promise<void>; resolve: () => void };

function deferred(): Deferred {
  let resolve = () => {};
  const promise = new Promise<void>((done) => (resolve = done));
  return { promise, resolve };
}

describe('ConcurrencyGate', () => {
  it('runs up to the limit at once and queues the rest in order', async () => {
    const gate = new ConcurrencyGate({ maxRunning: 2, maxWaiting: 8 });
    const blockers = [deferred(), deferred(), deferred()];
    const started: number[] = [];
    const runs = blockers.map((blocker, index) =>
      gate.run(async () => {
        started.push(index);
        await blocker.promise;
        return index;
      }),
    );
    await Promise.resolve();
    expect(started).toEqual([0, 1]);

    blockers[0]!.resolve();
    await expect(runs[0]).resolves.toBe(0);
    await Promise.resolve();
    expect(started).toEqual([0, 1, 2]);

    blockers[1]!.resolve();
    blockers[2]!.resolve();
    await expect(Promise.all(runs)).resolves.toEqual([0, 1, 2]);
  });

  it('refuses work once the running and waiting slots are full', async () => {
    const gate = new ConcurrencyGate({ maxRunning: 1, maxWaiting: 1 });
    const blocker = deferred();
    const running = gate.run(() => blocker.promise);
    const waiting = gate.run(async () => 'waited');
    await expect(gate.run(async () => 'refused')).rejects.toBeInstanceOf(ConcurrencyGateFullError);
    blocker.resolve();
    await running;
    await expect(waiting).resolves.toBe('waited');
  });

  it('frees its slot when the work fails', async () => {
    const gate = new ConcurrencyGate({ maxRunning: 1, maxWaiting: 0 });
    await expect(gate.run(() => Promise.reject(new Error('boom')))).rejects.toThrow('boom');
    await expect(gate.run(async () => 'after')).resolves.toBe('after');
  });
});
