'use client';

import { useFormStatus } from 'react-dom';
import { PixelButton } from '@/components/pixel/PixelButton';

export function CreateRoomButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <PixelButton type="submit" pending={pending}>
      {label}
    </PixelButton>
  );
}
