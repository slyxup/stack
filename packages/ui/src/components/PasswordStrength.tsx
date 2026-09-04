import { injectStyles } from '../styles';

export type StrengthScore = 0 | 1 | 2 | 3 | 4;

const LABELS = ['Too weak', 'Weak', 'Okay', 'Good', 'Strong'] as const;

/** Score a password 0–4 by length + character variety. Pure function, testable. */
export function passwordScore(pw: string): StrengthScore {
  if (!pw) return 0;
  let score = 0;
  if (pw.length >= 8) score += 1;
  if (pw.length >= 12) score += 1;
  if (/[a-z]/.test(pw) && /[A-Z]/.test(pw)) score += 1;
  if (/\d/.test(pw)) score += 1;
  if (/[^a-zA-Z0-9]/.test(pw)) score += 1;
  return Math.min(4, score) as StrengthScore;
}

export interface PasswordStrengthProps {
  password: string;
  /** Show the text label next to the meter (default true). */
  showLabel?: boolean;
}

/** 5-segment strength meter. Pair with a password field. */
export function PasswordStrength({
  password,
  showLabel = true,
}: PasswordStrengthProps) {
  injectStyles();
  const score = passwordScore(password);
  const tone =
    score <= 1
      ? 'var(--slx-danger)'
      : score === 2
        ? '#d97706'
        : score === 3
          ? 'var(--slx-accent)'
          : 'var(--slx-success)';
  return (
    <div className="slx-meter-wrap" aria-live="polite">
      <div
        className="slx-meter"
        role="img"
        aria-label={`Password strength: ${LABELS[score]} (${score} of 4)`}
      >
        {[0, 1, 2, 3].map((i) => (
          <i
            key={i}
            className={i < score ? 'on' : undefined}
            style={i < score ? { background: tone } : undefined}
          />
        ))}
      </div>
      {showLabel && password && (
        <span className="slx-meter-label" style={{ color: tone }}>
          {LABELS[score]}
        </span>
      )}
    </div>
  );
}
