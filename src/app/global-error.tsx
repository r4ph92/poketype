'use client';

import { FooterLayout } from '@/components/FooterLayout';
import { ServerErrorMessage } from '@/components/ServerErrorMessage';
import en from '@messages/fallback/en.json';
import fr from '@messages/fallback/fr.json';
import './globals.css';

const footerNotices = [
  { locale: 'fr', lines: Object.values(fr.Footer) },
  { locale: 'en', lines: Object.values(en.Footer) },
];

export default function GlobalError({ retry }: { error: Error; retry: () => void }) {
  return (
    <html lang="fr">
      <body className="flex min-h-screen flex-col bg-cream text-ink">
        <div className="flex-1">
          <ServerErrorMessage
            heading={fr.ServerError.heading}
            message={fr.ServerError.message}
            retryLabel={fr.ServerError.retry}
            onRetry={retry}
          />
        </div>
        <FooterLayout notices={footerNotices} />
      </body>
    </html>
  );
}
