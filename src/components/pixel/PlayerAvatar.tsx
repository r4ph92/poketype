import Image from 'next/image';
import type { TrainerAvatarId } from '@/assets/trainers';
import { gameConfig } from '@/config/game';
import { pixelAvatarOf } from '@/domain/pixel-avatar';

const { gridSize } = gameConfig.avatar;

// Every pair keeps 3:1 or better between its cells and its background in both themes, and none uses gold, silver or bronze, which mean "this one" and a rank.
export const avatarPalettes = [
  { background: 'fill-cream-deep', cell: 'fill-ink' },
  { background: 'fill-cream-deep', cell: 'fill-xp' },
  { background: 'fill-cream-deep', cell: 'fill-error' },
  { background: 'fill-cream-deep', cell: 'fill-success' },
  { background: 'fill-cream-deep', cell: 'fill-muted' },
  { background: 'fill-sage', cell: 'fill-ink' },
  { background: 'fill-ink', cell: 'fill-cream' },
  { background: 'fill-slate', cell: 'fill-cream' },
] as const;

// name is set when no text beside the avatar already names the player; with the name next to it the avatar is decorative.
// Both sizes give each of the seven cells a whole number of pixels inside the 2px frame.
const sizeClass = { regular: 'size-8', small: 'size-[18px]' } as const;

type PlayerAvatarProps = { seed: number | null; trainer?: TrainerAvatarId | null; name?: string; size?: keyof typeof sizeClass; className?: string };

const decorativeAlt = '';
const faceSize = { regular: 32, small: 18 } as const;

// An account that picked a trainer shows the trainer's face; a guest, or an account without a pick, keeps the generated avatar. A bot has no seed and keeps its sprite alone.
export function PlayerAvatar({ seed, trainer = null, name, size = 'regular', className = '' }: PlayerAvatarProps) {
  if (trainer !== null) return <TrainerFace trainer={trainer} name={name} size={size} className={className} />;
  if (seed === null) return null;
  const { cells, paletteIndex } = pixelAvatarOf(seed);
  const palette = avatarPalettes[paletteIndex % avatarPalettes.length]!;
  const accessibility = name === undefined ? { 'aria-hidden': true } : { role: 'img', 'aria-label': name };
  return (
    <svg viewBox={`0 0 ${gridSize} ${gridSize}`} shapeRendering="crispEdges" data-avatar-seed={seed} className={`${sizeClass[size]} shrink-0 border-2 border-frame ${className}`} {...accessibility}>
      <rect width={gridSize} height={gridSize} className={palette.background} />
      {cells.map(({ column, row }) => <rect key={`${column},${row}`} x={column} y={row} width="1" height="1" className={palette.cell} />)}
    </svg>
  );
}

type TrainerFaceProps = { trainer: TrainerAvatarId; name?: string; size: keyof typeof sizeClass; className: string };

function TrainerFace({ trainer, name, size, className }: TrainerFaceProps) {
  const pixels = faceSize[size];
  return <Image src={`/assets/sprites/trainers/faces/${trainer}.png`} alt={name ?? decorativeAlt} width={pixels} height={pixels} unoptimized data-trainer-face={trainer} className={`${sizeClass[size]} pixelated shrink-0 border-2 border-frame bg-cream-deep ${className}`} />;
}
