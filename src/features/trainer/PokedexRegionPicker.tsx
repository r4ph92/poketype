'use client';
import { useTranslations } from 'next-intl';
import { pokedexRegions, type PokedexRegion } from '@/assets/pokedex';
import { entriesOfRegion } from './pokedex-catalog';

type PokedexRegionPickerProps = { region: PokedexRegion; caught: ReadonlySet<number>; onChoose: (region: PokedexRegion) => void };

// One button per region, each with how many of its species the trainer has caught.
export function PokedexRegionPicker({ region, caught, onChoose }: PokedexRegionPickerProps) {
  const t = useTranslations('Pokedex');
  const regionName = useTranslations('Regions');
  return (
    <div className="pokedex-regions" role="group" aria-label={t('regions')}>
      {pokedexRegions.map(({ id }) => {
        const entries = entriesOfRegion(id);
        const count = entries.filter((entry) => caught.has(entry.dex)).length;
        return (
          <button type="button" key={id} aria-pressed={region === id} className="storage-filter pokedex-region" onClick={() => onChoose(id)}>
            <span>{regionName(id)}</span>
            <span className="pokedex-region-count">{t('regionCount', { count, total: entries.length })}</span>
          </button>
        );
      })}
    </div>
  );
}
