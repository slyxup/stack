export const DOCS_SIDEBAR = [
  {
    section: 'Getting Started',
    items: [
      { title: 'Introduction', slug: '/docs', desc: 'What is SlyxUp and how it works' },
      { title: 'Quick Start', slug: '/docs/quick-start', desc: 'Set up in 30 seconds' },
      { title: 'Installation', slug: '/docs/installation', desc: 'npm packages and setup' },
      { title: 'Self-Host', slug: '/docs/self-host', desc: 'Run your own stack — single-tenant setup' },
    ],
  },
  {
    section: 'Authentication',
    items: [
      { title: 'Email & Password', slug: '/docs/auth/email', desc: 'Sign up, sign in, sessions' },
      { title: 'OAuth (Google & GitHub)', slug: '/docs/auth/oauth', desc: 'Social sign-in flows' },
      { title: 'Security', slug: '/docs/auth/security', desc: 'Username, 2FA, connected accounts' },
      { title: 'Sessions', slug: '/docs/auth/sessions', desc: 'Cookie management, revocation' },
      { title: 'User Management', slug: '/docs/auth/users', desc: 'Profiles, blocking, roles' },
      { title: 'Webhooks', slug: '/docs/auth/webhooks', desc: 'Auth event delivery' },
    ],
  },
  {
    section: 'Billing',
    items: [
      { title: 'Overview', slug: '/docs/billing', desc: 'Paddle integration, plans, subscriptions' },
      { title: 'Checkout', slug: '/docs/billing/checkout', desc: 'Payment flow' },
      { title: 'Webhooks', slug: '/docs/billing/webhooks', desc: 'Subscription lifecycle events' },
    ],
  },
  {
    section: 'SDK Reference',
    items: [
      { title: '@slyxup/core', slug: '/docs/sdk/core', desc: 'SlyxupClient API' },
      { title: '@slyxup/react', slug: '/docs/sdk/react', desc: 'Provider and hooks' },
      { title: '@slyxup/nextjs', slug: '/docs/sdk/nextjs', desc: 'Server helpers and middleware' },
      { title: '@slyxup/ui', slug: '/docs/sdk/ui', desc: 'Prebuilt components' },
      { title: '@slyxup/cli', slug: '/docs/sdk/cli', desc: 'CLI commands' },
    ],
  },
  {
    section: 'API Reference',
    items: [
      { title: 'Auth API', slug: '/docs/api/auth', desc: 'REST endpoints for auth' },
      { title: 'Billing API', slug: '/docs/api/billing', desc: 'REST endpoints for billing' },
      { title: 'Management API', slug: '/docs/api/management', desc: 'Projects, keys, domains' },
    ],
  },
];
