import { passageLanguage } from '@/config/passages';

export function RacePassage({ passage, heading }: { passage: string; heading: string }) {
  return (
    <section aria-labelledby="passage-heading" className="mt-6 border-4 border-ink bg-white p-4">
      <h2 id="passage-heading" className="font-bold">
        {heading}
      </h2>
      <p lang={passageLanguage} className="mt-2 font-mono text-lg wrap-anywhere">
        {passage}
      </p>
    </section>
  );
}
