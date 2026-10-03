import { Link, useParams } from 'react-router-dom';
import { CopyMarkdown, DocHeader, DocsShell } from '../components/docs';
import { Seo, articleJsonLd } from '../components/Seo';
import { DOC_MARKDOWN, getDoc } from '../docs/manifest';
import { DocBody } from '../docs/sections';

const TOC: Record<string, Array<{ id: string; label: string }>> = {
  introduction: [{ id: 'what', label: 'What it is' }, { id: 'vs', label: 'Vs Clerk/Auth0' }, { id: 'tour', label: '60-second tour' }],
  quickstart: [{ id: 'steps', label: 'Five steps' }],
  'core-concepts': [{ id: 'nouns', label: 'Six nouns' }, { id: 'project', label: 'Project' }, { id: 'user', label: 'User' }, { id: 'session', label: 'Session' }, { id: 'key', label: 'API key' }, { id: 'domain', label: 'Domain' }, { id: 'env', label: 'Test vs live' }],
  react: [{ id: 'provider', label: 'Provider' }, { id: 'hooks', label: 'Hooks' }, { id: 'verify', label: 'Verify + reset' }],
  'core-sdk': [{ id: 'headless', label: 'Headless' }, { id: 'server', label: 'Server admin' }],
  'ui-kit': [{ id: 'components', label: 'Components' }],
  'management-api': [{ id: 'manage', label: 'Endpoints' }],
  authentication: [{ id: 'flows', label: 'Flows' }, { id: 'signup', label: 'Sign up' }, { id: 'signin', label: 'Sign in' }, { id: 'signout', label: 'Sign out' }, { id: 'bootstrap', label: 'First admin' }],
  oauth: [{ id: 'flow', label: 'Flow' }, { id: 'link', label: 'Link/unlink' }],
  'passwords-verification': [{ id: 'hashing', label: 'Hashing' }, { id: 'verify', label: 'Verify' }, { id: 'reset', label: 'Reset' }, { id: 'change', label: 'Change' }],
  sessions: [{ id: 'transport', label: 'Transport' }],
  'two-factor': [{ id: 'enable', label: 'Enable' }, { id: 'manage2fa', label: 'Manage' }],
  'users-members': [{ id: 'list', label: 'List' }, { id: 'roles', label: 'Roles' }, { id: 'moderate', label: 'Moderate' }],
  'api-keys': [{ id: 'types', label: 'Types' }, { id: 'lifecycle', label: 'Lifecycle' }],
  'domains-cors': [{ id: 'rules', label: 'Rules' }, { id: 'manage-domains', label: 'Manage' }],
  'billing-overview': [{ id: 'loop', label: 'Money loop' }],
  plans: [{ id: 'shape', label: 'Shape' }],
  checkout: [{ id: 'hosted', label: 'Checkout' }],
  'subscriptions-invoices': [{ id: 'sub', label: 'Subscriptions' }, { id: 'portal', label: 'Portal' }],
  entitlements: [{ id: 'gate', label: 'Gating' }],
  'paddle-setup': [{ id: 'checklist', label: 'Checklist' }],
  webhooks: [{ id: 'two-streams', label: 'Streams' }, { id: 'auth-events', label: 'Auth' }, { id: 'paddle-events', label: 'Paddle' }],
  'self-hosting': [{ id: 'cf', label: 'Cloudflare' }, { id: 'backend', label: 'Backend' }, { id: 'admin', label: 'Admin' }, { id: 'panel', label: 'Panel' }, { id: 'secrets', label: 'Secrets' }],
  security: [{ id: 'model', label: 'Model' }],
  'api-reference': [{ id: 'bases', label: 'Base URLs' }, { id: 'auth-api', label: 'Identity' }, { id: 'mgmt-api', label: 'Projects' }, { id: 'billing-api', label: 'Billing' }],
  troubleshooting: [{ id: 'fix', label: 'Fix fast' }, { id: 't401', label: '401' }, { id: 't403', label: '403' }, { id: 'tcors', label: 'CORS' }, { id: 'tlink', label: 'Links' }, { id: 'stuck', label: 'Stuck?' }],
  'integration-guide': [{ id: 'recipes', label: 'Recipes' }],
};

export default function DocPage() {
  const { slug } = useParams<{ slug: string }>();
  const meta = getDoc(slug);

  if (!meta) {
    return (
      <div className="mx-auto max-w-[1120px] px-4 sm:px-8 py-16 text-center">
        <div className="text-[12px] font-bold uppercase tracking-[0.2em] text-[#9a9da8]">Unknown page</div>
        <h1 className="mt-2 text-[28px] font-extrabold">No doc at /docs/{slug}</h1>
        <Link to="/docs" className="mt-4 inline-block rounded-full bg-black px-5 py-2.5 text-[13px] font-bold text-white">Back to docs</Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#fafafa]">
      <Seo
        title={meta.title}
        description={meta.excerpt}
        path={`/docs/${meta.slug}`}
        jsonLd={articleJsonLd({
          title: meta.title,
          description: meta.excerpt,
          path: `/docs/${meta.slug}`,
        })}
      />
      <div className="mx-auto max-w-[1280px] px-4 sm:px-8 py-6 sm:py-8">
        <DocsShell slug={meta.slug} toc={TOC[meta.slug]}>
          <DocHeader slug={meta.slug} />
          <div className="mb-6">
            <CopyMarkdown slug={meta.slug} markdown={DOC_MARKDOWN[meta.slug] ?? `# ${meta.title}\n\n${meta.excerpt}`} />
          </div>
          <DocBody slug={meta.slug} />
          <div className="mt-8 flex items-center justify-between border-t border-[#e4e6eb] pt-4">
            <span className="text-[12px] text-[#9a9da8]">Was this helpful? Open the admin and try it live.</span>
            <Link to="/admin" className="rounded-full bg-black px-4 py-2 text-[12.5px] font-bold text-white">Try it in admin →</Link>
          </div>
        </DocsShell>
      </div>
    </div>
  );
}
