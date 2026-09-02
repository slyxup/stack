'use client';

import Link from 'next/link';
import { BrandShield } from './icons';
import { ThemeToggle } from './ThemeToggle';
import { useAuth } from '@slyxup/react';
import { usePathname } from 'next/navigation';

function NavCta() {
  // Try to read auth; if no provider (e.g. landing page outside SlyxUpProvider), fallback to static link
  let isSignedIn = false;
  let isLoaded = false;
  try {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    const a = useAuth() as unknown as { isSignedIn?: boolean; isLoaded?: boolean };
    isSignedIn = !!a?.isSignedIn;
    isLoaded = !!a?.isLoaded;
  } catch {
    // No provider — marketing page
  }
  // While loading, show neutral CTA to avoid layout shift
  if (!isLoaded) {
    return <Link className="nav-cta" href="/dashboard">Open Dashboard</Link>;
  }
  return isSignedIn ? (
    <Link className="nav-cta" href="/dashboard">Open Dashboard</Link>
  ) : (
    <Link className="nav-cta" href="/login">Sign in</Link>
  );
}

export function Nav() {
  const pathname = usePathname();
  const isDashboard = pathname?.startsWith('/dashboard');
  const isLogin = pathname === '/login' || pathname === '/sign-in';
  return (
    <nav className="nav">
      <div className="wrap nav-in">
        <Link href="/" className="brand">
          <span className="brand-mark"><BrandShield /></span> SlyxUp
        </Link>
        <div className="nav-links">
          <Link href="/features">Features</Link>
          <Link href="/docs">Docs</Link>
          <Link href="/pricing">Pricing</Link>
          <Link href="/dashboard">Dashboard</Link>
          <a href="https://github.com/slyxup/stack" target="_blank" rel="noreferrer">GitHub</a>
        </div>
        <div className="nav-right">
          <ThemeToggle />
          {/* On dashboard/login show context-aware CTA, else generic */}
          {isDashboard || isLogin ? <NavCta /> : <Link className="nav-cta" href="/dashboard">Open Dashboard</Link>}
        </div>
      </div>
    </nav>
  );
}

export function Footer() {
  return (
    <footer>
      <div className="wrap foot-in">
        <span>&copy; {new Date().getFullYear()} SlyxUp Stack &mdash; MIT licensed</span>
        <div className="foot-links">
          <a href="https://github.com/slyxup/stack">GitHub</a>
          <a href="https://www.npmjs.com/package/@slyxup/core">npm</a>
          <Link href="/docs">Docs</Link>
          <Link href="/pricing">Pricing</Link>
          <Link href="/features">Features</Link>
        </div>
      </div>
    </footer>
  );
}
