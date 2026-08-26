import { useAuth, useUser } from '@slyxup/react';
import { useEffect, useRef, useState } from 'react';
import { injectStyles } from '../../styles';

function initials(name: string | null | undefined, email: string): string {
  if (name?.trim()) return name.trim().slice(0, 1).toUpperCase();
  return email.slice(0, 1).toUpperCase();
}

/** Avatar + dropdown with profile actions and sign out. */
export function UserButton() {
  injectStyles();
  const { isLoaded, user } = useUser();
  const { signOut } = useAuth();
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node))
        setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('mousedown', onDocClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDocClick);
      document.removeEventListener('keydown', onKey);
    };
  }, []);

  if (!isLoaded)
    return <div className="slx-userbtn-avatar" aria-hidden="true" />;
  const email = user?.email ?? '';
  const name = user?.firstName;

  async function onSignOut() {
    await signOut();
    setOpen(false);
  }

  return (
    <div className="slx-userbtn-wrap" ref={wrapRef}>
      <button
        type="button"
        className="slx-userbtn-avatar"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Account menu"
      >
        {user?.avatarUrl ? (
          <img src={user.avatarUrl} alt="" />
        ) : (
          initials(name, email || '?')
        )}
      </button>

      {open && (
        <div className="slx-menu" role="menu">
          <div className="slx-menu-header">
            <p className="slx-menu-name">
              {name
                ? `${name}${user?.lastName ? ` ${user.lastName}` : ''}`
                : email.split('@')[0]}
            </p>
            <p className="slx-menu-email">{email}</p>
          </div>
          <button
            type="button"
            className="slx-menu-item"
            role="menuitem"
            onClick={() => setOpen(false)}
          >
            Profile settings
          </button>
          <button
            type="button"
            className="slx-menu-item slx-menu-item-danger"
            role="menuitem"
            onClick={onSignOut}
          >
            Sign out
          </button>
        </div>
      )}
    </div>
  );
}
