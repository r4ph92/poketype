import type { TrainerAvatarId } from '@/assets/trainers';
import type { OwnedPokemon, TrainerProfile } from '@/domain/trainer-profile';

// What every hub page knows about the signed-in trainer; the hub layout guarantees a partner.
export type TrainerHubView = { profile: TrainerProfile; partner: OwnedPokemon; avatar: TrainerAvatarId; canChooseTrainer: boolean };

export function caughtDexesOf(profile: TrainerProfile): Set<number> {
  return new Set(profile.caughtDexes);
}
