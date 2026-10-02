import type { ReactNode } from 'react';
import { findCurrentTrainer } from '@/features/trainer/current-trainer';

// The hub shows the player's partner everywhere, so it opens only once a starter is chosen; the starter screen lives outside this group.
export default async function HubLayout({ children }: { children: ReactNode }) {
  await findCurrentTrainer();
  return children;
}
