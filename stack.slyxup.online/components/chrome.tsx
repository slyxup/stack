import Link from 'next/link';
import { BrandShield } from './icons';
import { ThemeToggle } from './ThemeToggle';

export function Nav() {
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
          <Link className="nav-cta" href="/dashboard">Open Dashboard</Link>
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
