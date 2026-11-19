import { gameConfig } from '@/config/game';
import { pixelAvatarOf } from '@/domain/pixel-avatar';

const { gridSize } = gameConfig.avatar;

// Every pair keeps 3:1 or better between its cells and its background in both themes.
const palettes = [
  { background: 'fill-cream-deep', cell: 'fill-ink' },
  { background: 'fill-cream-deep', cell: 'fill-xp' },
  { background: 'fill-cream-deep', cell: 'fill-error' },
  { background: 'fill-cream-deep', cell: 'fill-success' },
  { background: 'fill-cream-deep', cell: 'fill-muted' },
  { background: 'fill-gold', cell: 'fill-on-gold' },
  { background: 'fill-silver', cell: 'fill-on-gold' },
  { background: 'fill-bronze', cell: 'fill-on-gold' },
] as const;

// name is set when no text beside the avatar already names the player; with the name next to it the avatar is decorative.
type PlayerAvatarProps = { seed: number | null; name?: string; className?: string };

// A bot has no seed and keeps its sprite alone.
export function PlayerAvatar({ seed, name, className = '' }: PlayerAvatarProps) {
  if (seed === null) return null;
  const { cells, paletteIndex } = pixelAvatarOf(seed);
  const palette = palettes[paletteIndex % palettes.length]!;
  const accessibility = name === undefined ? { 'aria-hidden': true } : { role: 'img', 'aria-label': name };
  return (
    <svg viewBox={`0 0 ${gridSize} ${gridSize}`} shapeRendering="crispEdges" data-avatar-seed={seed} className={`size-8 shrink-0 border-2 border-frame ${className}`} {...accessibility}>
      <rect width={gridSize} height={gridSize} className={palette.background} />
      {cells.map(({ column, row }) => <rect key={`${column},${row}`} x={column} y={row} width="1" height="1" className={palette.cell} />)}
    </svg>
  );
}
