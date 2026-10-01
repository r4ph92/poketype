import { describe, expect, it } from 'vitest';
import { passageCharacters, passageLength } from '../../src/domain/passage';
import { applyInput, isPassageFinished, progressPercent, untypedState, type TypingInput, type TypingState } from '../../src/domain/typing-progress';

const characters = passageCharacters('Le ç.');

function typed(data: string): TypingInput {
  return { inputType: 'insertText', data, isComposing: false };
}

function typeAll(state: TypingState, inputs: TypingInput[]): TypingState {
  return inputs.reduce((current, input) => applyInput(current, characters, input), state);
}

describe('keystroke accounting', () => {
  it('the expected character advances the position and counts one keystroke', () => {
    expect(applyInput(untypedState, characters, typed('L'))).toEqual({ position: 1, keystrokes: 1, rejectedKeystrokes: 0, isRejected: false });
  });

  it('a wrong character is a rejected keystroke that adds nothing and marks the expected character wrong', () => {
    expect(applyInput(untypedState, characters, typed('x'))).toEqual({ position: 0, keystrokes: 1, rejectedKeystrokes: 1, isRejected: true });
  });

  it('after a wrong character, only the expected character advances and clears the wrong mark', () => {
    const state = typeAll(untypedState, [typed('x'), typed('y'), typed('L')]);
    expect(state).toEqual({ position: 1, keystrokes: 3, rejectedKeystrokes: 2, isRejected: false });
  });

  it('compares case exactly', () => {
    expect(applyInput(untypedState, characters, typed('l')).position).toBe(0);
  });

  it('accepts a decomposed ç as the composed passage character', () => {
    const state = typeAll(untypedState, [typed('L'), typed('e'), typed(' '), typed('ç')]);
    expect(state.position).toBe(4);
  });

  it.each([
    ['a paste', { inputType: 'insertFromPaste', data: 'Le ç.', isComposing: false }],
    ['a drop', { inputType: 'insertFromDrop', data: 'L', isComposing: false }],
    ['a quoted paste', { inputType: 'insertFromPasteAsQuotation', data: 'L', isComposing: false }],
    ['an autocorrect replacement', { inputType: 'insertReplacementText', data: 'L', isComposing: false }],
    ['several characters at once', typed('Le')],
    ['an empty insertion', typed('')],
    ['a missing data field', { inputType: 'insertText', data: null, isComposing: false }],
    ['text typed during composition', { inputType: 'insertText', data: 'L', isComposing: true }],
    ['composition text', { inputType: 'insertCompositionText', data: 'L', isComposing: true }],
    ['a backspace', { inputType: 'deleteContentBackward', data: null, isComposing: false }],
    ['a line break', { inputType: 'insertLineBreak', data: null, isComposing: false }],
  ] satisfies [string, TypingInput][])('ignores %s: no keystroke and no progress', (_label, input) => {
    expect(applyInput(untypedState, characters, input)).toBe(untypedState);
  });

  it('a backspace after progress never moves the position back', () => {
    const state = typeAll(untypedState, [typed('L'), { inputType: 'deleteContentBackward', data: null, isComposing: false }]);
    expect(state.position).toBe(1);
  });

  it('a repeated key counts each delivered character against the passage', () => {
    const state = typeAll(untypedState, [typed('L'), typed('L'), typed('L')]);
    expect(state).toEqual({ position: 1, keystrokes: 3, rejectedKeystrokes: 2, isRejected: true });
  });

  it('finishes on the last character and ignores anything typed afterwards', () => {
    const finished = typeAll(untypedState, ['L', 'e', ' ', 'ç', '.'].map(typed));
    expect(isPassageFinished(finished, characters)).toBe(true);
    expect(applyInput(finished, characters, typed('x'))).toBe(finished);
  });
});

describe('progress percent', () => {
  it('floors to a whole percent and reaches 100 only at the end', () => {
    expect(progressPercent(0, 64)).toBe(0);
    expect(progressPercent(5, 64)).toBe(7);
    expect(progressPercent(63, 64)).toBe(98);
    expect(progressPercent(64, 64)).toBe(100);
  });

  it('never exceeds 100 and treats an empty passage as 0', () => {
    expect(progressPercent(70, 64)).toBe(100);
    expect(progressPercent(0, 0)).toBe(0);
  });
});

describe('passage length', () => {
  it('counts code points, so a character outside the basic plane counts once', () => {
    expect(passageLength('a\u{1F600}b')).toBe(3);
    expect(passageLength('récréation')).toBe(10);
  });
});
