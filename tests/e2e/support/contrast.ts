import { readFileSync } from 'node:fs';
import { join } from 'node:path';

export type Rgb = readonly [red: number, green: number, blue: number];

export function parseCssColor(color: string): Rgb {
  const channels = color.match(/\d+(\.\d+)?/g)?.slice(0, 3).map(Number);
  if (!channels || channels.length < 3) throw new Error(`not an rgb() color: ${color}`);
  return [channels[0]!, channels[1]!, channels[2]!];
}

export function parseHexColor(hex: string): Rgb {
  const value = Number.parseInt(hex.replace('#', ''), 16);
  return [(value >> 16) & 255, (value >> 8) & 255, value & 255];
}

function linearChannel(channel: number): number {
  const ratio = channel / 255;
  return ratio <= 0.04045 ? ratio / 12.92 : ((ratio + 0.055) / 1.055) ** 2.4;
}

function relativeLuminance([red, green, blue]: Rgb): number {
  return 0.2126 * linearChannel(red) + 0.7152 * linearChannel(green) + 0.0722 * linearChannel(blue);
}

// WCAG 2.x contrast ratio, from 1 (same color) to 21 (black on white).
export function contrastRatio(foreground: Rgb, background: Rgb): number {
  const [lighter, darker] = [relativeLuminance(foreground), relativeLuminance(background)].sort((first, second) => second - first);
  return (lighter! + 0.05) / (darker! + 0.05);
}

export function themeColors(): Map<string, Rgb> {
  const css = readFileSync(join(process.cwd(), 'src', 'app', 'globals.css'), 'utf8');
  return new Map([...css.matchAll(/--color-([a-z-]+):\s*(#[0-9a-f]{6})/g)].map((match) => [match[1]!, parseHexColor(match[2]!)]));
}

export function sameColor(first: Rgb, second: Rgb, tolerance = 0): boolean {
  return first.every((channel, index) => Math.abs(channel - second[index]!) <= tolerance);
}
