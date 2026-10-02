import Image from 'next/image';
import { itemArtwork } from '@/assets/manifest';
import type { ShopItemId } from '@/domain/shop-item';

const decorativeAlt = '';

export function ItemArt({ item, scale = 2 }: { item: ShopItemId; scale?: 1 | 2 | 3 }) {
  const size = itemArtwork.size * scale;
  return <Image src={`${itemArtwork.path}${item}.svg`} width={size} height={size} alt={decorativeAlt} unoptimized className="pixelated shrink-0" />;
}
