# @slyxup/react

React bindings for SlyxUp Auth — provider, auth state, and typed hooks. Built on [`@slyxup/core`](../core).

## Install

```bash
npm install @slyxup/react @slyxup/core
```

> Peer: `react ^18 || ^19`

## Setup

Wrap your app once:

```tsx
import { SlyxUpProvider } from '@slyxup/react';

<SlyxUpProvider publishableKey="pk_test_xxx" apiUrl="https://auth.slyxup.online">
  <App />
</SlyxUpProvider>
```

| Prop | Required | Default |
|---|---|---|
| `publishableKey` | recommended | — |
| `apiUrl` | no | `https://auth.slyxup.online` |

## Hooks

### `useAuth()` — sign in / out / state

```tsx
const { isLoaded, isSignedIn, userId, signIn, signUp, signOut } = useAuth();

if (!isLoaded) return <Spinner />;
if (!isSignedIn) return <button onClick={() => signIn({ email, password })}>Sign in</button>;

await signUp({ email, password, firstName });  // auto signs in + refreshes state
await signOut();                              // clears session, updates state
```

### `useUser()` — full profile

```tsx
const { user, isSignedIn, reload } = useUser();
// user: { id, email, firstName, lastName, avatarUrl, emailVerified, ... }
<p>{user?.firstName}</p>
```

### `useSession()` — session metadata

```tsx
const { session, isLoaded } = useSession();
// session: { id, expiresAt }
```

State **auto-refreshes** every 5 minutes and after every auth action.

## Full example

```tsx
function Header() {
  const { isSignedIn, signOut } = useAuth();
  const { user } = useUser();

  if (!isSignedIn) return <a href="/sign-in">Sign in</a>;
  return (
    <div>
      <span>Hello, {user?.firstName ?? user?.email}</span>
      <button onClick={signOut}>Sign out</button>
    </div>
  );
}
```

## Prebuilt components

Skip writing your own UI: [`@slyxup/ui`](../ui) ships `<SignIn />`, `<SignUp />`, `<UserButton />` and more, built on these hooks.

## License

MIT © [SlyxUp](https://github.com/slyxup/stack)
