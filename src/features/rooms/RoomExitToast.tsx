'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { Toast } from '@/components/pixel/Toast';

// Says why the player was sent home from a room. The flag is read once and dropped from the address,
// so a reload or a shared link never shows it again.
export function RoomExitToast({ message, dismissLabel, action }: { message: string; dismissLabel: string; action?: ReactNode }) {
  const [isOpen, setIsOpen] = useState(true);
  useEffect(() => {
    window.history.replaceState(window.history.state, '', '/play');
  }, []);
  return <Toast isOpen={isOpen} message={message} dismissLabel={dismissLabel} onDismiss={() => setIsOpen(false)} action={action} />;
}
