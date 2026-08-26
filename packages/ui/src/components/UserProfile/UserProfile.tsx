import { useAuth, useUser } from '@slyxup/react';
import { type FormEvent, useEffect, useState } from 'react';
import { injectStyles } from '../../styles';

/** Edit first/last name + avatar URL. */
export function UserProfile() {
  injectStyles();
  const { isLoaded, user, reload } = useUser();
  const { client } = useAuth();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (user) {
      setFirstName(user.firstName ?? '');
      setLastName(user.lastName ?? '');
      setAvatarUrl(user.avatarUrl ?? '');
    }
  }, [user]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setSaved(false);
    try {
      await client.users.update({ firstName, lastName, avatarUrl });
      await reload();
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } finally {
      setBusy(false);
    }
  }

  if (!isLoaded) return <div className="slx-card" aria-busy="true" />;

  return (
    <div className="slx-card">
      <h1 className="slx-title">Profile</h1>
      <p className="slx-subtitle">Signed in as {user?.email}</p>

      {saved && (
        <p className="slx-error-text" style={{ color: '#34a853' }}>
          Profile saved.
        </p>
      )}

      <form onSubmit={onSubmit}>
        <div className="slx-field">
          <label className="slx-label" htmlFor="slx-profile-first">
            First name
          </label>
          <input
            id="slx-profile-first"
            className="slx-input"
            type="text"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
          />
        </div>
        <div className="slx-field">
          <label className="slx-label" htmlFor="slx-profile-last">
            Last name
          </label>
          <input
            id="slx-profile-last"
            className="slx-input"
            type="text"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
          />
        </div>
        <div className="slx-field">
          <label className="slx-label" htmlFor="slx-profile-avatar">
            Avatar URL
          </label>
          <input
            id="slx-profile-avatar"
            className="slx-input"
            type="url"
            placeholder="https://…"
            value={avatarUrl}
            onChange={(e) => setAvatarUrl(e.target.value)}
          />
        </div>
        <button className="slx-btn" type="submit" disabled={busy}>
          {busy ? 'Saving…' : 'Save changes'}
        </button>
      </form>
    </div>
  );
}
