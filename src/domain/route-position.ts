// Centerline in the original route.svg's 800 × 440 coordinate space.
const waypoints: readonly (readonly [number, number])[] = [[90, 360], [210, 360], [210, 280], [345, 280], [345, 325], [590, 325], [590, 200], [685, 200], [685, 105]];
const segments = waypoints.slice(1).map((end, index) => {
  const start = waypoints[index]!;
  return { start, end, length: Math.hypot(end[0] - start[0], end[1] - start[1]) };
});
const totalLength = segments.reduce((sum, segment) => sum + segment.length, 0);
function routePose(progress: number) {
  let distance = Math.max(0, Math.min(1, Number.isFinite(progress) ? progress : 0)) * totalLength;
  for (const { start, end, length } of segments) {
    if (distance <= length) {
      const fraction = distance / length;
      return { x: start[0] + (end[0] - start[0]) * fraction, y: start[1] + (end[1] - start[1]) * fraction, direction: end[0] > start[0] ? 'east' as const : end[1] > start[1] ? 'south' as const : 'north' as const };
    }
    distance -= length;
  }
  return { x: 685, y: 105, direction: 'north' as const };
}

export function routePosition(progress: number): { x: number; y: number } {
  const { x, y } = routePose(progress);
  return { x, y };
}
export function routeDirection(progress: number) { return routePose(progress).direction; }
