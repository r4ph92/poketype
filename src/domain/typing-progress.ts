export type TypingState = { position: number; keystrokes: number; rejectedKeystrokes: number; isRejected: boolean };

export type TypingInput = { inputType: string; data: string | null; isComposing: boolean };

// Not a DOM input type: the text a dead key, an Option combination or an input method commits when its composition ends.
export const compositionCommit = 'compositionEnd';

const countedInputTypes: readonly string[] = ['insertText', compositionCommit];

const leadingAccentMarks = /^[\p{Sk}\p{Mn}]+/u;

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

// Paste, drop, autocorrect replacements, deletions and text still being composed are never keystrokes; one committed character is.
function singleTypedCharacter({ inputType, data, isComposing }: TypingInput): string | null {
  if (!countedInputTypes.includes(inputType) || isComposing) return null;
  return committedCharacter(data);
}

// A dead key that cannot combine with the next letter delivers its accent first, so only the letter is judged and a lone accent is no keystroke.
function committedCharacter(data: string | null): string | null {
  if (data === null) return null;
  const characters = Array.from(data.normalize('NFC').replace(leadingAccentMarks, ''));
  return characters.length === 1 ? characters[0]! : null;
}
