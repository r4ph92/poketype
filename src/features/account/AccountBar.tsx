import { getTranslations } from 'next-intl/server';
import Link from 'next/link';
import { findCurrentSession } from '@/server/sessions/current-session';

export async function AccountBar({ isSignUpPage = false }: { isSignUpPage?: boolean }) {
  const session = await findCurrentSession();
  const t = await getTranslations('AccountBar');
  return (
    <nav aria-label={t('label')} className="border-b-4 border-ink bg-sage px-4">
      <div className="mx-auto flex min-h-12 max-w-2xl items-center justify-end">
        {session?.account ? (
          <p className="font-bold wrap-anywhere">{t('account', { username: session.account.username })}</p>
        ) : (
          <Link
            href="/signup"
            aria-current={isSignUpPage ? 'page' : undefined}
            className="inline-flex min-h-11 items-center font-bold underline underline-offset-4"
          >
            {t('signUp')}
          </Link>
        )}
      </div>
    </nav>
  );
}
