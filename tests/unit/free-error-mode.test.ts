import { describe, expect, it } from 'vitest';
import { passageCharacters } from '../../src/domain/passage';
import { judgeProgressReport, type AcceptedProgress } from '../../src/domain/progress-report';
import { applyInput, countersOf, isPassageFinished, untypedState, type TypingInput, type TypingState } from '../../src/domain/typing-progress';
import { splitPassage } from '../../src/features/race/passage-segments';

const characters = passageCharacters('Le garçon');

const typed = (data: string): TypingInput => ({ inputType: 'insertText', data, isComposing: false });
const backspace: TypingInput = { inputType: 'deleteContentBackward', data: null, isComposing: false };

function typeFree(state: TypingState, inputs: TypingInput[]): TypingState {
  return inputs.reduce((current, input) => applyInput(current, characters, input, 'free'), state);
}

const lettersOf = (text: string) => Array.from(text, typed);

const start: AcceptedProgress = { lastSequence: 0, position: 0, correctCharacters: 0, keystrokes: 0, rejectedKeystrokes: 0 };

describe('free typing engine (#32)', () => {
  it('Backspace at the start of the text changes nothing', () => {
    expect(typeFree(untypedState, [backspace])).toBe(untypedState);
  });

  it('Backspace while a dead key composes is not a correction', () => {
    const state = typeFree(untypedState, lettersOf('Lx'));
    expect(applyInput(state, characters, { ...backspace, isComposing: true }, 'free')).toBe(state);
  });

  it('a wrong last character finishes the text with the mistake kept, and nothing more is taken', () => {
    const state = typeFree(untypedState, lettersOf('Le garçoX'));
    expect(isPassageFinished(state, characters)).toBe(true);
    expect(countersOf(state)).toEqual({ position: 9, correctCharacters: 8, keystrokes: 9, rejectedKeystrokes: 1 });
    expect(typeFree(state, lettersOf('n'))).toBe(state);
  });

  it('a kept mistake on a space shows as a middle dot among the typed runs', () => {
    const state = typeFree(untypedState, lettersOf('Lex'));
    expect(splitPassage(characters, state.position, state.isRejected, state.mistakes).typedRuns).toEqual([
      { text: 'Le', isMistake: false },
      { text: '·', isMistake: true },
    ]);
  });

  it('Backspace never lowers the keystrokes or the errors, so a fixed mistake still counts', () => {
    const state = typeFree(untypedState, [...lettersOf('Lx'), backspace, typed('e')]);
    expect(countersOf(state)).toEqual({ position: 2, correctCharacters: 2, keystrokes: 3, rejectedKeystrokes: 1 });
  });

  it('every report the free engine produces, Backspace included, is accepted by the server in free mode', () => {
    const inputs = [...lettersOf('Lx'), backspace, typed('e'), ...lettersOf(' gX'), backspace, backspace, ...lettersOf('garçon')];
    let state = untypedState;
    let previous = start;
    inputs.forEach((input, index) => {
      state = applyInput(state, characters, input, 'free');
      const report = { sequence: index + 1, ...countersOf(state) };
      expect(judgeProgressReport({ previous, report, passageLength: characters.length, elapsedSinceStartMs: 60_000, errorMode: 'free' }), `after input ${index}`).toBe('accepted');
      previous = { lastSequence: report.sequence, ...countersOf(state) };
    });
    expect(isPassageFinished(state, characters)).toBe(true);
  });

  it('a free-mode report is refused in a blocked race', () => {
    const report = { sequence: 1, position: 2, correctCharacters: 1, keystrokes: 2, rejectedKeystrokes: 1 };
    expect(judgeProgressReport({ previous: start, report, passageLength: characters.length, elapsedSinceStartMs: 60_000, errorMode: 'blocked' })).toBe('implausible');
  });

  it('a free-mode cursor ahead of the keystrokes is refused', () => {
    const report = { sequence: 1, position: 5, correctCharacters: 4, keystrokes: 4, rejectedKeystrokes: 0 };
    expect(judgeProgressReport({ previous: start, report, passageLength: characters.length, elapsedSinceStartMs: 60_000, errorMode: 'free' })).toBe('implausible');
  });
});
