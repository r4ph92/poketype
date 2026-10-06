'use client';

import { useFormStatus } from 'react-dom';
import { PixelButton } from '@/components/pixel/PixelButton';

export function ConsentChoiceButton({ choice, label }: { choice: 'accept' | 'refuse' | 'save'; label: string }) {
  const { pending } = useFormStatus();
  return (
    <PixelButton type="submit" variant="secondary" pending={pending} submission={{ name: 'choice', value: choice }}>
      {label}
    </PixelButton>
  );
}
