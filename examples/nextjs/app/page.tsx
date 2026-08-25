import { SlyxUpProvider } from '@slyxup/react';
import { SignIn } from '@slyxup/ui';

export default function Page() {
  return (
    <SlyxUpProvider publishableKey={process.env.NEXT_PUBLIC_SLYXUP_PUBLISHABLE_KEY!}>
      <main style={{ display: 'grid', placeItems: 'center', minHeight: '100vh', background: '#f7f7fa' }}>
        <SignIn />
      </main>
    </SlyxUpProvider>
  );
}
