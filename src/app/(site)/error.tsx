'use client';

import { useTranslations } from 'next-intl';
import { ServerErrorMessage } from '@/components/ServerErrorMessage';

export default function ErrorPage({ retry }: { error: Error; retry: () => void }) {
  const t = useTranslations('ServerError');
  return (
    <ServerErrorMessage heading={t('heading')} message={t('message')} retryLabel={t('retry')} onRetry={retry} />
  );
}
