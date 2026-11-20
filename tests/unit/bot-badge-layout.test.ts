import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const themeCss = readFileSync(join(process.cwd(), 'src', 'app', 'globals.css'), 'utf8');

function escapeForPattern(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function mediaBlock(query: string): string {
  const start = themeCss.indexOf(`@media (${query}) {`);
  expect(start, `@media (${query})`).toBeGreaterThanOrEqual(0);
  const end = themeCss.indexOf('\n}', start);
  return themeCss.slice(start, end);
}

function ruleBody(css: string, selector: string): string {
  const match = new RegExp(`(?:^|\\n)\\s*${escapeForPattern(selector)}\\s*\\{([^}]*)\\}`).exec(css);
  expect(match, selector).not.toBeNull();
  return match![1]!;
}

describe('race roster level badge', () => {
  it('clips only the trainer name, never the level badge', () => {
    expect(ruleBody(themeCss, '.race-roster-name')).not.toMatch(/overflow\s*:/);
    expect(ruleBody(themeCss, '.race-roster-trainer')).toMatch(/text-overflow:\s*ellipsis/);
  });

  it('lets the badge shrink only down to its longest word', () => {
    expect(ruleBody(themeCss, '.race-roster-name > .pixel-frame-thin')).not.toMatch(/min-width:\s*0/);
  });

  it('stacks the WPM and status on a phone so the name column has room', () => {
    const phone = mediaBlock('max-width: 479px');
    expect(ruleBody(phone, '.race-roster-row')).toMatch(/grid-template-columns:\s*\S+ \S+ minmax\(0, 1fr\) auto;/);
    expect(ruleBody(phone, '.race-roster-status')).toMatch(/grid-column:\s*4/);
  });
});
