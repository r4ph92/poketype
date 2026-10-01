import Image from 'next/image';
const decorativeAlt = '';
export function PokemonArt({ dex, scale = 1, locked = false, silhouette = false }: { dex: number; scale?: 1 | 2 | 3; locked?: boolean; silhouette?: boolean }) {
  return <Image src={`/assets/sprites/pokemon/front/${dex}.png`} width={96 * scale} height={96 * scale} alt={decorativeAlt} unoptimized loading="eager" style={silhouette ? { filter: 'brightness(0)', opacity: 0.65 } : undefined} className={`pixelated shrink-0 ${locked ? 'pokemon-locked' : ''}`} />;
}
