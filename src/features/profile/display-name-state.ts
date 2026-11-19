import type { TrainerNameError } from '@/domain/trainer-name';

export type DisplayNameState = { error: TrainerNameError | null; saved: boolean; submittedName: string | null; attempt: number };

export const initialDisplayNameState: DisplayNameState = { error: null, saved: false, submittedName: null, attempt: 0 };
