import { Atkinson_Hyperlegible_Mono, Pixelify_Sans } from 'next/font/google';

const pixelFont = Pixelify_Sans({ subsets: ['latin'], variable: '--font-pixelify', display: 'swap' });
const monoFont = Atkinson_Hyperlegible_Mono({ subsets: ['latin'], variable: '--font-atkinson-mono', display: 'swap' });

export const fontVariables = `${pixelFont.variable} ${monoFont.variable}`;
