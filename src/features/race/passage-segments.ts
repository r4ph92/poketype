// typedRuns splits the typed part into runs of correct characters and of kept mistakes (free mode), so mistakes show in red.
export type TypedRun = { text: string; isMistake: boolean };

export type PassageSegments = { typed: string; typedRuns: TypedRun[]; current: string | null; upcoming: string };

// A wrong space would be invisible, so blocked mode shows it as a middle dot.
const wrongSpaceMarker = '·';

export function splitPassage(characters: readonly string[], position: number, isRejected: boolean, mistakes: readonly number[] = []): PassageSegments {
  const expected = characters[position];
  const current = expected === undefined ? null : shownCharacter(expected, isRejected);
  const typedRuns = typedRunsOf(characters.slice(0, position), new Set(mistakes));
  return { typed: characters.slice(0, position).join(''), typedRuns, current, upcoming: characters.slice(position + 1).join('') };
}

// A kept mistake shows the expected character, a space as a middle dot, so it can be seen.
function typedRunsOf(typed: readonly string[], mistakes: ReadonlySet<number>): TypedRun[] {
  const runs: TypedRun[] = [];
  typed.forEach((character, index) => {
    const isMistake = mistakes.has(index);
    const shown = shownCharacter(character, isMistake);
    const last = runs.at(-1);
    if (last && last.isMistake === isMistake) last.text += shown;
    else runs.push({ text: shown, isMistake });
  });
  return runs;
}

function shownCharacter(expected: string, isRejected: boolean): string {
  return isRejected && expected === ' ' ? wrongSpaceMarker : expected;
}
