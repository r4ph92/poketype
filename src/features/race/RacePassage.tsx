import { PixelPanel } from '@/components/pixel/PixelPanel';
import { passageLanguage } from '@/config/passages';

export function RacePassage({ passage, heading }: { passage: string; heading: string }) {
  return (
    <PixelPanel titleId="passage-heading" title={heading}>
      <p lang={passageLanguage} className="max-w-[48ch] text-passage font-medium tracking-[0.02em] whitespace-pre-wrap wrap-anywhere">
        {passage}
      </p>
    </PixelPanel>
  );
}
