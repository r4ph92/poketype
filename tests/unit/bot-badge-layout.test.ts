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

describe('race roster bonus badge', () => {
  it('sits on its own line under the name, never over the WPM or the progress', () => {
    expect(ruleBody(themeCss, '.race-roster-bonus')).toMatch(/grid-column:\s*3 \/ -1/);
    expect(ruleBody(themeCss, '.race-roster-bonus')).toMatch(/justify-self:\s*end/);
  });
});

describe('podium level badge', () => {
  const smallScreen = mediaBlock('max-width: 639px');

  it('gives the three podium columns the full phone width', () => {
    expect(ruleBody(smallScreen, '.podium-racer')).toMatch(/width:\s*calc\(\(100% - 8px\) \/ 3\)/);
  });

  it('shrinks the badge on a phone so its longest word fits one column', () => {
    const badge = ruleBody(smallScreen, '.podium-name .bot-tag');
    expect(badge).toMatch(/font-size:\s*10px/);
    expect(badge).toMatch(/letter-spacing:\s*0/);
  });

  it('breaks the badge only between its words', () => {
    expect(ruleBody(themeCss, '.podium-name .bot-tag')).toMatch(/overflow-wrap:\s*normal/);
  });
});
