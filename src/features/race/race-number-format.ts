import type { useFormatter } from 'next-intl';

type NumberFormatter = ReturnType<typeof useFormatter>;

export function formatFinishSeconds(format: NumberFormatter, finishMs: number): string {
  return format.number(finishMs / 1000, { minimumFractionDigits: 1, maximumFractionDigits: 1 });
}

export function formatWholeNumber(format: NumberFormatter, value: number): string {
  return format.number(value, { maximumFractionDigits: 0 });
}

// Rounded to a whole percent for display only; the ranking compares the exact ratio.
export function wholePercent(ratio: number): number {
  return Math.round(ratio * 100);
}
