import Link from 'next/link';

export function Nav() {
  return (
    <nav className="nav">
      <div className="wrap nav-in">
        <Link href="/" className="brand">
          <span className="brand-mark">🔐</span> SlyxUp
        </Link>
        <div className="nav-links">
          <a href="/features">Features</a>
          <a href="/pricing">Pricing</a>
          <a href="https://github.com/slyxup/stack" target="_blank" rel="noreferrer">GitHub</a>
        </div>
        <a className="nav-cta mono" href="#get-started">npx @slyxup/cli init</a>
      </div>
    </nav>
  );
}

export function Footer() {
  return (
    <footer>
      <div className="wrap foot-in">
        <span>© {new Date().getFullYear()} SlyxUp Stack — MIT licensed</span>
        <div className="foot-links">
          <a href="https://github.com/slyxup/stack">GitHub</a>
          <a href="https://www.npmjs.com/package/@slyxup/core">npm</a>
          <a href="/pricing">Pricing</a>
          <a href="/features">Features</a>
        </div>
      </div>
    </footer>
  );
}
