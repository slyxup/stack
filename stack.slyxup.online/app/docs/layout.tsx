import { Nav, Footer } from '../../components/chrome';
import { DocsSidebar } from '../../components/docs-sidebar';
import { DocsPager } from '../../components/docs-pager';

export const metadata = {
  title: 'Documentation — SlyxUp',
  description: 'Guides and API reference for SlyxUp Auth — email/password, OAuth, sessions, SDKs, billing.',
};

export default function DocsLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Nav />
      <div className="wrap docs-shell">
        <DocsSidebar />
        <article className="docs-article">
          {children}
          <DocsPager />
        </article>
      </div>
      <Footer />
    </>
  );
}

