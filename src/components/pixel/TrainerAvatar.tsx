import Image from 'next/image';
import { artwork } from '@/assets/manifest';

const decorativeAlt = '';
// Default official trainer artwork, rendered at its native size. Selection is a later feature.
export function TrainerAvatar({ scale = 1 }: { scale?: 1 | 2 }) {
  return <Image src={artwork.trainer.src} width={artwork.trainer.width * scale} height={artwork.trainer.height * scale} alt={decorativeAlt} unoptimized className="pixelated shrink-0" />;
}
