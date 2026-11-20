import { z } from 'zod';
import { gameConfig } from '@/config/game';

const shortFormValue = z.string().max(gameConfig.formFieldMaxLength);

// The text fields carry no length cap here: their rules answer with a French message, which a schema refusal could not.
export const guestEntryFormSchema = z.object({
  trainerName: z.string(),
  intent: shortFormValue.optional(),
  returnRoomId: shortFormValue.optional(),
  inviteToken: shortFormValue.optional(),
});

export const signUpFormSchema = z.object({ username: z.string(), password: z.string(), confirmation: z.string() });

export const logInFormSchema = z.object({ username: z.string(), password: z.string(), returnRoomId: shortFormValue.optional(), inviteToken: shortFormValue.optional() });

// Like the guest entry, the name carries no length cap here so that the rule can answer with its own message.
export const displayNameFormSchema = z.object({ displayName: z.string() });
