import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

type SourceFile = { path: string; text: string };

const sourceRoot = join(process.cwd(), 'src');
const themeCss = readFileSync(join(sourceRoot, 'app', 'globals.css'), 'utf8');

const defaultPalette = /^(?:white|black|(?:slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-\d+)$/;
const forbiddenUtility = /^(?:rounded(?:-.+)?|shadow(?:-.+)?|bg-gradient-.+|backdrop-.+|opacity-.+)$/;
const colorAlpha = /^(?:bg|text|border|fill|stroke|outline|decoration)-[a-z-]+\/\d+$/;
const colorUtility = /^(?:bg|text|border|fill|stroke|outline|decoration|placeholder)-(.+)$/;
const notAColor = /^(?:\[.+\]|\(.+\)|\d+|[xytblrse]-\d+|[xytblrse]-\[.+\]|[xytblrse]|sm|base|lg|xl|display|passage|left|center|right|start|end|justify|wrap|nowrap|balance|pretty|ellipsis|clip|solid|dashed|dotted|double|none|hidden|offset-\d+)$/;
const alwaysAllowedColors = ['current', 'transparent', 'inherit'];
const unclippedTags = ['button', 'a', 'input', 'Link'];

function tsxFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) return tsxFiles(path);
    return path.endsWith('.tsx') ? [path] : [];
  });
}

const sources: SourceFile[] = tsxFiles(sourceRoot).map((path) => ({ path, text: readFileSync(path, 'utf8') }));

function classTokens(text: string): string[] {
  const literals = [...text.matchAll(/'([^'\n]*)'|"([^"\n]*)"|`([^`]*)`/g)].map((match) => match[1] ?? match[2] ?? match[3] ?? '');
  return literals.flatMap((literal) => literal.split(/\s+/)).map((token) => token.split(':').pop() ?? '');
}

function themeColorNames(): string[] {
  return [...themeCss.matchAll(/--color-([a-z-]+):\s*#/g)].map((match) => match[1]!);
}

function tokensMatching(rule: (token: string) => boolean): string[] {
  return sources.flatMap(({ path, text }) => classTokens(text).filter(rule).map((token) => `${path}: ${token}`));
}

function openingTag(text: string, start: number): string {
  let depth = 0;
  for (let index = start; index < text.length; index++) {
    const character = text[index];
    if (character === '{') depth++;
    if (character === '}') depth--;
    if (character === '>' && depth === 0) return text.slice(start, index);
  }
  return text.slice(start);
}

function clippedFocusableTags({ path, text }: SourceFile): string[] {
  const tagStarts = [...text.matchAll(new RegExp(`<(?:${unclippedTags.join('|')})[\\s>]`, 'g'))].map((match) => match.index);
  return tagStarts.filter((start) => openingTag(text, start).includes('pixel-notch')).map((start) => `${path}: ${openingTag(text, start).slice(0, 40)}`);
}

describe('design rules in src/**/*.tsx', () => {
  it('use no default Tailwind palette color', () => {
    expect(tokensMatching((token) => defaultPalette.test(colorUtility.exec(token)?.[1] ?? ''))).toEqual([]);
  });

  it('use no rounded corners, shadows, gradients, backdrop effects, opacity or color alpha', () => {
    expect(tokensMatching((token) => forbiddenUtility.test(token) || colorAlpha.test(token))).toEqual([]);
  });

  it('name only colors defined in the theme', () => {
    const allowed = new Set([...themeColorNames(), ...alwaysAllowedColors]);
    const isUnknownColor = (token: string) => {
      const suffix = colorUtility.exec(token)?.[1];
      return suffix !== undefined && !notAColor.test(suffix) && !allowed.has(suffix);
    };
    expect(tokensMatching(isUnknownColor)).toEqual([]);
  });

  it('never notch a focusable element, since clip-path would cut its focus outline', () => {
    expect(sources.flatMap(clippedFocusableTags)).toEqual([]);
  });

  it('never hard-code a name width; it comes from maxDisplayNameLength', () => {
    expect(sources.filter(({ text }) => /\[(?:16|20)ch\]/.test(text)).map(({ path }) => path)).toEqual([]);
  });
});
