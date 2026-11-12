import type { useFormatter } from 'next-intl';

type NumberFormatter = ReturnType<typeof useFormatter>;

export function formatFinishSeconds(format: NumberFormatter, finishMs: number): string {
  return format.number(finishMs / 1000, { minimumFractionDigits: 1, maximumFractionDigits: 1 });
}

export function formatWholeNumber(format: NumberFormatter, value: number): string {
  return format.number(value, { maximumFractionDigits: 0 });
}

// Accuracy as a percent with at most one decimal (Annex A example: 92.6 %); the stored value is the exact ratio.
export function accuracyPercent(format: NumberFormatter, ratio: number): string {
  return format.number(ratio * 100, { maximumFractionDigits: 1 });
}

// A race settled before raw WPM existed shows a dash.
export function formatOptionalWholeNumber(format: NumberFormatter, value: number | null): string {
  return value === null ? '\u2014' : formatWholeNumber(format, value);
}
