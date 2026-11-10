import { z } from 'zod';
import { gameConfig } from '@/config/game';

const shortFormValue = z.string().max(gameConfig.formFieldMaxLength);

export const letGoFormSchema = z.object({ encounterId: shortFormValue });

export const throwBallFormSchema = z.object({ encounterId: shortFormValue, throwNumber: shortFormValue });
