import { describe, expect, it, vi } from 'vitest';
import { CompositionGuard } from '../../src/features/race/composition-guard';

function guardWithQueue() {
  const queuedTasks: (() => void)[] = [];
  const guard = new CompositionGuard((task) => queuedTasks.push(task));
  const runQueuedTasks = () => queuedTasks.splice(0).forEach((task) => task());
  return { guard, runQueuedTasks };
}

describe('composition guard', () => {
  it('is not composing before any composition', () => {
    expect(guardWithQueue().guard.isComposing).toBe(false);
  });

  it('stays composing after compositionend until the next task, so a Safari commit right after it is not counted again', () => {
    const { guard, runQueuedTasks } = guardWithQueue();
    const onClosed = vi.fn();

    guard.start();
    guard.end(onClosed);

    expect(guard.isComposing).toBe(true);
    expect(onClosed).not.toHaveBeenCalled();
    runQueuedTasks();
    expect(guard.isComposing).toBe(false);
    expect(onClosed).toHaveBeenCalledOnce();
  });

  it('a composition that starts before the previous one closes stays open', () => {
    const { guard, runQueuedTasks } = guardWithQueue();
    const onFirstClosed = vi.fn();

    guard.start();
    guard.end(onFirstClosed);
    guard.start();
    runQueuedTasks();

    expect(guard.isComposing).toBe(true);
    expect(onFirstClosed).not.toHaveBeenCalled();
  });

  it('two quick compositions close once, after the second one ends', () => {
    const { guard, runQueuedTasks } = guardWithQueue();
    const onClosed = vi.fn();

    guard.start();
    guard.end(onClosed);
    guard.start();
    guard.end(onClosed);
    runQueuedTasks();

    expect(guard.isComposing).toBe(false);
    expect(onClosed).toHaveBeenCalledOnce();
  });

  it('a compositionend without a start still closes on the next task', () => {
    const { guard, runQueuedTasks } = guardWithQueue();
    const onClosed = vi.fn();

    guard.end(onClosed);
    runQueuedTasks();

    expect(guard.isComposing).toBe(false);
    expect(onClosed).toHaveBeenCalledOnce();
  });
});
