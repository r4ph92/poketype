import { z } from 'zod';
import { gameConfig } from '@/config/game';

const shortFormValue = z.string().max(gameConfig.formFieldMaxLength);

export const purchaseFormSchema = z.object({ item: shortFormValue, quantity: shortFormValue, purchaseKey: shortFormValue });
