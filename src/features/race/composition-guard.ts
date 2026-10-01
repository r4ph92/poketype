export type ScheduleTask = (task: () => void) => void;

// Safari inserts the committed text after compositionend, so a composition stays open until the next macrotask:
// every input event in between belongs to it, and only the compositionend commit counts.
export class CompositionGuard {
  private isOpen = false;
  private startedCompositions = 0;

  constructor(private readonly scheduleNextTask: ScheduleTask) {}

  get isComposing(): boolean {
    return this.isOpen;
  }

  start(): void {
    this.isOpen = true;
    this.startedCompositions += 1;
  }

  end(onClosed: () => void): void {
    const endingComposition = this.startedCompositions;
    this.scheduleNextTask(() => this.close(endingComposition, onClosed));
  }

  private close(endingComposition: number, onClosed: () => void): void {
    if (endingComposition !== this.startedCompositions) return;
    this.isOpen = false;
    onClosed();
  }
}
