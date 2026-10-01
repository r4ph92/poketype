import { PixelIcon, singleColor, type IconSize, type PixelRect } from './PixelIcon';

type IconProps = { size?: IconSize };

const ballOutline: readonly PixelRect[] = [
  [8, 3, 8, 1], [6, 4, 2, 1], [16, 4, 2, 1], [5, 5, 1, 1], [18, 5, 1, 1], [4, 6, 1, 2], [19, 6, 1, 2],
  [3, 8, 1, 8], [20, 8, 1, 8], [4, 16, 1, 2], [19, 16, 1, 2], [5, 18, 1, 1], [18, 18, 1, 1],
  [6, 19, 2, 1], [16, 19, 2, 1], [8, 20, 8, 1],
  [4, 11, 6, 2], [14, 11, 6, 2], [10, 10, 4, 1], [9, 11, 1, 2], [14, 11, 1, 2], [10, 13, 4, 1],
];
const ballTop: readonly PixelRect[] = [[8, 4, 8, 1], [6, 5, 12, 1], [5, 6, 14, 2], [4, 8, 16, 2], [4, 10, 6, 1], [14, 10, 6, 1]];
const ballBottom: readonly PixelRect[] = [
  [10, 11, 4, 2], [4, 13, 6, 1], [14, 13, 6, 1], [4, 14, 16, 2], [5, 16, 14, 2], [6, 18, 12, 1], [8, 19, 8, 1],
];

const flag: readonly PixelRect[] = [
  [4, 3, 2, 18], [3, 20, 4, 1],
  [6, 3, 13, 1], [18, 4, 1, 10], [6, 13, 13, 1],
  [6, 4, 4, 3], [14, 4, 4, 3], [10, 7, 4, 3], [6, 10, 4, 3], [14, 10, 4, 3],
];

const user: readonly PixelRect[] = [[9, 3, 6, 1], [8, 4, 8, 6], [9, 10, 6, 1], [7, 13, 10, 1], [5, 14, 14, 1], [4, 15, 16, 6]];

const alert: readonly PixelRect[] = [[3, 3, 18, 2], [3, 19, 18, 2], [3, 5, 2, 14], [19, 5, 2, 14], [11, 7, 2, 7], [11, 15, 2, 2]];

const check: readonly PixelRect[] = [[3, 12, 3, 3], [6, 15, 3, 3], [9, 12, 3, 3], [12, 9, 3, 3], [15, 6, 3, 3], [18, 3, 3, 3]];

const guideOutline: readonly PixelRect[] = [
  [6, 2, 12, 2], [5, 4, 14, 3], [5, 7, 1, 8], [18, 7, 1, 8], [6, 15, 12, 1], [8, 9, 2, 2], [14, 9, 2, 2], [10, 12, 4, 1],
  [11, 16, 2, 2], [4, 18, 16, 1], [3, 19, 1, 5], [20, 19, 1, 5],
];
const guideFace: readonly PixelRect[] = [[6, 7, 12, 8]];
const guideCoat: readonly PixelRect[] = [[4, 19, 16, 5]];

export function BallIcon({ size }: IconProps) {
  return (
    <PixelIcon
      size={size}
      layers={[
        { fillClass: 'fill-slate', rects: ballTop },
        { fillClass: 'fill-cream', rects: ballBottom },
        { fillClass: 'fill-ink', rects: ballOutline },
      ]}
    />
  );
}

export function RaceFlagIcon({ size }: IconProps) {
  return <PixelIcon size={size} layers={singleColor(flag)} />;
}

export function UserIcon({ size }: IconProps) {
  return <PixelIcon size={size} layers={singleColor(user)} />;
}

export function AlertIcon({ size }: IconProps) {
  return <PixelIcon size={size} layers={singleColor(alert)} />;
}

export function CheckIcon({ size }: IconProps) {
  return <PixelIcon size={size} layers={singleColor(check)} />;
}

export function GuideIcon({ size }: IconProps) {
  return (
    <PixelIcon
      size={size}
      layers={[
        { fillClass: 'fill-cream', rects: guideFace },
        { fillClass: 'fill-slate', rects: guideCoat },
        { fillClass: 'fill-ink', rects: guideOutline },
      ]}
    />
  );
}
