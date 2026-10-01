import { UserIcon } from './icons/icons';

type AvatarSize = 32 | 64;

const boxClass: Record<AvatarSize, string> = { 32: 'size-8', 64: 'size-16' };

// Placeholder until the trainer sprite story; decorative because the trainer name is always shown next to it.
export function TrainerAvatar({ size = 32 }: { size?: AvatarSize }) {
  return (
    <span
      aria-hidden="true"
      className={`pixel-frame-thin pixel-notch flex shrink-0 items-center justify-center bg-cream-deep text-ink ${boxClass[size]}`}
    >
      <UserIcon size={size === 64 ? 48 : 24} />
    </span>
  );
}
