import Link from 'next/link';
import { BrandShield } from './icons';

export function Nav() {
  return (
    <nav className="nav">
      <div className="wrap nav-in">
        <Link href="/" className="brand">
          <span className="brand-mark"><BrandShield /></span> SlyxUp
        </Link>
        <div className="nav-links">
          <a href="/features">Features</a>
          <a href="/docs">Docs</a>
          <a href="/pricing">Pricing</a>
          <a href="/console">Console</a>
          <a href="https://github.com/slyxup/stack" target="_blank" rel="noreferrer">GitHub</a>
        </div>
        <a className="nav-cta" href="/console">Open Console</a>
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
          <a href="/docs">Docs</a>
          <a href="/pricing">Pricing</a>
          <a href="/features">Features</a>
        </div>
      </div>
    </footer>
  );
}
