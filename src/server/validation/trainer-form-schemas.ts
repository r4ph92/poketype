import { z } from 'zod';
import { gameConfig } from '@/config/game';

const shortFormValue = z.string().max(gameConfig.formFieldMaxLength);

export const trainerAvatarFormSchema = z.object({ avatar: shortFormValue });

export const starterFormSchema = z.object({ starter: shortFormValue, next: shortFormValue.optional() });

export const partnerFormSchema = z.object({ pokemonId: shortFormValue });

export const evolutionItemFormSchema = z.object({ pokemonId: shortFormValue, item: shortFormValue });

export const releaseRequestSchema = z.object({ pokemonId: shortFormValue, isLegendaryConfirmed: z.boolean() });
