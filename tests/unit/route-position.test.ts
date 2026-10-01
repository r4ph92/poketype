import { describe, expect, it } from 'vitest';
import { routePosition } from '../../src/domain/route-position';

describe('route progress', () => {
  it('clamps racers to the starting and finishing points', () => {
    expect(routePosition(-1)).toEqual({ x: 90, y: 360 });
    expect(routePosition(1)).toEqual({ x: 685, y: 105 });
    expect(routePosition(2)).toEqual(routePosition(1));
    expect(routePosition(Number.NaN)).toEqual(routePosition(0));
  });
  it('advances by distance and crosses the river on the bridge', () => {
    expect(routePosition(60 / 940)).toEqual({ x: 150, y: 360 });
    expect(routePosition(535 / 940)).toEqual({ x: 500, y: 325 });
  });
});
