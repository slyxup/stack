# Getting Started — SlyxUp Auth

## 1. Create a project

```bash
npx @slyxup/cli login
npx @slyxup/cli project create "My App" --slug my-app
npx @slyxup/cli keys create --project-id <id> --type publishable
```

Copy `pk_test_...` to your app's `.env.local`:

```
NEXT_PUBLIC_SLYXUP_PUBLISHABLE_KEY=pk_test_xxx
NEXT_PUBLIC_SLYXUP_API_URL=https://auth.slyxup.online
```

## 2. Install SDKs

```bash
npm install @slyxup/react @slyxup/ui
# Next.js: npm install @slyxup/nextjs
```

## 3. Use the provider

```tsx
import { SlyxUpProvider } from '@slyxup/react';
import { SignIn } from '@slyxup/ui';

<SlyxUpProvider publishableKey={process.env.NEXT_PUBLIC_SLYXUP_PUBLISHABLE_KEY!}>
  <SignIn />
</SlyxUpProvider>
```

## 4. Read the session (client)

```tsx
import { useUser, useAuth } from '@slyxup/react';

const { user } = useUser();
const { signOut } = useAuth();
```

## 5. Read the session (server — Next.js)

```tsx
import { currentUser } from '@slyxup/nextjs/server';

export default async function Page() {
  const user = await currentUser();
  if (!user) redirect('/sign-in');
  return <p>Hello {user.email}</p>;
}
```

See `examples/nextjs` and `examples/react` for runnable demos.
