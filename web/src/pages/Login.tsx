import { ArrowRight, Check, Loader2 } from 'lucide-react';
import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { Alert, Button, Input, Label } from '../components/ui';
import { AUTH_URL } from '../lib/api';
import { useAuth } from '../store/auth';

const POINTS = [
  'Projects with isolated data',
  'Keys, domains & billing live',
  'Docs to integrate in minutes',
];

export default function Login() {
  const { user, ready, login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (ready && user) return <Navigate to="/admin" replace />;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setBusy(true);
    const r = await login(email, password);
    setBusy(false);
    if (!r.ok) {
      setError(r.error || 'Sign in failed');
      return;
    }
    navigate('/admin', { replace: true });
  };

  return (
    <div className="min-h-screen bg-white text-black flex flex-col lg:grid lg:grid-cols-[1fr_1.05fr] overflow-x-clip">
      {/* Brand panel */}
      <div className="relative overflow-hidden bg-[#050505] text-white flex flex-col justify-between p-6 sm:p-12 min-h-[300px] lg:min-h-screen min-w-0">
        <div className="absolute inset-0 bg-dots pointer-events-none" />
        <Link to="/" className="relative flex items-center gap-2.5 w-fit">
          <span className="flex size-8 items-center justify-center rounded-lg bg-white font-extrabold text-[13px] text-black">
            S
          </span>
          <span className="text-[14px] font-semibold">SlyxUp</span>
        </Link>
        <div className="relative my-8 lg:my-0 min-w-0 rise rise-1">
          <h1 className="font-display text-[30px] sm:text-[46px] font-bold leading-[1.0] text-balance">
            Run every project from one chair.
          </h1>
          <p className="mt-4 max-w-[420px] text-[14px] leading-relaxed text-white/55">
            Sign in with your{' '}
            <span className="font-mono text-[12.5px] text-white/85">
              {AUTH_URL.replace('https://', '')}
            </span>{' '}
            account. Everything behind this wall is live API — no demo data.
          </p>
          <ul className="mt-6 space-y-2.5">
            {POINTS.map((p) => (
              <li
                key={p}
                className="flex items-center gap-2.5 text-[13.5px] font-medium text-white/75"
              >
                <span className="flex size-5 items-center justify-center rounded-full border border-white/20 shrink-0">
                  <Check className="size-3" />
                </span>
                {p}
              </li>
            ))}
          </ul>
        </div>
        <div className="relative font-mono text-[11px] text-white/35">
          HttpOnly sessions · Argon2id · rate limits
        </div>
      </div>

      {/* Form panel */}
      <div className="relative flex items-center justify-center bg-[#fafafa] px-4 sm:px-8 py-10 lg:py-0 min-w-0">
        <div className="w-full max-w-[380px] min-w-0 rise rise-2">
          <h2 className="font-display text-[24px] font-bold">Welcome back</h2>
          <p className="mt-1 text-[13.5px] text-[#71717a]">
            Sign in to open your projects.{' '}
            <Link
              to="/docs"
              className="font-medium text-black underline underline-offset-4"
            >
              New here? Read the docs
            </Link>
          </p>
          <form
            onSubmit={submit}
            className="mt-6 rounded-xl border border-black/[0.08] bg-white p-5 sm:p-6 space-y-4 shadow-[0_1px_2px_rgba(0,0,0,0.05)] min-w-0"
          >
            <div className="min-w-0">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                required
                autoComplete="email"
                placeholder="you@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div className="min-w-0">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                required
                autoComplete="current-password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            {error && <Alert>{error}</Alert>}
            <Button type="submit" size="lg" className="w-full" disabled={busy}>
              {busy ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <>
                  Continue <ArrowRight className="size-4" />
                </>
              )}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
