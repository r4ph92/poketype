'use client';

import { useFormStatus } from 'react-dom';

export function CreateRoomButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      aria-disabled={pending}
      onClick={(event) => {
        if (pending) event.preventDefault();
      }}
      className="min-h-11 border-4 border-ink bg-gold px-6 font-bold"
    >
      {label}
    </button>
  );
}
