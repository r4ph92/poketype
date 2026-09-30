import type { TrainerNameError } from '@/domain/trainer-name';

export type GuestEntryState = { error: TrainerNameError | null; submittedName: string; attempt: number };

export const initialGuestEntryState: GuestEntryState = { error: null, submittedName: '', attempt: 0 };
