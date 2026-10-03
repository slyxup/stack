import { useState } from 'react';
import { GitHubIcon, GoogleIcon } from '../../icons';
import { useAuth } from '../../react/hooks/useAuth';
import { injectStyles } from '../../styles';

export interface SocialButtonsProps {
  /** Show only these providers. Default: both */
  providers?: Array<'google' | 'github'>;
  /** OAuth start path base. Default: `<apiUrl>/v1/oauth` from the provider client */
  basePath?: string;
}

const META = {
  google: { label: 'Continue with Google', Icon: GoogleIcon },
  github: { label: 'Continue with GitHub', Icon: GitHubIcon },
} as const;

/** Provider buttons that redirect to hosted OAuth start. */
export function SocialButtons({
  providers = ['google', 'github'],
  basePath,
}: SocialButtonsProps) {
  injectStyles();
  const [error, setError] = useState<string | null>(null);
  const { client } = useAuth();
  const base = basePath ?? `${client?.apiUrl ?? ''}/v1/oauth`;
  return (
    <div className="slx-social">
      {providers.map((p) => {
        const { label, Icon } = META[p];
        return (
          <button
            key={p}
            type="button"
            className="slx-social-btn"
            onClick={() => {
              if (basePath && base !== `${client.apiUrl}/v1/oauth`) {
                setError(
                  'Configure the provider apiUrl for custom OAuth servers'
                );
                return;
              }
              void client.auth
                .startOAuth(p)
                .catch((error: unknown) =>
                  setError(
                    error instanceof Error
                      ? error.message
                      : 'Unable to start sign-in'
                  )
                );
            }}
          >
            <Icon /> {label}
          </button>
        );
      })}
      {error && (
        <p role="alert" className="slx-error-text">
          {error}
        </p>
      )}
    </div>
  );
}
