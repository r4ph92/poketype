import { LocaleSwitch } from '@/features/locale/LocaleSwitch';

export function SiteHeader() {
  return (
    <header className="border-b-4 border-ink bg-sage px-4 py-2">
      <LocaleSwitch />
    </header>
  );
}
