import type { FieldText } from './sign-up-form-text';
import type { LogInErrors, LogInField, LogInFormError } from './log-in-state';

export type LogInFormText = {
  fields: Record<LogInField, FieldText>;
  errors: { required: Record<LogInField, string>; form: Record<LogInFormError, string> };
  submit: string;
};

export type LogInErrorTexts = Partial<Record<LogInField | 'form', string>>;

export function logInErrorTexts(errors: LogInErrors, messages: LogInFormText['errors']): LogInErrorTexts {
  return {
    username: errors.username && messages.required.username,
    password: errors.password && messages.required.password,
    form: errors.form && messages.form[errors.form],
  };
}
