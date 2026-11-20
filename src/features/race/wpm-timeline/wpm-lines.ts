import type { BotLevel } from '@/assets/bot-characters';
import type { RacerWpmTimeline, TimelinePoint } from '@/domain/wpm-timeline';
import type { ResultsTableRow } from '../results-table';

// Theme colors that keep 3:1 against the chart's cream-deep paper in both themes; the viewer's own color is kept for them alone.
const rivalColors = ['ink', 'error', 'success', 'muted'] as const;

// Every rival line is dashed, so the viewer's is the only solid one; dashes cycle with the colors, so lines differ without telling colors apart.
const rivalDashes = ['12 6', '3 5', '16 5 3 5', '8 3 2 3 2 3'] as const;

export type LineColor = (typeof rivalColors)[number] | 'xp';

export type LineStyle = { color: LineColor; dash: string | null };

export type WpmLine = { memberKey: string; trainerName: string; isViewer: boolean; botLevel: BotLevel | null; style: LineStyle; points: TimelinePoint[] };

const viewerStyle: LineStyle = { color: 'xp', dash: null };

// The lines follow the results order, so the legend reads like the standings; a racer without a timeline has no line.
export function wpmLinesOf(rows: readonly ResultsTableRow[], timelines: readonly RacerWpmTimeline[]): WpmLine[] {
  const rivals = rows.filter((row) => !row.isViewer).map((row) => row.memberKey);
  return rows.flatMap((row) => {
    const timeline = timelines.find((candidate) => candidate.memberKey === row.memberKey);
    if (!timeline || timeline.points.length === 0) return [];
    const style = row.isViewer ? viewerStyle : rivalStyle(rivals.indexOf(row.memberKey));
    return [{ memberKey: row.memberKey, trainerName: row.trainerName, isViewer: row.isViewer, botLevel: row.bot?.level ?? null, style, points: timeline.points }];
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

// The first rivals each get their own color and dash; after a full round the colors shift by one, so no two rivals share both before 16.
function rivalStyle(rivalIndex: number): LineStyle {
  const round = Math.floor(rivalIndex / rivalDashes.length);
  const dash = rivalDashes[rivalIndex % rivalDashes.length]!;
  const color = rivalColors[(rivalIndex + round) % rivalColors.length]!;
  return { color, dash };
}
