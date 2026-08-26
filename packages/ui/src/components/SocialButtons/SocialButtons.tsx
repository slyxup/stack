import { useAuth } from '@slyxup/react';
import { GitHubIcon, GoogleIcon } from '../../icons';
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
  const { client } = useAuth() as unknown as {
    client?: { apiUrl?: string };
  };
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
              window.location.href = `${base}/${p}`;
            }}
          >
            <Icon /> {label}
          </button>
        );
      })}
    </div>
  );
}
