import { z } from 'zod';
import { gameConfig } from '@/config/game';

const shortFormValue = z.string().max(gameConfig.formFieldMaxLength);

export const localeFormSchema = z.object({ locale: shortFormValue, returnTo: z.string().optional() });

export const consentFormSchema = z.object({ choice: shortFormValue, preferences: shortFormValue.optional() });
