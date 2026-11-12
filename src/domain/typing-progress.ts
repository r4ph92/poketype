import type { ErrorMode } from './text-settings';

// position is the cursor. mistakes are the indices before the cursor whose typed character is wrong: always empty in blocked mode,
// where a wrong character never enters; in free mode they show in red until Backspace removes them. isRejected marks the last blocked keystroke.
export type TypingState = { position: number; keystrokes: number; rejectedKeystrokes: number; mistakes: readonly number[]; isRejected: boolean };

export type TypingInput = { inputType: string; data: string | null; isComposing: boolean };

// Not a DOM input type: the text a dead key, an Option combination or an input method commits when its composition ends.
export const compositionCommit = 'compositionEnd';

const countedInputTypes: readonly string[] = ['insertText', compositionCommit];

const backspaceInputType = 'deleteContentBackward';

const leadingAccentMarks = /^[\p{Sk}\p{Mn}]+/u;

export type KeystrokeOutcome = 'correct' | 'rejected' | 'ignored';

// What the reporter sends and the server stores: the cursor, the characters correct now, and every keystroke with the wrong ones among them.
export type TypingCounters = { position: number; correctCharacters: number; keystrokes: number; rejectedKeystrokes: number };

export const untypedState: TypingState = { position: 0, keystrokes: 0, rejectedKeystrokes: 0, mistakes: [], isRejected: false };

export function countersOf({ position, keystrokes, rejectedKeystrokes, mistakes }: TypingState): TypingCounters {
  return { position, correctCharacters: position - mistakes.length, keystrokes, rejectedKeystrokes };
}

// A reload keeps the counters, not which characters were wrong: in free mode the kept mistakes are taken to be the last ones before the cursor,
// so the count stays right and Backspace still corrects them.
export function startTypingFrom({ position, correctCharacters, keystrokes, rejectedKeystrokes }: TypingCounters): TypingState {
  const mistakeCount = Math.max(0, position - correctCharacters);
  const mistakes = Array.from({ length: mistakeCount }, (_, index) => position - mistakeCount + index);
  return { position, keystrokes, rejectedKeystrokes, mistakes, isRejected: false };
}

export function isPassageFinished(state: TypingState, characters: readonly string[]): boolean {
  return state.position >= characters.length;
}

// Blocked mode (JEU-2 baseline): a wrong character is counted but never added, so the player advances only with the expected one.
// Free mode: a wrong character is counted, kept and marked, and the cursor moves on; Backspace moves back one character and is never a keystroke.
export function classifyInput(characters: readonly string[], position: number, input: TypingInput): KeystrokeOutcome {
  const typed = singleTypedCharacter(input);
  if (typed === null || position >= characters.length) return 'ignored';
  return typed === characters[position] ? 'correct' : 'rejected';
}

export function applyInput(state: TypingState, characters: readonly string[], input: TypingInput, errorMode: ErrorMode = 'blocked'): TypingState {
  if (errorMode === 'free' && isBackspace(input)) return moveBack(state);
  const outcome = classifyInput(characters, state.position, input);
  if (outcome === 'ignored') return state;
  const keystrokes = state.keystrokes + 1;
  if (outcome === 'correct') return { ...state, keystrokes, position: state.position + 1, isRejected: false };
  const rejectedKeystrokes = state.rejectedKeystrokes + 1;
  if (errorMode === 'free') return { ...state, keystrokes, rejectedKeystrokes, position: state.position + 1, mistakes: [...state.mistakes, state.position], isRejected: false };
  return { ...state, keystrokes, rejectedKeystrokes, isRejected: true };
}

function isBackspace({ inputType, isComposing }: TypingInput): boolean {
  return inputType === backspaceInputType && !isComposing;
}

function moveBack(state: TypingState): TypingState {
  if (state.position === 0) return state;
  const position = state.position - 1;
  return { ...state, position, mistakes: state.mistakes.filter((index) => index < position), isRejected: false };
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
