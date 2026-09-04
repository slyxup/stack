import { useState } from 'react';
import { EyeIcon, EyeOffIcon } from '../icons';

export interface PasswordFieldProps {
  id: string;
  value: string;
  onChange: (value: string) => void;
  autoComplete?: string;
  placeholder?: string;
  required?: boolean;
  minLength?: number;
  /** Show the reveal button (default true). */
  showToggle?: boolean;
}

/** Password input with a reveal toggle. Drops into any `slx-field`. */
export function PasswordField({
  id,
  value,
  onChange,
  autoComplete = 'current-password',
  placeholder = '••••••••',
  required,
  minLength,
  showToggle = true,
}: PasswordFieldProps) {
  const [show, setShow] = useState(false);
  return (
    <div className="slx-input-wrap">
      <input
        id={id}
        className="slx-input"
        type={show ? 'text' : 'password'}
        autoComplete={autoComplete}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        minLength={minLength}
      />
      {showToggle && (
        <button
          type="button"
          className="slx-pw-toggle"
          onClick={() => setShow((s) => !s)}
          aria-label={show ? 'Hide password' : 'Show password'}
          aria-pressed={show}
          tabIndex={0}
        >
          {show ? <EyeOffIcon /> : <EyeIcon />}
        </button>
      )}
    </div>
  );
}
