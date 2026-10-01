export type LogInField = 'username' | 'password';

export const logInFields: readonly LogInField[] = ['username', 'password'];

export type LogInFormError = 'invalidCredentials' | 'throttled' | 'busy';

export type LogInErrors = Partial<Record<LogInField, 'required'>> & { form?: LogInFormError };

export type LogInState = { errors: LogInErrors; submittedUsername: string; attempt: number };

export const initialLogInState: LogInState = { errors: {}, submittedUsername: '', attempt: 0 };
