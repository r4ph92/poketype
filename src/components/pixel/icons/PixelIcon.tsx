export type PixelRect = readonly [x: number, y: number, width: number, height: number];

export type IconLayer = { fillClass: string; rects: readonly PixelRect[] };

export type IconSize = 24 | 48;

type PixelIconProps = { layers: readonly IconLayer[]; size?: IconSize };

// Whole-pixel rectangles on a 24px grid with crisp edges, shown only at 1x or 2x, so no pixel is ever blended.
export function PixelIcon({ layers, size = 24 }: PixelIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      shapeRendering="crispEdges"
      aria-hidden="true"
      focusable="false"
      className="pixel-icon shrink-0"
    >
      {layers.map(({ fillClass, rects }) => (
        <g key={fillClass} className={fillClass}>
          {rects.map(([x, y, width, height]) => (
            <rect key={`${x}-${y}-${width}-${height}`} x={x} y={y} width={width} height={height} />
          ))}
        </g>
      ))}
    </svg>
  );
}

export function singleColor(rects: readonly PixelRect[]): readonly IconLayer[] {
  return [{ fillClass: 'fill-current', rects }];
}
