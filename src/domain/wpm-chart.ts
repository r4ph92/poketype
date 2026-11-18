import { gameConfig } from '@/config/game';

export type PlotArea = { width: number; height: number; inset: number };

export type PlotPoint = { x: number; y: number };

// The axis starts at zero and ends at the next step above the best value, so a flat series still shows where it sits.
export function wpmAxisMax(values: readonly number[]): number {
  const step = gameConfig.profile.wpmAxisStep;
  const highest = Math.max(0, ...values);
  return Math.max(step, Math.ceil(highest / step) * step);
}

export function wpmAxisTicks(axisMax: number): number[] {
  return [axisMax, axisMax / 2, 0];
}

export function plotY(value: number, axisMax: number, area: PlotArea): number {
  const drawableHeight = area.height - 2 * area.inset;
  return Math.round(area.inset + (1 - value / axisMax) * drawableHeight);
}

// Races are spaced evenly from left to right in date order; coordinates are whole pixels to keep the line crisp.
export function plotPoints(values: readonly number[], area: PlotArea): PlotPoint[] {
  const axisMax = wpmAxisMax(values);
  const xStep = values.length > 1 ? (area.width - 2 * area.inset) / (values.length - 1) : 0;
  return values.map((value, index) => ({ x: Math.round(area.inset + index * xStep), y: plotY(value, axisMax, area) }));
}

export function polylinePoints(points: readonly PlotPoint[]): string {
  return points.map(({ x, y }) => `${x},${y}`).join(' ');
}
