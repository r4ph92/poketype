export const trainerAvatars = ['red', 'brendan', 'ruby', 'leaf', 'may', 'sapphire'] as const;
export type TrainerAvatarId = (typeof trainerAvatars)[number];
export const defaultTrainerAvatar: TrainerAvatarId = 'red';
export function isTrainerAvatar(value: unknown): value is TrainerAvatarId {
  return typeof value === 'string' && trainerAvatars.some((avatar) => avatar === value);
}
// Unmodified 144×32 indexed-color sheets, nine 16×32 frames. The game treats
// palette zero as transparent; OverworldTrainer applies that rule while drawing.
export const trainerSpriteSource = {
  repository: 'https://github.com/pret/pokeemerald/tree/master/graphics/object_events/pics/people',
  paths: { red: 'red.png', leaf: 'leaf.png', brendan: 'brendan/walking.png', may: 'may/walking.png', ruby: 'ruby_sapphire_brendan/walking.png', sapphire: 'ruby_sapphire_may/walking.png' },
  rights: 'Official game artwork; Nintendo / Game Freak / The Pokémon Company. No asset license granted.',
};
