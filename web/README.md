# SlyxUp Admin (web)

Control panel + public docs for the SlyxUp Stack. React 19 + Vite + Tailwind v4, deployed to Cloudflare Pages (`stack.slyxup.online`).

## Routes

| Route | Access | What |
|---|---|---|
| `/` | — | Redirects to `/admin` or `/login` |
| `/login` | Public | Sign in against `VITE_API_URL` |
| `/admin` | Auth | Projects list — create, search, open, delete |
| `/admin/projects/:id` | Auth | Overview, Users (search/paginate/edit/block/delete), Keys (create/reveal-once/revoke), Domains, Billing (read-only plans), Settings + danger zone |
| `/admin/docs` | Auth | Same docs, inside the panel |
| `/docs` | Public | Integration docs — no sign-in needed |

No mock data anywhere: unauthenticated users hit the login wall, empty states link to real actions.

## Develop

```bash
cp .env.example .env   # set VITE_API_URL / VITE_BILLING_URL
pnpm install
pnpm dev               # http://localhost:5173
pnpm typecheck && pnpm build
```

## Deploy

```bash
pnpm deploy            # production → stack.slyxup.online
pnpm deploy:preview    # preview branch
```

SPA fallback is `public/_redirects` (`/* /index.html 200`); hashed assets are immutable-cached via `public/_headers`, HTML is `no-store` so deploys can never serve stale shells.
