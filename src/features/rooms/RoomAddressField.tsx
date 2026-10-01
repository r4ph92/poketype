'use client';

import { useEffect, useRef } from 'react';
import { PixelInput } from '@/components/pixel/FormField';

export function RoomAddressField({ roomUrl, label }: { roomUrl: string; label: string }) {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.select();
  }, []);

  return <PixelInput ref={inputRef} readOnly value={roomUrl} aria-label={label} />;
}
