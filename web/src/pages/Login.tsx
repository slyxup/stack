import { KeyRound, Loader2 } from 'lucide-react';
import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { Alert, Button, Card, CardBody, Input, Label } from '../components/ui';
import { AUTH_URL } from '../lib/api';
import { useAuth } from '../store/auth';

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
    <div className="min-h-screen flex items-center justify-center px-4 bg-[#0e0e13]">
      <div className="w-full max-w-[400px]">
        <div className="text-center mb-7">
          <div className="mx-auto size-12 rounded-2xl bg-[#6d28d9] flex items-center justify-center font-extrabold text-white text-[20px]">
            S
          </div>
          <h1 className="text-white text-[22px] font-bold tracking-tight mt-4">
            SlyxUp Admin
          </h1>
          <p className="text-white/50 text-[13px] mt-1">
            Sign in with your{' '}
            <span className="font-mono text-[12px]">
              {AUTH_URL.replace('https://', '')}
            </span>{' '}
            account
          </p>
        </div>

        <Card>
          <CardBody className="pt-5">
            <form onSubmit={submit} className="space-y-4">
              <div>
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
              <div>
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
              <Button
                type="submit"
                className="w-full"
                size="lg"
                disabled={busy}
              >
                {busy ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <KeyRound className="size-4" />
                )}
                {busy ? 'Signing in…' : 'Sign in'}
              </Button>
            </form>
          </CardBody>
        </Card>

        <p className="text-center text-[12.5px] text-white/40 mt-5">
          New here? Read the{' '}
          <Link
            to="/docs"
            className="text-white/80 underline underline-offset-4"
          >
            docs
          </Link>{' '}
          to create an account and integrate.
        </p>
      </div>
    </div>
  );
}
