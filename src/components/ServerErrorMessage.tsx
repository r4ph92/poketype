'use client';

import { useEffect, useRef } from 'react';

type ServerErrorMessageProps = { heading: string; message: string; retryLabel: string; onRetry: () => void };

export function ServerErrorMessage({ heading, message, retryLabel, onRetry }: ServerErrorMessageProps) {
  const headingRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    headingRef.current?.focus();
  }, []);

  return (
    <main className="mx-auto max-w-2xl px-4 py-12">
      <h1 ref={headingRef} tabIndex={-1} className="text-3xl font-bold">
        {heading}
      </h1>
      <p className="mt-4 text-lg">{message}</p>
      <button type="button" onClick={onRetry} className="mt-6 min-h-11 border-4 border-ink bg-gold px-6 font-bold">
        {retryLabel}
      </button>
    </main>
  );
}
