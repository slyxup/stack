'use client';

import type { CheckoutResult } from '@slyxup/core';
import type { CSSProperties, ReactNode } from 'react';
import { useScopedTheme } from '../../lib/scoped-theme';
import {
  type CheckoutHookOptions,
  useCheckout,
} from '../../react/hooks/useBilling';
import { injectStyles } from '../../styles';
import type { SlyxUpTheme } from '../../theme';

export interface CheckoutButtonProps {
  planId: string;
  /** Return target carried through payment → success page. Without it the
   *  buyer lands on the SlyxUp dashboard after paying. */
  origin?: string;
  openIn?: '_blank' | '_self';
  apiUrl?: string;
  disabled?: boolean;
  onSuccess?: (result: CheckoutResult) => void;
  onError?: (error: Error) => void;
  /** Per-component theme (accent, mode, radius…) — scoped, never global. */
  theme?: SlyxUpTheme;
  style?: CSSProperties;
  className?: string;
  children?: ReactNode;
}

/**
 * One-line subscribe button: loading + error states, Paddle overlay/hosted
 * checkout, and return-to-platform — wired. For full control use
 * useCheckout() + your own button.
 */
export function CheckoutButton({
  planId,
  origin,
  openIn,
  apiUrl,
  disabled,
  onSuccess,
  onError,
  theme,
  style,
  className,
  children,
}: CheckoutButtonProps) {
  injectStyles();
  const ref = useScopedTheme<HTMLButtonElement>(theme);
  const { checkout, loading, error } = useCheckout(apiUrl);

  const opts: CheckoutHookOptions | undefined =
    origin || openIn ? { origin, openIn } : undefined;

  return (
    <>
      <button
        ref={ref}
        type="button"
        className={`slx-btn ${className ?? ''}`}
        style={style}
        disabled={disabled || loading}
        onClick={() => {
          void checkout(planId, opts).then(
            (result) => onSuccess?.(result),
            (e: unknown) =>
              onError?.(e instanceof Error ? e : new Error(String(e)))
          );
        }}
      >
        {loading ? 'Opening checkout…' : (children ?? 'Subscribe')}
      </button>
      {error && !loading && (
        <p
          style={{
            fontSize: 12.5,
            color: 'var(--slx-danger)',
            marginTop: 8,
          }}
        >
          {error}
        </p>
      )}
    </>
  );
}
