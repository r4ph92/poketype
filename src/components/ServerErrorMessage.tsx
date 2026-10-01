'use client';

import { useEffect, useRef } from 'react';
import { NoticePanel } from './pixel/NoticePanel';
import { PageMain } from './pixel/PageMain';
import { PixelButton } from './pixel/PixelButton';

type ServerErrorMessageProps = { heading: string; message: string; retryLabel: string; onRetry: () => void };

export function ServerErrorMessage({ heading, message, retryLabel, onRetry }: ServerErrorMessageProps) {
  const headingRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    headingRef.current?.focus();
  }, []);

  return (
    <PageMain>
      <NoticePanel
        titleId="server-error-title"
        title={heading}
        message={message}
        tone="error"
        headingRef={headingRef}
        action={<PixelButton onClick={onRetry}>{retryLabel}</PixelButton>}
      />
    </PageMain>
  );
}
