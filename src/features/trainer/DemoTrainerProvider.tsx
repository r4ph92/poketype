'use client';

import { createContext, useContext, useState, type ReactNode } from 'react';
import { defaultTrainerAvatar, type TrainerAvatarId } from '@/assets/trainers';
import { demoProfile, type DemoPokemon } from './demo-profile';

const DemoTrainerContext = createContext<{ collection: readonly DemoPokemon[]; avatar: TrainerAvatarId; canChooseTrainer: boolean; equipped: DemoPokemon; equip: (pokemon: DemoPokemon) => void } | null>(null);

// A shared layout keeps this UI-only selection alive across the trainer tabs.
export function DemoTrainerProvider({ children, avatar = defaultTrainerAvatar, canChooseTrainer = false }: { children: ReactNode; avatar?: TrainerAvatarId; canChooseTrainer?: boolean }) {
  const [equipped, equip] = useState<DemoPokemon>(demoProfile.collection.find((pokemon) => pokemon.dex === demoProfile.equippedDex)!);
  return <DemoTrainerContext.Provider value={{ collection: demoProfile.collection, equipped, equip, avatar, canChooseTrainer }}>{children}</DemoTrainerContext.Provider>;
}

export function useDemoTrainer() {
  const trainer = useContext(DemoTrainerContext);
  if (!trainer) throw new Error('Demo trainer views require DemoTrainerProvider');
  return trainer;
}
