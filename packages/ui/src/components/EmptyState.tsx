import type { ReactNode } from 'react';
import { injectStyles } from '../styles';

export interface EmptyStateProps {
  title: string;
  desc?: string;
  action?: ReactNode;
  icon?: ReactNode;
}

/** Friendly placeholder for empty lists, states and results. */
export function EmptyState({ title, desc, action, icon }: EmptyStateProps) {
  injectStyles();
  return (
    <div className="slx-empty">
      {icon && (
        <div className="slx-empty-icon" aria-hidden="true">
          {icon}
        </div>
      )}
      <p className="slx-empty-title">{title}</p>
      {desc && <p className="slx-empty-desc">{desc}</p>}
      {action && <div className="slx-empty-action">{action}</div>}
    </div>
  );
}
