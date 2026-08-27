import { CodeBlock, CopyForLLM } from '../../copy';

const LLM = `# User Management
PATCH  /v1/user                  -> update profile { firstName, lastName, avatarUrl }
DELETE /v1/user                  -> delete account (cascades sessions)
POST   /v1/admin/users/:id/block -> block user + revoke all sessions
POST   /v1/admin/users/:id/role  -> set role ('user' | 'admin')
GET    /v1/admin/users           -> list users (admin only)

SDK:
const me = await client.users.me();
await client.users.update({ firstName: 'Ada' });
await client.users.delete();
`;

export default function Page() {
  return (
    <div>
      <div className="fw-head">
        <h1 className="h-doc">User Management</h1>
        <CopyForLLM content={LLM} />
      </div>
      <p className="prose-p">
        Profiles, blocking, and roles. Self-service endpoints need only a valid session; admin endpoints require the{' '}
        <code className="inl">admin</code> role.
      </p>

      <h2 className="h-sec">Current user</h2>
      <CodeBlock
        variants={{
          js: `const me = await slyxup.users.me();
// { id, email, firstName, lastName, avatarUrl, role, emailVerified, createdAt }`,
          react: `import { useUser } from '@slyxup/react';

const { user, isLoaded } = useUser();`,
          nextjs: `import { currentUser } from '@slyxup/nextjs/server';

const user = await currentUser(); // server-side, no waterfall`,
        }}
      />

      <h2 className="h-sec">Update profile</h2>
      <CodeBlock
        variants={{
          js: `await slyxup.users.update({
  firstName: 'Ada',
  lastName: 'Lovelace',
  avatarUrl: 'https://...',
});`,
          react: `const { user } = useUser();
// mutate + optimistic update via provider context:
await updateUser({ firstName: 'Ada' });`,
          nextjs: `'use server';
import { currentUser } from '@slyxup/nextjs/server';
import { SlyxupClient } from '@slyxup/core';

export async function updateProfile(fd: FormData) {
  const client = new SlyxupClient();
  await client.users.update({ firstName: fd.get('name') as string });
  revalidatePath('/settings');
}`,
        }}
      />

      <h2 className="h-sec">Delete account</h2>
      <CodeBlock
        variants={{
          js: `await slyxup.users.deleteAccount();
// hard delete, sessions cascade, cookie cleared`,
          react: `if (confirm('Delete your account? This cannot be undone.')) {
  await deleteAccount();
}`,
          nextjs: `'use server';
import { SlyxupClient } from '@slyxup/core';
import { cookies } from 'next/headers';

export async function deleteAccountAction() {
  const client = new SlyxupClient();
  await client.users.delete();
  const cookieStore = await cookies();
  cookieStore.delete('slyxup_session');
  redirect('/');
}`,
        }}
      />

      <h2 className="h-sec">Admin: block &amp; roles</h2>
      <CodeBlock>{`POST /v1/admin/users/:id/block   { "reason": "spam" }
// -> blockedAt set, ALL sessions revoked immediately

POST /v1/admin/users/:id/role    { "role": "admin" }
GET  /v1/admin/users             // paginated, search by email`}</CodeBlock>

      <div className="prose-note">
        <b>Blocked users</b> keep their data but can&apos;t sign in — every request returns{' '}
        <code className="inl">403 Forbidden</code>. Unblock by clearing <code className="inl">blockedAt</code>.
      </div>
    </div>
  );
}
