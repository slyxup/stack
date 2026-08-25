import { SlyxUpProvider, useAuth, useUser } from '@slyxup/react';
import { SignIn, SignUp, SlyxUpStyles, UserButton } from '@slyxup/ui';
import { useState } from 'react';

function Demo() {
  const { isSignedIn, isLoaded } = useAuth();
  const { user } = useUser();
  const [mode, setMode] = useState<'in' | 'up'>('in');

  if (!isLoaded)
    return (
      <p style={{ textAlign: 'center', padding: 40, color: '#6f6f7b' }}>
        Loading…
      </p>
    );

  if (!isSignedIn) {
    return (
      <div style={{ maxWidth: 380, margin: '40px auto' }}>
        {mode === 'in' ? (
          <SignIn onSignUpClick={() => setMode('up')} />
        ) : (
          <SignUp onSignInClick={() => setMode('in')} />
        )}
      </div>
    );
  }

  return (
    <div
      style={{
        maxWidth: 560,
        margin: '40px auto',
        background: '#fff',
        border: '1px solid #e6e6ec',
        borderRadius: 16,
        padding: 28,
      }}
    >
      <h1 style={{ fontSize: 20, fontWeight: 700 }}>
        Hello, {user?.firstName ?? user?.email}
      </h1>
      <p style={{ color: '#6f6f7b', fontSize: 14 }}>
        {user?.email} · React SPA demo
      </p>
      <pre
        style={{
          background: '#f7f7fa',
          padding: 12,
          borderRadius: 10,
          marginTop: 16,
          fontSize: 12,
          overflow: 'auto',
        }}
      >
        {JSON.stringify(user, null, 2)}
      </pre>
    </div>
  );
}

export default function App() {
  return (
    <SlyxUpProvider
      publishableKey={
        import.meta.env.VITE_SLYXUP_PUBLISHABLE_KEY ?? 'pk_test_demo'
      }
    >
      <SlyxUpStyles />
      <header
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '14px 24px',
          borderBottom: '1px solid #e6e6ec',
          background: '#f7f7fa',
        }}
      >
        <strong>◆ SlyxUp React Demo</strong>
        <UserButton />
      </header>
      <Demo />
    </SlyxUpProvider>
  );
}
