import { SlyxUpProvider, useAuth, useUser } from '@slyxup/react';
import {
  SignIn,
  SignUp,
  SlyxUpStyles,
  UserButton,
  UserProfile,
} from '@slyxup/ui';
import { useState } from 'react';

function Demo() {
  const { isSignedIn, isLoaded } = useAuth();
  const { user } = useUser();
  const [mode, setMode] = useState<'in' | 'up'>('in');
  const [profileOpen, setProfileOpen] = useState(false);

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

      <button
        type="button"
        onClick={() => setProfileOpen(true)}
        style={{
          font: 'inherit',
          fontSize: 13.5,
          fontWeight: 600,
          background: '#16161d',
          color: '#fff',
          border: 'none',
          borderRadius: 10,
          padding: '10px 16px',
          cursor: 'pointer',
          marginTop: 16,
        }}
      >
        Account settings
      </button>
      <p style={{ color: '#9a9aa6', fontSize: 12.5, marginTop: 10 }}>
        Opens the Clerk-style <code>&lt;UserProfile /&gt;</code> — edit profile,
        change password, manage sessions, delete account.
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

      {profileOpen && (
        <UserProfile
          onClose={() => setProfileOpen(false)}
          onDeleted={() => window.location.reload()}
        />
      )}
    </div>
  );
}

export default function App() {
  return (
    <SlyxUpProvider
      publishableKey={
        import.meta.env.VITE_SLYXUP_PUBLISHABLE_KEY ?? 'pk_test_demo'
      }
      apiUrl={import.meta.env.VITE_SLYXUP_API_URL}
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
