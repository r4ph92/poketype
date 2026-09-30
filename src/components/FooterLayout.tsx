export type FooterNotice = { locale: string; lines: string[] };

export function FooterLayout({ notices }: { notices: FooterNotice[] }) {
  return (
    <footer className="space-y-4 border-t-4 border-ink bg-sage px-4 py-6 text-sm">
      {notices.map(({ locale, lines }) => (
        <div key={locale} lang={locale} className="space-y-1">
          {lines.map((line) => (
            <p key={line}>{line}</p>
          ))}
        </div>
      ))}
    </footer>
  );
}
