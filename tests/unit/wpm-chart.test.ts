import { describe, expect, it } from 'vitest';
import { plotPoints, plotY, polylinePoints, wpmAxisMax, wpmAxisTicks, type PlotArea } from '../../src/domain/wpm-chart';

const area: PlotArea = { width: 220, height: 120, inset: 10 };

describe('WPM axis', () => {
  it.each([
    [[], 10],
    [[0, 0], 10],
    [[4, 7], 10],
    [[10], 10],
    [[10.2, 3], 20],
    [[38, 52.6], 60],
  ])('for %j ends at %i', (values, axisMax) => {
    expect(wpmAxisMax(values)).toBe(axisMax);
  });

  it('labels the top, middle and zero of the axis', () => {
    expect(wpmAxisTicks(60)).toEqual([60, 30, 0]);
  });
});

describe('WPM plot', () => {
  it('spreads races evenly from the left inset to the right inset in date order', () => {
    expect(plotPoints([10, 20, 30], area).map((point) => point.x)).toEqual([10, 110, 210]);
  });

  it('puts zero on the bottom inset and the axis maximum on the top inset', () => {
    expect(plotY(0, 40, area)).toBe(110);
    expect(plotY(40, 40, area)).toBe(10);
    expect(plotY(20, 40, area)).toBe(60);
  });

  it('places each race at its WPM on the rounded-up axis, on whole pixels', () => {
    expect(plotPoints([20, 40], area)).toEqual([{ x: 10, y: 60 }, { x: 210, y: 10 }]);
    expect(plotPoints([12.3, 7], area).every(({ x, y }) => Number.isInteger(x) && Number.isInteger(y))).toBe(true);
  });

  it('draws the line through the points in order', () => {
    expect(polylinePoints([{ x: 10, y: 60 }, { x: 210, y: 10 }])).toBe('10,60 210,10');
  });
});
