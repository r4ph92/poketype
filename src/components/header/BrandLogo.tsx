import Image from 'next/image';

const logoPath = '/assets/items/poke-ball.svg';
const logoSize = 32;
const decorativeAlt = '';

// The wordmark beside it names the link, so the logo stays decorative instead of repeating "PokéType".
export function BrandLogo() {
  return <Image src={logoPath} width={logoSize} height={logoSize} alt={decorativeAlt} unoptimized priority className="brand-logo pixelated shrink-0" />;
}
