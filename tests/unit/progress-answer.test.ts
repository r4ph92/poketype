import { describe, expect, it } from 'vitest';
import { toReportAnswer } from '../../src/features/race/progress-answer';

const row = { lastSequence: 2, position: 5, keystrokes: 6, rejectedKeystrokes: 1, finishMs: null };

describe('progress answer', () => {
  it('an accepted report carries the stored row', () => {
    expect(toReportAnswer(200, { result: 'accepted', ...row })).toEqual({ kind: 'accepted', progress: row });
  });

  it.each([
    [409, 'stale'],
    [409, 'finished'],
    [422, 'implausible'],
  ])('a %i %s refusal carries the stored row so the reporter resynchronizes', (status, result) => {
    expect(toReportAnswer(status, { result, ...row })).toEqual({ kind: 'refused', progress: row });
  });

  it('a report before the start is retried', () => {
    expect(toReportAnswer(409, { result: 'not-started', ...row })).toEqual({ kind: 'retry' });
  });

  it('a race that is over stops the reporter', () => {
    expect(toReportAnswer(409, { result: 'race-over', ...row })).toEqual({ kind: 'stop' });
  });

  it.each([429, 500, 502, 503])('a %i is retried', (status) => {
    expect(toReportAnswer(status, null)).toEqual({ kind: 'retry' });
  });

  it.each([400, 401, 403, 404, 413, 415])('a %i stops the reporter', (status) => {
    expect(toReportAnswer(status, null)).toEqual({ kind: 'stop' });
  });

  it('a success without a readable row is retried', () => {
    expect(toReportAnswer(200, { result: 'accepted', position: 5 })).toEqual({ kind: 'retry' });
    expect(toReportAnswer(200, null)).toEqual({ kind: 'retry' });
  });
});
