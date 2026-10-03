import { ArrowUpRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { PublicNav, SiteFooter } from '../components/marketing';
import { Seo } from '../components/Seo';

const links = [
  ['Portfolio', 'https://ysr-hameed.github.io/'],
  ['Resume', 'https://ysr-hameed.github.io/resume.pdf'],
  ['GitHub', 'https://github.com/ysr-hameed'],
  ['LinkedIn', 'https://www.linkedin.com/in/yasir-hameed-59b70b36b'],
  ['Twitter', 'https://twitter.com/ysr_hameed'],
  ['Instagram', 'https://www.instagram.com/ysr_hameed'],
  ['Email', 'mailto:ysr.hameed.yh@gmail.com'],
];

export default function About() {
  return (
    <div className="min-h-screen bg-[#050505] text-white">
      <Seo title="About Yasir Hameed" description="Meet Yasir Hameed, the web developer and designer behind SlyxUp Stack." path="/about" />
      <PublicNav />
      <main className="mx-auto max-w-[900px] px-4 py-16 sm:px-8 sm:py-24">
        <p className="font-mono text-[11px] font-bold uppercase tracking-[0.2em] text-white/40">About the maker</p>
        <h1 className="font-display mt-5 max-w-3xl text-[42px] font-bold leading-[0.98] tracking-[-0.03em] sm:text-[76px]">
          SlyxUp Stack, built by <span className="font-serif-accent font-normal">Yasir Hameed.</span>
        </h1>
        <div className="mt-8 max-w-2xl space-y-5 text-[15px] leading-relaxed text-white/60 sm:text-[17px]">
          <p>Yasir Hameed is a web developer and designer from Ambedkar Nagar, India. He builds digital experiences at the intersection of technology, creativity, and purpose.</p>
          <p>Currently building StartElio and pursuing his BA at TNPG College, Yasir works across React, Next.js, TypeScript, Node.js, Python, AI/ML, UI/UX, and cloud infrastructure.</p>
          <p>SlyxUp Stack is his open-source foundation for authentication, billing, and product infrastructure on Cloudflare. It exists to make dependable building blocks easier to own and easier to ship.</p>
        </div>
        <div className="mt-10 grid gap-3 sm:grid-cols-3">
          {[['3+', 'Years building'], ['20+', 'Projects shipped'], ['100%', 'Focus on quality & speed']].map(([value, label]) => (
            <div key={label} className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
              <p className="font-display text-3xl font-bold">{value}</p>
              <p className="mt-1 font-mono text-[11px] uppercase tracking-[0.14em] text-white/40">{label}</p>
            </div>
          ))}
        </div>
        <div className="mt-10 flex flex-wrap gap-2.5">
          {links.map(([label, href]) => (
            <a key={label} href={href} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/[0.03] px-4 py-2.5 text-[13px] text-white/70 hover:border-white/35 hover:text-white">
              {label} <ArrowUpRight className="size-3.5" />
            </a>
          ))}
        </div>
        <Link to="/docs" className="mt-12 inline-flex items-center gap-2 text-[13px] font-semibold text-white/70 hover:text-white">
          Read the Stack docs <ArrowUpRight className="size-4" />
        </Link>
      </main>
      <SiteFooter />
    </div>
  );
}
