# @slyxup/ui

Prebuilt, themeable auth components — sign-in cards, user button, password flows. Built on [`@slyxup/react`](../react). **Zero CSS dependencies** — styles are self-contained and injected once.

## Install

```bash
npm install @slyxup/ui @slyxup/react @slyxup/core
```

> Peer: `react ^18 || ^19`

## Setup

Inject the stylesheet once at your app root:

```tsx
import { SlyxUpProvider } from '@slyxup/react';
import { SlyxUpStyles } from '@slyxup/ui';

<SlyxUpProvider publishableKey="pk_test_xxx">
  <SlyxUpStyles />
  <App />
</SlyxUpProvider>
```

(Components also auto-inject on first mount if you skip this.)

## Components

### `<SignIn />` / `<SignUp />`

```tsx
import { SignIn, SignUp } from '@slyxup/ui';

<SignIn
  social                       // show Google/GitHub buttons (default true)
  onSuccess={() => router.push('/dashboard')}
  onSignUpClick={() => setMode('sign-up')}
/>

<SignUp onSignInClick={() => setMode('sign-in')} />
```

### `<UserButton />` — avatar + dropdown

```tsx
import { UserButton } from '@slyxup/ui';

<header>
  <UserButton />   {/* gradient initials avatar → menu: profile, sign out */}
</header>
```

Renders nothing until loaded; shows initials or avatar image.

### `<UserProfile />`

Edit first/last name and avatar URL with inline save confirmation.

### Password flows

```tsx
<ForgotPassword onBackToSignIn={...} />
<ResetPassword token={searchParams.token} onSuccess={...} />
<EmailVerification token={searchParams.token} />
```

`ForgotPassword` always shows a neutral success state (never reveals whether an account exists). `EmailVerification` auto-verifies from the emailed token and offers a resend form otherwise.

### `<SocialButtons />`

```tsx
<SocialButtons providers={['google', 'github']} basePath="/v1/oauth" />
```

Redirects to the hosted OAuth flow.

## Theming

Override CSS variables on any wrapper — light/dark is automatic via `prefers-color-scheme`, force dark with `slyxup-dark`, force light with `slyxup-light`.

```css
.slyxup-root {
  --slx-accent: #e8562a;        /* your brand color */
  --slx-radius: 16px;
  --slx-font: "Inter", sans-serif;
}
```

| Variable | Default (light) |
|---|---|
| `--slx-accent` | `#5b5bd6` |
| `--slx-bg` | `#ffffff` |
| `--slx-ink` | `#16161d` |
| `--slx-muted` | `#6f6f7b` |
| `--slx-border` | `#e6e6ec` |
| `--slx-danger` | `#d64550` |
| `--slx-radius` | `12px` |

Accessibility built in: labeled fields, visible focus rings, `prefers-reduced-motion` respected, semantic buttons throughout.

## License

MIT © [SlyxUp](https://github.com/slyxup/stack)
