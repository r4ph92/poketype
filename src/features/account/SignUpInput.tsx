import type { Ref } from 'react';
import { FieldError, FieldHint, FieldLabel, PixelInput } from '@/components/pixel/FormField';
import type { FieldText } from './sign-up-form-text';
import type { SignUpField } from './sign-up-state';

export type InputSettings = { type: 'text' | 'password'; autoComplete: string; maxLength: number };

type SignUpInputProps = {
  field: SignUpField;
  settings: InputSettings;
  text: FieldText;
  error: string | undefined;
  attempt: number;
  defaultValue?: string;
  inputRef: Ref<HTMLInputElement>;
};

export function SignUpInput({ field, settings, text, error, attempt, defaultValue, inputRef }: SignUpInputProps) {
  const id = `signup-${field}`;
  const describedBy = [text.hint && `${id}-hint`, error && `${id}-error`].filter(Boolean).join(' ');
  return (
    <div className="grid gap-1">
      <FieldLabel htmlFor={id}>{text.label}</FieldLabel>
      <PixelInput
        ref={inputRef}
        id={id}
        name={field}
        {...settings}
        autoCapitalize="none"
        spellCheck={false}
        defaultValue={defaultValue}
        aria-describedby={describedBy || undefined}
        aria-invalid={error !== undefined}
      />
      {text.hint && <FieldHint id={`${id}-hint`}>{text.hint}</FieldHint>}
      {error && (
        <FieldError key={attempt} id={`${id}-error`}>
          {error}
        </FieldError>
      )}
    </div>
  );
}
