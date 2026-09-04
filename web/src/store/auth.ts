import { create } from 'zustand';
import {
  type ApiUser,
  signIn as apiSignIn,
  signOut as apiSignOut,
  currentUser,
  getToken,
} from '../lib/api';

export interface SessionUser {
  id: string;
  email: string;
  name: string;
}

interface AuthState {
  user: SessionUser | null;
  ready: boolean;
  login: (
    email: string,
    password: string
  ) => Promise<{ ok: boolean; error?: string }>;
  logout: () => void;
  hydrate: () => Promise<void>;
}

const KEY = 'slyxup_admin_user';

function load(): SessionUser | null {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as SessionUser) : null;
  } catch {
    return null;
  }
}

function displayName(u: ApiUser | null, fallback: string): string {
  const full = [u?.firstName, u?.lastName].filter(Boolean).join(' ').trim();
  return full || u?.name || fallback;
}

export const useAuth = create<AuthState>((set) => ({
  user: null,
  ready: false,

  hydrate: async () => {
    const cached = load();
    if (cached && getToken()) {
      set({ user: cached, ready: true });
      return;
    }
    if (!getToken()) {
      localStorage.removeItem(KEY);
      set({ user: null, ready: true });
      return;
    }
    const me = await currentUser();
    if (me.ok && me.data.user) {
      const email = me.data.user.email || 'me';
      const u: SessionUser = {
        id: me.data.user.id || 'me',
        email,
        name: displayName(me.data.user, email),
      };
      localStorage.setItem(KEY, JSON.stringify(u));
      set({ user: u, ready: true });
    } else {
      apiSignOut();
      localStorage.removeItem(KEY);
      set({ user: null, ready: true });
    }
  },

  login: async (email, password) => {
    const r = await apiSignIn(email.trim(), password);
    if (!r.ok) return { ok: false, error: r.error };
    const me = await currentUser();
    const raw = me.ok ? me.data.user : null;
    const u: SessionUser = {
      id: raw?.id || 'me',
      email: raw?.email || email.trim(),
      name: raw ? displayName(raw, email.trim()) : email.trim(),
    };
    localStorage.setItem(KEY, JSON.stringify(u));
    set({ user: u, ready: true });
    return { ok: true };
  },

  logout: () => {
    apiSignOut();
    localStorage.removeItem(KEY);
    set({ user: null });
  },
}));
