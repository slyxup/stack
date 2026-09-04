import { ArrowRight, Check, Loader2 } from 'lucide-react';
import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { CodeBlock } from '../components/CodeBlock';
import { Logo } from '../components/marketing';
import { Alert, Button, Input, Label } from '../components/ui';
import { AUTH_URL } from '../lib/api';
import { useAuth } from '../store/auth';

const POINTS = ['Projects with isolated data', 'Keys, domains & billing live', 'Docs to integrate in minutes'];

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
    <div className="min-h-screen bg-[#0b0b10] text-white flex flex-col lg:grid lg:grid-cols-[1fr_1.05fr] overflow-x-clip">
      {/* Brand panel */}
      <div className="relative overflow-hidden flex flex-col justify-between p-6 sm:p-10 min-h-[280px] lg:min-h-screen min-w-0">
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              'radial-gradient(700px 420px at 20% 0%, rgba(109,40,217,0.4), transparent 65%), radial-gradient(560px 380px at 90% 90%, rgba(34,211,238,0.14), transparent 60%), linear-gradient(160deg, #150b2e 0%, #0b0b10 70%)',
          }}
        />
        <Link to="/" className="relative flex items-center gap-2.5 w-fit">
          <Logo size={32} />
          <span className="text-[15px] font-bold">SlyxUp</span>
        </Link>
        <div className="relative my-8 lg:my-0 min-w-0">
          <h1 className="font-display text-[30px] sm:text-[44px] font-extrabold leading-[1.02] text-balance">
            Run every project <span className="text-gradient">from one chair.</span>
          </h1>
          <p className="mt-4 max-w-[420px] text-[14px] leading-relaxed text-white/60">
            Sign in with your{' '}
            <span className="font-mono text-[12.5px] text-white/85">{AUTH_URL.replace('https://', '')}</span>{' '}
            account. Everything behind this wall is live API — no demo data.
          </p>
          <ul className="mt-6 space-y-2.5">
            {POINTS.map((p) => (
              <li key={p} className="flex items-center gap-2.5 text-[13.5px] font-medium text-white/75">
                <span className="flex size-5 items-center justify-center rounded-full bg-emerald-400/15 shrink-0">
                  <Check className="size-3 text-emerald-400" />
                </span>
                {p}
              </li>
            ))}
          </ul>
        </div>
        <div className="relative hidden lg:block max-w-[420px] min-w-0">
          <CodeBlock title="cli" lang="bash" code="slyxup project list --json" />
        </div>
      </div>

      {/* Form panel */}
      <div className="relative flex items-center justify-center bg-[#f6f7f9] px-4 sm:px-8 py-10 lg:py-0 min-w-0">
        <div className="w-full max-w-[400px] min-w-0">
          <div className="lg:hidden flex items-center gap-2.5 mb-6">
            <Logo size={30} />
            <span className="text-[14px] font-bold text-[#101014]">SlyxUp Admin</span>
          </div>
          <h2 className="text-[24px] font-extrabold tracking-tight text-[#101014]">Welcome back</h2>
          <p className="mt-1 text-[13.5px] text-[#63666f]">
            Sign in to open your projects.{' '}
            <Link to="/docs" className="font-semibold text-[#6d28d9] hover:underline">
              New here? Read the docs
            </Link>
          </p>
          <form onSubmit={submit} className="mt-6 rounded-2xl border border-[#e4e6eb] bg-white p-5 sm:p-6 space-y-4 min-w-0">
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
            <Button type="submit" size="lg" className="btn-glow w-full !border-0 !bg-[#6d28d9] hover:!bg-[#5b21b6]" disabled={busy}>
              {busy ? <Loader2 className="size-4 animate-spin" /> : <>Continue <ArrowRight className="size-4" /></>}
            </Button>
          </form>
          <p className="mt-4 text-center text-[12px] text-[#9a9da8]">
            Protected by HttpOnly sessions · Argon2id · rate limits
          </p>
        </div>
      </div>
    </div>
  );
}
