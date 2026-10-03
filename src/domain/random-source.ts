// A number from 0 (included) to 1 (excluded): the server passes a secure source, tests a fixed sequence.
export type RandomSource = () => number;

export function pickOne<Choice>(choices: readonly Choice[], random: RandomSource): Choice {
  return choices[Math.floor(random() * choices.length)]!;
}
