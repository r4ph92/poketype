import type { RacerWpmTimeline, TimelinePoint } from '@/domain/wpm-timeline';
import type { ResultsTableRow } from '../results-table';

// Theme colors that keep 3:1 against the chart's cream-deep paper in both themes; the viewer's own color is kept for them alone.
const rivalColors = ['ink', 'error', 'success', 'muted'] as const;

// Each color comes in these dash patterns too, so lines stay apart without telling colors apart.
const rivalDashes = [null, '12 6', '4 6', '16 6 4 6'] as const;

export type LineColor = (typeof rivalColors)[number] | 'xp';

export type LineStyle = { color: LineColor; dash: string | null };

export type WpmLine = { memberKey: string; trainerName: string; isViewer: boolean; isBot: boolean; style: LineStyle; points: TimelinePoint[] };

const viewerStyle: LineStyle = { color: 'xp', dash: null };

// The lines follow the results order, so the legend reads like the standings; a racer without a timeline has no line.
export function wpmLinesOf(rows: readonly ResultsTableRow[], timelines: readonly RacerWpmTimeline[]): WpmLine[] {
  const rivals = rows.filter((row) => !row.isViewer).map((row) => row.memberKey);
  return rows.flatMap((row) => {
    const timeline = timelines.find((candidate) => candidate.memberKey === row.memberKey);
    if (!timeline || timeline.points.length === 0) return [];
    const style = row.isViewer ? viewerStyle : rivalStyle(rivals.indexOf(row.memberKey));
    return [{ memberKey: row.memberKey, trainerName: row.trainerName, isViewer: row.isViewer, isBot: row.bot !== null, style, points: timeline.points }];
  });
}

// The viewer's line is drawn last, so no rival covers it.
export function inDrawingOrder(lines: readonly WpmLine[]): WpmLine[] {
  return [...lines.filter((line) => !line.isViewer), ...lines.filter((line) => line.isViewer)];
}

// Every moment any racer has a point at, in order: the whole seconds and each racer's stop.
export function timelineMoments(lines: readonly WpmLine[]): number[] {
  const moments = new Set(lines.flatMap((line) => line.points.map((point) => point.elapsedMs)));
  return [...moments].sort((first, second) => first - second);
}

function rivalStyle(rivalIndex: number): LineStyle {
  const color = rivalColors[rivalIndex % rivalColors.length]!;
  const dash = rivalDashes[Math.floor(rivalIndex / rivalColors.length) % rivalDashes.length]!;
  return { color, dash };
}
