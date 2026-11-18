import { getTranslations } from 'next-intl/server';
import Link from 'next/link';
import { pageLinks, type PageLink } from '@/domain/race-history';

const ellipsis = '\u2026';
const linkClass = 'inline-flex min-h-11 min-w-11 items-center justify-center px-2 font-pixel font-semibold underline';

export async function RaceHistoryPager({ page, pageCount }: { page: number; pageCount: number }) {
  if (pageCount === 1) return null;
  const t = await getTranslations('RaceHistory');
  return (
    <nav aria-label={t('pagesLabel')}>
      <ul className="flex flex-wrap items-center gap-1">
        {page > 1 && <li><Link href={pageHref(page - 1)} rel="prev" className={linkClass}>{t('previous')}</Link></li>}
        {pageLinks(page, pageCount).map((link) => <li key={linkKey(link)}><PagerItem link={link} currentPage={page} /></li>)}
        {page < pageCount && <li><Link href={pageHref(page + 1)} rel="next" className={linkClass}>{t('next')}</Link></li>}
      </ul>
    </nav>
  );
}

async function PagerItem({ link, currentPage }: { link: PageLink; currentPage: number }) {
  if (link.kind === 'gap') return <span aria-hidden="true">{ellipsis}</span>;
  const t = await getTranslations('RaceHistory');
  if (link.page === currentPage) return <span aria-current="page" className="inline-flex min-h-11 min-w-11 items-center justify-center bg-gold px-2 font-pixel font-bold text-on-gold">{link.page}</span>;
  return <Link href={pageHref(link.page)} aria-label={t('goToPage', { page: link.page })} className={linkClass}>{link.page}</Link>;
}

function pageHref(page: number): string {
  return page === 1 ? '/play/history' : `/play/history?page=${page}`;
}

function linkKey(link: PageLink): string {
  return link.kind === 'gap' ? `gap-${link.after}` : `page-${link.page}`;
}
