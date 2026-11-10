import { useTranslations } from 'next-intl';
import Link from 'next/link';

const linkClassName = 'inline-flex min-h-11 items-center font-semibold underline';

// Guests cannot open rooms, so where the create button would be they are invited to log in or sign up.
export function HostingInvitation() {
  const t = useTranslations('Play');
  const accountBar = useTranslations('AccountBar');
  return (
    <div className="grid gap-1">
      <p>{t('hostWithAccount')}</p>
      <p className="flex flex-wrap gap-x-4">
        <Link href="/login" className={linkClassName}>{accountBar('logIn')}</Link>
        <Link href="/signup" className={linkClassName}>{accountBar('signUp')}</Link>
      </p>
    </div>
  );
}
