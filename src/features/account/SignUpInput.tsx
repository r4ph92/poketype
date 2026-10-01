import type { Ref } from 'react';
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
    <div className="space-y-1">
      <label htmlFor={id} className="block font-bold">
        {text.label}
      </label>
      <input
        ref={inputRef}
        id={id}
        name={field}
        {...settings}
        autoCapitalize="none"
        spellCheck={false}
        defaultValue={defaultValue}
        aria-describedby={describedBy || undefined}
        aria-invalid={error !== undefined}
        className="block min-h-11 w-full border-2 border-ink bg-white px-3 text-lg"
      />
      {text.hint && (
        <p id={`${id}-hint`} className="text-sm">
          {text.hint}
        </p>
      )}
      {error && (
        <p key={attempt} id={`${id}-error`} role="alert" className="font-bold text-error">
          {error}
        </p>
      )}
    </div>
  );
}
