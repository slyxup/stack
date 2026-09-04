import { Link } from 'react-router-dom';
import type { ReactNode } from 'react';

export function Logo({ size = 32 }: { size?: number }) {
  return (
    <span
      className="flex items-center justify-center rounded-[10px] bg-gradient-to-br from-[#6d28d9] to-[#4c1d95] font-extrabold text-white shrink-0"
      style={{ width: size, height: size, fontSize: size * 0.45 }}
    >
      S
    </span>
  );
}

export function PublicNav({ active }: { active?: 'ui' | 'docs' }) {
  const link = (to: string, label: string, isActive?: boolean) => (
    <Link
      key={to}
      to={to}
      className={`rounded-full px-3.5 py-2 text-[12.5px] font-semibold transition-colors ${
        isActive ? 'text-white bg-white/10' : 'text-white/60 hover:text-white'
      }`}
    >
      {label}
    </Link>
  );
  return (
    <header className="sticky top-0 z-30 border-b border-white/10 bg-[#0b0b10]/85 backdrop-blur">
      <div className="mx-auto max-w-[1120px] px-4 sm:px-8 py-3.5 flex items-center gap-2.5 min-w-0">
        <Link to="/" className="flex items-center gap-2.5 min-w-0">
          <Logo size={30} />
          <span className="text-[14px] font-bold text-white truncate">SlyxUp</span>
        </Link>
        <nav className="ml-auto flex items-center gap-1 shrink-0">
          {link('/ui', 'UI Kit', active === 'ui')}
          {link('/docs', 'Docs', active === 'docs')}
          <Link
            to="/login"
            className="ml-1 rounded-full bg-white text-[#0b0b10] px-4 py-2 text-[12.5px] font-bold hover:bg-white/85 transition-colors"
          >
            Sign in
          </Link>
        </nav>
      </div>
    </header>
  );
}

export function SectionHead({
  eyebrow,
  title,
  desc,
}: {
  eyebrow: string;
  title: ReactNode;
  desc?: string;
}) {
  return (
    <div className="mx-auto max-w-[680px] text-center min-w-0">
      <div className="inline-flex items-center gap-2 rounded-full border border-[#6d28d9]/40 bg-[#6d28d9]/10 px-3.5 py-1.5 text-[11.5px] font-bold uppercase tracking-[0.12em] text-[#c4b5fd]">
        {eyebrow}
      </div>
      <h2 className="font-display mt-4 text-[26px] sm:text-[36px] font-extrabold leading-[1.05] text-white text-balance">
        {title}
      </h2>
      {desc && <p className="mt-3 text-[13.5px] sm:text-[15px] leading-relaxed text-white/55">{desc}</p>}
    </div>
  );
}

export function SiteFooter() {
  return (
    <footer className="border-t border-white/10">
      <div className="mx-auto max-w-[1120px] px-4 sm:px-8 py-10 min-w-0">
        <div className="flex flex-col md:flex-row gap-8 min-w-0">
          <div className="min-w-0 md:max-w-[320px]">
            <div className="flex items-center gap-2.5">
              <Logo size={30} />
              <span className="text-[14px] font-bold text-white">SlyxUp</span>
            </div>
            <p className="mt-3 text-[12.5px] leading-relaxed text-white/50">
              Open-source auth & billing on Cloudflare. MIT licensed — run it
              yourself in 60 seconds.
            </p>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-8 md:ml-auto min-w-0">
            <FooterCol
              title="Product"
              links={[
                ['Admin panel', '/admin'],
                ['UI Kit', '/ui'],
                ['Sign in', '/login'],
              ]}
            />
            <FooterCol
              title="Developers"
              links={[
                ['Documentation', '/docs'],
                ['API reference', '/docs'],
                ['CLI', '/docs'],
              ]}
            />
            <FooterCol
              title="Open source"
              links={[
                ['GitHub', 'https://github.com/slyxup/stack'],
                ['MIT License', 'https://github.com/slyxup/stack'],
              ]}
              external
            />
          </div>
        </div>
        <div className="mt-8 flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-white/10 pt-5 text-[12px] text-white/40 min-w-0">
          <span>© {new Date().getFullYear()} SlyxUp Stack</span>
          <span className="sm:ml-auto">Auth + billing for modern products.</span>
        </div>
      </div>
    </footer>
  );
}

function FooterCol({
  title,
  links,
  external,
}: {
  title: string;
  links: Array<[string, string]>;
  external?: boolean;
}) {
  return (
    <div className="min-w-0">
      <div className="text-[11px] font-bold uppercase tracking-[0.14em] text-white/40">{title}</div>
      <div className="mt-3 space-y-2.5">
        {links.map(([label, to]) =>
          external ? (
            <a key={label} href={to} target="_blank" rel="noreferrer" className="block text-[13px] font-medium text-white/65 hover:text-white transition-colors">
              {label}
            </a>
          ) : (
            <Link key={label} to={to} className="block text-[13px] font-medium text-white/65 hover:text-white transition-colors">
              {label}
            </Link>
          )
        )}
      </div>
    </div>
  );
}
