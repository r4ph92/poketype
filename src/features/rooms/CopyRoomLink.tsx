'use client';

import { useEffect, useRef, useState } from 'react';
import { gameConfig } from '@/config/game';

type CopyRoomLinkProps = {
  copyLabel: string;
  copiedMessage: string;
  copyFailedMessage: string;
  linkLabel: string;
};

type CopyOutcome = 'idle' | 'copied' | 'failed';

export function CopyRoomLink({ copyLabel, copiedMessage, copyFailedMessage, linkLabel }: CopyRoomLinkProps) {
  const [outcome, setOutcome] = useState<CopyOutcome>('idle');
  const [roomUrl, setRoomUrl] = useState('');
  const fallbackInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (outcome === 'failed') fallbackInputRef.current?.select();
    if (outcome !== 'copied') return;
    const timer = setTimeout(() => setOutcome('idle'), gameConfig.copyConfirmationSeconds * 1000);
    return () => clearTimeout(timer);
  }, [outcome]);

  async function copyLink(): Promise<void> {
    const url = window.location.origin + window.location.pathname;
    setRoomUrl(url);
    try {
      await navigator.clipboard.writeText(url);
      setOutcome('copied');
    } catch {
      setOutcome('failed');
    }
  }

  return (
    <div className="mt-6 space-y-3">
      <button type="button" onClick={copyLink} className="min-h-11 border-4 border-ink bg-gold px-6 font-bold">
        {copyLabel}
      </button>
      <p role="status" className="font-bold">
        {outcome === 'copied' && copiedMessage}
        {outcome === 'failed' && copyFailedMessage}
      </p>
      {outcome === 'failed' && (
        <input
          ref={fallbackInputRef}
          readOnly
          value={roomUrl}
          aria-label={linkLabel}
          className="block min-h-11 w-full border-2 border-ink bg-white px-3"
        />
      )}
    </div>
  );
}
