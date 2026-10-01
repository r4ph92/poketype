const dotXs = [0, 10, 20] as const;

// The slot is always rendered so the button never changes width when it turns pending.
export function PendingDots({ isVisible }: { isVisible: boolean }) {
  return (
    <svg
      width="26"
      height="6"
      viewBox="0 0 26 6"
      shapeRendering="crispEdges"
      aria-hidden="true"
      focusable="false"
      className={`shrink-0 fill-current ${isVisible ? 'motion-safe:animate-pending-dots' : 'invisible'}`}
    >
      {dotXs.map((x) => (
        <rect key={x} x={x} y="0" width="6" height="6" />
      ))}
    </svg>
  );
}
