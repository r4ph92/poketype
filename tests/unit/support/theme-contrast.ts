import { readFileSync } from 'node:fs';
import { join } from 'node:path';

export type Theme = 'light' | 'dark';

export const themes: readonly Theme[] = ['light', 'dark'];

const themeCss = readFileSync(join(process.cwd(), 'src', 'app', 'globals.css'), 'utf8');

export function themeColor(token: string, theme: Theme): string {
  const match = new RegExp(`--color-${token}:\\s*(?:light-dark\\((#[0-9a-f]{6}),\\s*(#[0-9a-f]{6})\\)|(#[0-9a-f]{6}))`).exec(themeCss);
  if (!match) throw new Error(`No theme colour named ${token}`);
  return match[3] ?? (theme === 'light' ? match[1]! : match[2]!);
}

export function contrastRatio(first: string, second: string): number {
  const [lighter, darker] = [luminance(first), luminance(second)].sort((a, b) => b - a);
  return (lighter! + 0.05) / (darker! + 0.05);
}

function luminance(hex: string): number {
  const [red, green, blue] = [1, 3, 5].map((start) => parseInt(hex.slice(start, start + 2), 16) / 255).map((value) => (value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4));
  return 0.2126 * red! + 0.7152 * green! + 0.0722 * blue!;
}
