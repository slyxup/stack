'use client';

import { AdminPanel } from '@slyxup/ui';

const sk = process.env.NEXT_PUBLIC_SLYXUP_SECRET_KEY || '';
const apiUrl = process.env.NEXT_PUBLIC_SLYXUP_API_URL || 'https://auth.slyxup.online';

export default function AdminPage() {
  if (!sk) {
    return (
      <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', padding: 24 }}>
        <div style={{ textAlign: 'center', maxWidth: 460 }}>
          <h1 style={{ fontSize: 20, fontWeight: 700 }}>Admin Panel</h1>
          <p style={{ color: '#71717a', marginTop: 8 }}>
            Set <code>NEXT_PUBLIC_SLYXUP_SECRET_KEY</code> in your <code>.env.local</code>.
          </p>
          <pre style={{ background: '#18181b', border: '1px solid #27272a', padding: 16, borderRadius: 10, marginTop: 16, textAlign: 'left', fontSize: 13, color: '#a1a1aa' }}>
{`NEXT_PUBLIC_SLYXUP_SECRET_KEY=sk_test_xxx
NEXT_PUBLIC_SLYXUP_API_URL=https://auth.slyxup.online`}
          </pre>
        </div>
      </div>
    );
  }

  return <AdminPanel secretKey={sk} apiUrl={apiUrl} />;
}
