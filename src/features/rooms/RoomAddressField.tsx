'use client';

import { useEffect, useRef } from 'react';

export function RoomAddressField({ roomUrl, label }: { roomUrl: string; label: string }) {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.select();
  }, []);

  return <input ref={inputRef} readOnly value={roomUrl} aria-label={label} className="block min-h-11 w-full border-2 border-ink bg-white px-3" />;
}
