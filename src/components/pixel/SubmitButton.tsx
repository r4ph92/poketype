'use client';

import { useFormStatus } from 'react-dom';
import { PixelButton, type ButtonVariant } from './PixelButton';

export function SubmitButton({ label, variant = 'primary' }: { label: string; variant?: ButtonVariant }) {
  const { pending } = useFormStatus();
  return (
    <PixelButton type="submit" variant={variant} pending={pending}>
      {label}
    </PixelButton>
  );
}
