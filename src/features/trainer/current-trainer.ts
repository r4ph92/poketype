import 'server-only';
import { redirect } from 'next/navigation';
import { cache } from 'react';
import { defaultTrainerAvatar } from '@/assets/trainers';
import { chooseStarterPath, hubDestination } from '@/domain/starter-destination';
import { partnerOf } from '@/domain/trainer-profile';
import { readTrainerAvatar } from '@/server/accounts/trainer-avatar';
import { database } from '@/server/db/client';
import { findCurrentSession } from '@/server/sessions/current-session';
import { loadTrainerProfile } from '@/server/trainer/trainer-profile';
import type { TrainerHubView } from './trainer-hub-view';

// Cached per request, so the hub layout's starter check and the page share one read.
export const findCurrentTrainer = cache(async (): Promise<TrainerHubView> => {
  const session = await findCurrentSession();
  if (!session) redirect('/');
  const profile = await loadTrainerProfile(database, session.guest.id);
  const partner = partnerOf(profile.collection);
  if (!partner) redirect(chooseStarterPath(hubDestination));
  const avatar = session.account ? await readTrainerAvatar(session.account.id) : null;
  return { profile, partner, avatar: avatar ?? defaultTrainerAvatar, canChooseTrainer: session.account !== null };
});
