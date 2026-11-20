import { getTranslations } from 'next-intl/server';
import { PixelPanel } from '@/components/pixel/PixelPanel';
import { gameConfig } from '@/config/game';
import { DisplayNameForm } from './DisplayNameForm';

export async function DisplayNamePanel({ displayName, username }: { displayName: string; username: string }) {
  const t = await getTranslations('Profile.displayName');
  const { minLength, maxLength } = gameConfig.trainerName;
  return (
    <PixelPanel titleId="display-name-title" level={2} title={t('title')}>
      <DisplayNameForm
        currentName={displayName}
        label={t('label')}
        hint={t('hint', { min: minLength, max: maxLength })}
        submitLabel={t('submit')}
        savedMessage={t('saved')}
        errors={{
          required: t('errors.required'),
          length: t('errors.length', { min: minLength, max: maxLength }),
          characters: t('errors.characters'),
        }}
      />
      <p className="text-sm text-muted">{t('loginNote', { username })}</p>
    </PixelPanel>
  );
}
