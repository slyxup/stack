# URL shortener SDK example

This is a client-only Next.js static export using the published `@slyxup/core@3.0.0` and `@slyxup/ui@3.0.0` SDKs. It does not run server middleware and must not be used as proof of server authorization or paid-feature enforcement.

```dotenv
# .env.local (public configuration only)
NEXT_PUBLIC_SLYXUP_PUBLISHABLE_KEY=pk_test_REPLACE_WITH_REAL_KEY
NEXT_PUBLIC_SLYXUP_PROJECT_ID=REPLACE_WITH_PROJECT_ID
NEXT_PUBLIC_SLYXUP_API_URL=http://localhost:8787
NEXT_PUBLIC_SLYXUP_BILLING_URL=http://localhost:8788
```

From the workspace root: `pnpm --filter example-url-shortner dev` (port 3002), or `pnpm --filter example-url-shortner build` (static files in `out/`). Providers explicitly use project-scoped sessionStorage so full-page navigation retains the session in the same tab. This storage is script-readable. Project OAuth buttons use the SDK proof-key flow; configure provider credentials and register the example hostname on the project. Use the server-owned cookie recipe in [INTEGRATION_GUIDE.md](../../INTEGRATION_GUIDE.md) for sensitive server-rendered apps.
