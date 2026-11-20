import { getLocale, getTranslations } from 'next-intl/server';
import { PixelAnchor, PixelButton } from '@/components/pixel/PixelButton';
import { oauthProviderNames, oauthProviders, type OAuthProvider } from '@/domain/oauth-provider';
import type { StarterDestination } from '@/domain/starter-destination';
import { entryReturnQuery } from '@/features/guest/entry-destination';
import { readOAuthAvailability } from '@/server/oauth/oauth-settings';

type OAuthButtonsProps = { returnTo: StarterDestination };

const unavailableNoteId = 'oauth-unavailable-note';

// Only whether each provider is configured reaches the page; client IDs and secrets stay on the server.
export async function OAuthButtons({ returnTo }: OAuthButtonsProps) {
  const t = await getTranslations('OAuth');
  const availability = readOAuthAvailability(process.env);
  const unavailable = oauthProviders.filter((provider) => !availability[provider]);
  return (
    <div className="grid gap-4">
      <p className="flex items-center gap-3 font-pixel text-sm uppercase text-muted before:h-0.5 before:flex-1 before:bg-slate after:h-0.5 after:flex-1 after:bg-slate">{t('divider')}</p>
      <div className="flex flex-wrap gap-3">
        {oauthProviders.map((provider) => (
          <ProviderButton key={provider} isAvailable={availability[provider]} href={`/auth/${provider}${entryReturnQuery(returnTo)}`} label={t('continueWith', { provider: oauthProviderNames[provider] })} />
        ))}
      </div>
      {unavailable.length > 0 && <UnavailableNote providers={unavailable} />}
    </div>
  );
}

async function UnavailableNote({ providers }: { providers: OAuthProvider[] }) {
  const t = await getTranslations('OAuth');
  const names = new Intl.ListFormat(await getLocale(), { type: 'conjunction' }).format(providers.map((provider) => oauthProviderNames[provider]));
  return (
    <p id={unavailableNoteId} className="max-w-[65ch] text-muted">
      {t('unavailable', { providers: names })}
    </p>
  );
}

type ProviderButtonProps = { isAvailable: boolean; href: string; label: string };

function ProviderButton({ isAvailable, href, label }: ProviderButtonProps) {
  if (isAvailable) return <PixelAnchor href={href}>{label}</PixelAnchor>;
  return (
    <PixelButton variant="secondary" unavailable describedBy={unavailableNoteId}>
      {label}
    </PixelButton>
  );
}
