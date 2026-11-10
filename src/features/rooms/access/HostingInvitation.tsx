import { useTranslations } from 'next-intl';
import Link from 'next/link';

const linkClassName = 'font-semibold underline';

// Guests cannot open rooms, so where the create button would be they are invited to log in or sign up.
export function HostingInvitation() {
  const t = useTranslations('Play');
  return (
    <p>
      {t.rich('hostWithAccount', {
        login: (label) => <Link href="/login" className={linkClassName}>{label}</Link>,
        signup: (label) => <Link href="/signup" className={linkClassName}>{label}</Link>,
      })}
    </p>
  );
}
