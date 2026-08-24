import { GitHubIcon, GoogleIcon } from '../../icons';

export interface SocialButtonsProps {
  /** Show only these providers. Default: both */
  providers?: Array<'google' | 'github'>;
  /** OAuth start path base (default /v1/oauth) */
  basePath?: string;
}

const META = {
  google: { label: 'Continue with Google', Icon: GoogleIcon },
  github: { label: 'Continue with GitHub', Icon: GitHubIcon },
} as const;

/** Provider buttons that redirect to hosted OAuth start. */
export function SocialButtons({
  providers = ['google', 'github'],
  basePath = '/v1/oauth',
}: SocialButtonsProps) {
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
              window.location.href = `${basePath}/${p}`;
            }}
          >
            <Icon /> {label}
          </button>
        );
      })}
    </div>
  );
}
