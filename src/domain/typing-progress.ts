export type TypingState = { position: number; keystrokes: number; rejectedKeystrokes: number; isRejected: boolean };

export type TypingInput = { inputType: string; data: string | null; isComposing: boolean };

export type KeystrokeOutcome = 'correct' | 'rejected' | 'ignored';

export type TypingCounters = Omit<TypingState, 'isRejected'>;

export const untypedState: TypingState = { position: 0, keystrokes: 0, rejectedKeystrokes: 0, isRejected: false };

export function startTypingFrom(counters: TypingCounters): TypingState {
  return { ...counters, isRejected: false };
}

export function isPassageFinished(state: TypingState, characters: readonly string[]): boolean {
  return state.position >= characters.length;
}

// Blocked mode (JEU-2 baseline): a wrong character is counted but never added, so the player advances only with the expected one.
export function classifyInput(characters: readonly string[], position: number, input: TypingInput): KeystrokeOutcome {
  const typed = singleTypedCharacter(input);
  if (typed === null || position >= characters.length) return 'ignored';
  return typed === characters[position] ? 'correct' : 'rejected';
}

export function applyInput(state: TypingState, characters: readonly string[], input: TypingInput): TypingState {
  const outcome = classifyInput(characters, state.position, input);
  if (outcome === 'ignored') return state;
  const keystrokes = state.keystrokes + 1;
  if (outcome === 'rejected') return { ...state, keystrokes, rejectedKeystrokes: state.rejectedKeystrokes + 1, isRejected: true };
  return { ...state, keystrokes, position: state.position + 1, isRejected: false };
}

export function progressPercent(position: number, length: number): number {
  if (length <= 0) return 0;
  return Math.floor((Math.min(position, length) * 100) / length);
}

// Paste, drop, autocorrect replacements, deletions and composition are never keystrokes; only one plain character is.
function singleTypedCharacter({ inputType, data, isComposing }: TypingInput): string | null {
  if (inputType !== 'insertText' || isComposing || data === null) return null;
  const characters = Array.from(data.normalize('NFC'));
  return characters.length === 1 ? characters[0]! : null;
}
