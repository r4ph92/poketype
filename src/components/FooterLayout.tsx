import type { ReactNode } from 'react';
export type FooterNotice = { locale: string; lines: string[] };

export function FooterLayout({ notices, children }: { notices: FooterNotice[]; children?: ReactNode }) {
  return (
    <footer className="mx-auto mt-6 grid w-full max-w-[90rem] gap-4 border-t-2 border-frame px-4 py-4 text-sm lg:grid-cols-2">
      {notices.map(({ locale, lines }) => (
        <div key={locale} lang={locale} className="space-y-1">
          {lines.map((line) => (
            <p key={line}>{line}</p>
          ))}
        </div>
      ))}
      {children}
    </footer>
  );
}
