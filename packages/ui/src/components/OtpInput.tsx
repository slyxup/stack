import { useRef, useState } from 'react';
import { injectStyles } from '../styles';

export interface OtpInputProps {
  /** Number of boxes (default 6). */
  length?: number;
  /** Controlled value (digits only). Omit for uncontrolled. */
  value?: string;
  onChange?: (value: string) => void;
  /** Fires once every box is filled. */
  onComplete?: (value: string) => void;
  autoFocus?: boolean;
  disabled?: boolean;
  label?: string;
}

/** One-time-code input — authenticator codes, email verification. Handles paste + backspace navigation. */
export function OtpInput({
  length = 6,
  value,
  onChange,
  onComplete,
  autoFocus,
  disabled,
  label = 'Enter the code',
}: OtpInputProps) {
  injectStyles();
  const [inner, setInner] = useState('');
  const refs = useRef<Array<HTMLInputElement | null>>([]);
  const current = (value ?? inner).replace(/\D/g, '').slice(0, length);

  function commit(next: string) {
    const digits = next.replace(/\D/g, '').slice(0, length);
    if (value === undefined) setInner(digits);
    onChange?.(digits);
    if (digits.length === length) onComplete?.(digits);
  }

  function focusBox(i: number) {
    const el = refs.current[Math.max(0, Math.min(length - 1, i))];
    el?.focus();
    el?.select();
  }

  return (
    <div className="slx-otp-wrap">
      {label && (
        <p className="slx-label" style={{ marginBottom: 8 }}>
          {label}
        </p>
      )}
      <fieldset className="slx-otp">
        <legend className="slx-sr-only">{label}</legend>
        {Array.from({ length }, (_, i) => (
          <input
            // biome-ignore lint/suspicious/noArrayIndexKey: boxes are fixed-order, never reordered
            key={i}
            ref={(el) => {
              refs.current[i] = el;
            }}
            className="slx-input slx-otp-box"
            type="text"
            inputMode="numeric"
            autoComplete={i === 0 ? 'one-time-code' : 'off'}
            maxLength={1}
            pattern="[0-9]*"
            aria-label={`Digit ${i + 1}`}
            // biome-ignore lint/a11y/noAutofocus: intentional opt-in prop for code-entry UX
            autoFocus={autoFocus && i === 0}
            disabled={disabled}
            value={current[i] ?? ''}
            onChange={(e) => {
              const d = e.target.value.replace(/\D/g, '');
              if (!d) {
                commit(current.slice(0, i) + current.slice(i + 1));
                return;
              }
              const next = (
                current.slice(0, i) +
                d +
                current.slice(i + 1)
              ).slice(0, length);
              commit(next);
              if (i < length - 1) focusBox(i + 1);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Backspace' && !current[i] && i > 0) {
                e.preventDefault();
                commit(current.slice(0, i - 1) + current.slice(i));
                focusBox(i - 1);
              }
              if (e.key === 'ArrowLeft') focusBox(i - 1);
              if (e.key === 'ArrowRight') focusBox(i + 1);
            }}
            onPaste={(e) => {
              const text = e.clipboardData.getData('text');
              if (/\d/.test(text)) {
                e.preventDefault();
                commit(current.slice(0, i) + text);
                focusBox(
                  Math.min(length - 1, i + text.replace(/\D/g, '').length)
                );
              }
            }}
            onFocus={(e) => e.target.select()}
          />
        ))}
      </fieldset>
    </div>
  );
}
