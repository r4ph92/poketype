import { gameConfig } from '@/config/game';

export type TrainerNameError = 'required' | 'length' | 'characters';

export type TrainerNameResult = { ok: true; name: string } | { ok: false; error: TrainerNameError };

const allowedCharacters = /^[\p{L}\p{Nd}][\p{L}\p{M}\p{Nd} -]*$/u;
const invisibleCharacter = /\p{Default_Ignorable_Code_Point}/u;
const letterOrDigit = /[\p{L}\p{Nd}]/gu;

export function validateTrainerName(submitted: FormDataEntryValue | null): TrainerNameResult {
  if (typeof submitted !== 'string') return { ok: false, error: 'required' };
  const name = submitted.normalize('NFC').trim();
  if (name === '') return { ok: false, error: 'required' };
  if (invisibleCharacter.test(name) || !allowedCharacters.test(name)) return { ok: false, error: 'characters' };
  const { minLength, maxLength } = gameConfig.trainerName;
  const visibleLetters = name.match(letterOrDigit)?.length ?? 0;
  if (visibleLetters < minLength || [...name].length > maxLength) return { ok: false, error: 'length' };
  return { ok: true, name };
}
