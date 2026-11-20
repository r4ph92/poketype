import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const themeCss = readFileSync(join(process.cwd(), 'src', 'app', 'globals.css'), 'utf8');

function sourceOf(...path: string[]): string {
  return readFileSync(join(process.cwd(), 'src', ...path), 'utf8');
}

function ruleBodies(selectorPattern: string): string[] {
  return [...themeCss.matchAll(new RegExp(`(?:^|\\n|\\})\\s*${selectorPattern}\\s*\\{([^}]*)\\}`, 'g'))].map((match) => match[1]!);
}

describe('keyboard focus on the Pokémon screens (A11Y-04, story 69)', () => {
  it('shows a focus outline on the selected PC slot that differs from its selected look', () => {
    const selectedSetsOutline = ruleBodies('\\.pokemon-slot\\[aria-pressed="true"\\]').some((body) => /outline\s*:/.test(body));
    const focusedSelectedRules = ruleBodies('\\.pokemon-slot\\[aria-pressed="true"\\]:focus-visible');
    expect(!selectedSetsOutline || focusedSelectedRules.some((body) => /outline/.test(body)), 'the selected-slot outline hides the focus-visible outline').toBe(true);
  });

  it('closes the legendary release modal before focus moves to the detail heading', () => {
    const dialog = sourceOf('features', 'trainer', 'LegendaryReleaseDialog.tsx');
    const confirm = /async function confirm\(\)[^]*?\n  \}/.exec(dialog)![0];
    expect(confirm, 'onClose runs while the modal is open, so the heading behind it is inert and focus falls to body').not.toMatch(/if \(done\) onClose\(\)/);
  });
});
