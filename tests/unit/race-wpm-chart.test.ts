import { describe, expect, it } from 'vitest';
import { gameConfig } from '../../src/config/game';
import { plotX, timeAxisMaxMs } from '../../src/domain/wpm-chart';
import type { RacerWpmTimeline } from '../../src/domain/wpm-timeline';
import type { ResultsTableRow } from '../../src/features/race/results-table';
import { inDrawingOrder, timelineMoments, wpmLinesOf } from '../../src/features/race/wpm-timeline/wpm-lines';

function row(memberKey: string, place: number, isViewer = false, isBot = false): ResultsTableRow {
  return {
    memberKey, standing: 'ranked', outcome: 'finished', place, grossWpm: 30, rawWpm: 31, score: 30, accuracy: 1, errors: 0, finishMs: 20_000,
    trainerName: memberKey.toUpperCase(), avatarSeed: null, isViewer, partner: null, bot: isBot ? { character: 'brock', level: 'noob', seed: 1 } : null, bonuses: [],
  };
}

function timeline(memberKey: string, elapsed: readonly number[]): RacerWpmTimeline {
  return { memberKey, points: elapsed.map((elapsedMs) => ({ elapsedMs, wpm: 20 })) };
}

describe('wpmLinesOf', () => {
  const rows = [row('leo', 1), row('zoe', 2, true), row('bot', 3, false, true)];
  const timelines = [timeline('bot', [1_000, 2_000]), timeline('zoe', [1_000, 1_500]), timeline('leo', [1_000, 2_000, 2_300])];

  it('gives one line per racer in the results order, the viewer emphasised and every rival styled apart', () => {
    const lines = wpmLinesOf(rows, timelines);
    expect(lines.map(({ memberKey, isViewer, botLevel }) => ({ memberKey, isViewer, botLevel }))).toEqual([
      { memberKey: 'leo', isViewer: false, botLevel: null },
      { memberKey: 'zoe', isViewer: true, botLevel: null },
      { memberKey: 'bot', isViewer: false, botLevel: 'noob' },
    ]);
    expect(lines[1]!.style).toEqual({ color: 'xp', dash: null });
    expect(new Set(lines.map((line) => JSON.stringify(line.style))).size).toBe(3);
  });

  it('draws the viewer last and lists every moment once, in order', () => {
    const lines = wpmLinesOf(rows, timelines);
    expect(inDrawingOrder(lines).at(-1)?.memberKey).toBe('zoe');
    expect(timelineMoments(lines)).toEqual([1_000, 1_500, 2_000, 2_300]);
  });

  it('gives the first four rivals each their own dash and color, keeps the viewer the only solid line, and no two of sixteen rivals alike', () => {
    const rivals = Array.from({ length: 16 }, (_, index) => row(`r${index}`, index + 2));
    const lines = wpmLinesOf([row('zoe', 1, true), ...rivals], [timeline('zoe', [1_000]), ...rivals.map((rival) => timeline(rival.memberKey, [1_000]))]);
    const rivalStyles = lines.filter((line) => !line.isViewer).map((line) => line.style);
    const firstFour = rivalStyles.slice(0, 4);
    expect(new Set(firstFour.map((style) => style.dash)).size).toBe(4);
    expect(new Set(firstFour.map((style) => style.color)).size).toBe(4);
    expect(rivalStyles.every((style) => style.dash !== null)).toBe(true);
    expect(new Set(rivalStyles.map((style) => `${style.color} ${style.dash}`)).size).toBe(16);
  });

  it('leaves out a racer without a timeline', () => {
    expect(wpmLinesOf(rows, timelines.slice(1)).map((line) => line.memberKey)).toEqual(['leo', 'zoe']);
  });
});

describe('the race chart time axis', () => {
  it('ends at the next step after the last stop and maps the start to the left inset', () => {
    expect(timeAxisMaxMs([1_000, 37_400])).toBe(40_000);
    expect(timeAxisMaxMs([])).toBe(gameConfig.wpmTimeline.timeAxisStepSeconds * 1000);
    const area = { width: 640, height: 240, inset: 12 };
    expect(plotX(0, 40_000, area)).toBe(12);
    expect(plotX(40_000, 40_000, area)).toBe(628);
  });
});
