export type PassageSegments = { typed: string; current: string | null; upcoming: string };

// A wrong space would be invisible, so blocked mode shows it as a middle dot.
const wrongSpaceMarker = '·';

export function splitPassage(characters: readonly string[], position: number, isRejected: boolean): PassageSegments {
  const expected = characters[position];
  const current = expected === undefined ? null : shownCharacter(expected, isRejected);
  return { typed: characters.slice(0, position).join(''), current, upcoming: characters.slice(position + 1).join('') };
}

function shownCharacter(expected: string, isRejected: boolean): string {
  return isRejected && expected === ' ' ? wrongSpaceMarker : expected;
}
