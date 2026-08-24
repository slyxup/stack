
1. What you are actually building

The product is:

> SlyxUp Auth — an open-source, self-hostable authentication platform with React/Next.js SDKs, prebuilt UI, and a CLI-first developer experience.



It should work in two modes.

Hosted

Developer's App
      │
      ├── @slyxup/react (embedded <SignIn />)
      ├── @slyxup/nextjs
      └── @slyxup/ui
               │
               ▼
        auth.slyxup.online   (API + Hosted Auth Pages)
               │
               ▼
          PostgreSQL

Hosted Pages flow (alternative to embedded):
  User -> auth.slyxup.online/sign-in -> login -> callback -> Developer App (cookie set)

Self-hosted

Developer's App
      │
      ▼
@slyxup/* SDK
      │
      ▼
auth.example.com
      │
      ▼
SlyxUp Auth Server
      │
      ▼
Developer's PostgreSQL

The same open-source server supports both.


---

2. Domain architecture — .online unified

I would use this:

stack.slyxup.online
    SlyxUp Stack — ONLY marketing pages
    Landing, Features, Pricing, Docs, Blog, Self-hosting guides
    -> File structure: slyxup.online/stack/stack.slyxup.online/  (repo: github.com/slyxup/stack — CF Pages/Worker, domain-based folder)
    -> Deploy target: https://stack.slyxup.online
    -> Wrangler: slyxup.online/stack/stack.slyxup.online/wrangler.jsonc (assets: .next)
    -> NO dashboard, NO create-project, NO keys UI (Clerk jaisa dashboard yaha nahi hoga)

auth.slyxup.online
    SlyxUp Auth — CORE SERVER (API + Hosted Auth Pages) — CF Worker + D1 + KV
    1) API: https://auth.slyxup.online/v1/*  (SDK isi ko hit karega, pehle api.auth.slyxup.online tha ab yahi hai)
    2) Hosted Auth Pages: https://auth.slyxup.online/sign-in, /sign-up, /verify, /sso-callback
       -> User embed kiye bina bhi direct page open karke login kar sakta hai
       -> Login ke baad callback + cookie se developer ke app me signed-in ho jayega
    -> File structure: slyxup.online/stack/auth.slyxup.online/  (repo: github.com/slyxup/stack, CF Worker — wrangler.jsonc + D1)
    -> Deploy target: https://auth.slyxup.online (wrangler deploy)
    -> Bindings: DB (D1), KV, STORAGE (R2)

billing.slyxup.online
    SlyxUp Billing — FUTURE (reserved, V1 me kuch nahi) — CF Worker + D1
    -> File structure: slyxup.online/stack/billing.slyxup.online/  (placeholder Worker)
    -> Deploy target: https://billing.slyxup.online (future, wrangler deploy)
    -> Packages: slyxup.online/stack/packages/billing -> @slyxup/billing

slyxup.online
    Monorepo root — Workspace/slyxup.online/  (contains stack/ as requested)
    -> File structure: slyxup.online/  (root) → slyxup.online/stack/  (monorepo: github.com/slyxup/stack — CF Workers + D1, domain-based)
    -> CF ONLY — Workers, D1, KV, R2, wrangler.jsonc (no Docker/Postgres)

api.auth.slyxup.online
    DEPRECATED — ab auth.slyxup.online hi API hai. Purana subdomain redirect ya alias ke liye rakho if needed.

dashboard.slyxup.online / status.slyxup.online / docs.slyxup.online
    Reserved for future (future me dashboard alag domain par ban sakta hai, abhi V1 me kuch nahi)

So when someone visits:

https://stack.slyxup.online

they see ONLY marketing landing page (slyxup.online/stack/stack.slyxup.online/ → CF Pages).

When the SDK makes requests OR hosted login hota hai:

https://auth.slyxup.online/v1/...        -> API traffic (slyxup.online/stack/auth.slyxup.online/src/routes/ — CF Worker + D1)
https://auth.slyxup.online/sign-in       -> Hosted login page (cookie + callback flow)

This separation keeps marketing UI (stack.slyxup.online) completely decoupled from auth logic (auth.slyxup.online).

Workspace layout (updated — moved stack inside slyxup.online as requested, CF-only):

Workspace/slyxup.online/  →  repo root (github.com/slyxup/stack — CF Workers + D1)
├── stack/                → monorepo (inside slyxup.online as requested)
│   ├── auth.slyxup.online/  (Worker + D1 + KV + R2 — wrangler.jsonc)
│   ├── stack.slyxup.online/ (Pages/Worker — wrangler.jsonc assets)
│   ├── billing.slyxup.online/  [future placeholder Worker]
│   └── packages/  (core, react, nextjs, ui, cli, billing→@slyxup/billing)
├── PLAN.md
└── README.md


---

3. GitHub organization

Your personal GitHub:

github.com/ysr-hameed

Keep that for your personal work, experiments and unrelated projects.

SlyxUp organization:

github.com/slyxup

Stack monorepo (updated — renamed from auth to stack for future billing):

github.com/slyxup/stack   →  Workspace/stack/  (contains auth + billing + marketing)
  ├── auth.slyxup.online/      (auth service)
  ├── billing.slyxup.online/   (billing service — future placeholder)
  ├── stack.slyxup.online/     (marketing)
  └── packages/*               (@slyxup/* SDKs)

Legacy / alternative split (if you later split repo):

github.com/slyxup/auth     → standalone auth (now part of stack monorepo)
github.com/slyxup/billing  → standalone billing (future, now placeholder in stack/billing.slyxup.online)

Future products (all inside stack monorepo or as separate repos later):

github.com/slyxup/storage
github.com/slyxup/analytics
github.com/slyxup/ai

The Stack repo is therefore the SlyxUp platform monorepo, not a personal repository.
Folder `auth` renamed to `stack` at Workspace level to allow billing/auth co-existence.


---

4. Final repository structure — DOMAIN BASED (CF Workers + D1)

Repo root is slyxup.online/  →  Workspace/slyxup.online/  (contains stack/ as requested — CF only)
Monorepo: slyxup.online/stack/  (repo: github.com/slyxup/stack — auth + billing + marketing — CF Workers + D1 + KV/R2)

Workspace/slyxup.online/   ->  Workspace/slyxup.online/  (root — CF monorepo)
└── stack/   ->  slyxup.online/stack/  (monorepo: github.com/slyxup/stack — domain-based, CF Workers)
    │
    ├── stack.slyxup.online/   ->  MARKETING ONLY (deploy to https://stack.slyxup.online)  [pehle apps/web tha]
│   ├── app/
│   │   ├── page.tsx
│   │   ├── features/
│   │   ├── pricing/
│   │   ├── react/
│   │   ├── nextjs/
│   │   ├── self-hosting/
│   │   ├── security/
│   │   ├── docs/
│   │   └── blog/
│   │
│   ├── components/
│   ├── content/
│   ├── lib/
│   ├── public/
│   ├── package.json
│   └── tsconfig.json
│
├── auth.slyxup.online/    ->  API + HOSTED PAGES (deploy to https://auth.slyxup.online)  [pehle apps/api tha]
│   ├── src/
│   │   ├── index.ts
│   │   │
│   │   ├── routes/
│   │   │   ├── auth.ts
│   │   │   ├── users.ts
│   │   │   ├── sessions.ts
│   │   │   ├── oauth.ts
│   │   │   ├── verification.ts
│   │   │   ├── password.ts
│   │   │   ├── projects.ts
│   │   │   ├── keys.ts
│   │   │   └── health.ts
│   │   │
│   │   ├── services/
│   │   │   ├── auth.service.ts
│   │   │   ├── user.service.ts
│   │   │   ├── session.service.ts
│   │   │   ├── oauth.service.ts
│   │   │   ├── project.service.ts
│   │   │   ├── api-key.service.ts
│   │   │   ├── email.service.ts
│   │   │   └── security.service.ts
│   │   │
│   │   ├── repositories/
│   │   │   ├── user.repository.ts
│   │   │   ├── session.repository.ts
│   │   │   ├── project.repository.ts
│   │   │   └── key.repository.ts
│   │   │
│   │   ├── middleware/
│   │   │   ├── auth.ts
│   │   │   ├── cors.ts
│   │   │   ├── rate-limit.ts
│   │   │   ├── security.ts
│   │   │   └── error.ts
│   │   │
│   │   ├── lib/
│   │   │   ├── db.ts
│   │   │   ├── crypto.ts
│   │   │   ├── password.ts
│   │   │   ├── sessions.ts
│   │   │   ├── cookies.ts
│   │   │   ├── logger.ts
│   │   │   ├── config.ts
│   │   │   └── oauth.ts
│   │   │
│   │   ├── schemas/
│   │   │   ├── auth.ts
│   │   │   ├── users.ts
│   │   │   ├── projects.ts
│   │   │   └── keys.ts
│   │   │
│   │   └── types/
│   │       └── env.ts
│   │
│   ├── package.json
│   └── tsconfig.json
│
├── billing.slyxup.online/  ->  BILLING (future, placeholder) (deploy to https://billing.slyxup.online)
│   ├── src/
│   │   ├── index.ts
│   │   ├── routes/
│   │   └── services/
│   ├── package.json
│   └── tsconfig.json
│
├── packages/
│   │
│   ├── core/
│   │   ├── src/
│   │   │   ├── client.ts
│   │   │   ├── auth.ts
│   │   │   ├── sessions.ts
│   │   │   ├── users.ts
│   │   │   ├── errors.ts
│   │   │   ├── types.ts
│   │   │   └── index.ts
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   ├── react/
│   │   ├── src/
│   │   │   ├── provider/
│   │   │   │   └── SlyxUpProvider.tsx
│   │   │   ├── context/
│   │   │   │   └── auth-context.ts
│   │   │   ├── hooks/
│   │   │   │   ├── useAuth.ts
│   │   │   │   ├── useUser.ts
│   │   │   │   └── useSession.ts
│   │   │   └── index.ts
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   ├── nextjs/
│   │   ├── src/
│   │   │   ├── server/
│   │   │   │   ├── auth.ts
│   │   │   │   └── current-user.ts
│   │   │   ├── middleware.ts
│   │   │   ├── cookies.ts
│   │   │   └── index.ts
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   ├── ui/
│   │   ├── src/
│   │   │   ├── components/
│   │   │   │   ├── SignIn/
│   │   │   │   ├── SignUp/
│   │   │   │   ├── UserButton/
│   │   │   │   ├── UserProfile/
│   │   │   │   ├── ForgotPassword/
│   │   │   │   ├── ResetPassword/
│   │   │   │   ├── EmailVerification/
│   │   │   │   └── SocialButtons/
│   │   │   ├── styles/
│   │   │   └── index.ts
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   └── cli/
│       ├── src/
│       │   ├── index.ts
│       │   │
│       │   ├── commands/
│       │   │   ├── login.ts
│       │   │   ├── logout.ts
│       │   │   ├── init.ts
│       │   │   ├── create.ts
│       │   │   ├── project.ts
│       │   │   ├── keys.ts
│       │   │   ├── env.ts
│       │   │   └── doctor.ts
│       │   │
│       │   ├── detectors/
│       │   │   ├── framework.ts
│       │   │   ├── nextjs.ts
│       │   │   └── react.ts
│       │   │
│       │   ├── generators/
│       │   │   ├── nextjs.ts
│       │   │   └── react.ts
│       │   │
│       │   ├── api/
│       │   │   └── client.ts
│       │   │
│       │   ├── config/
│       │   │   └── config.ts
│       │   │
│       │   └── utils/
│       │       ├── filesystem.ts
│       │       ├── package-manager.ts
│       │       └── logger.ts
│       │
│       ├── package.json
│       └── tsconfig.json
│
│   └── billing/  ->  @slyxup/billing (future)
│       ├── src/
│       │   └── index.ts
│       ├── package.json
│       └── tsconfig.json
│
├── examples/
│   ├── nextjs/
│   └── react/
│
├── migrations/
│   ├── 001_initial.sql
│   ├── 002_sessions.sql
│   ├── 003_email-verification.sql
│   ├── 004_password-reset.sql
│   ├── 005_oauth.sql
│   ├── 006_projects.sql
│   └── 007_api-keys.sql
│
├── docker/
│   ├── Dockerfile
│   └── entrypoint.sh
│
├── docs/
│   ├── getting-started/
│   ├── cli/
│   ├── react/
│   ├── nextjs/
│   ├── ui/
│   ├── self-hosting/
│   ├── configuration/
│   ├── api/
│   └── security/
│
├── tests/
│   ├── integration/
│   ├── e2e/
│   └── fixtures/
│
├── scripts/
│   ├── build.ts
│   └── release.ts
│
├── .github/
│   ├── workflows/
│   │   ├── ci.yml
│   │   └── release.yml
│   ├── ISSUE_TEMPLATE/
│   └── pull_request_template.md
│
├── .env.example
├── .gitignore
├── .dockerignore
├── docker-compose.yml
├── package.json
├── turbo.json
├── tsconfig.json
├── pnpm.lock
├── LICENSE
└── README.md

That's the structure I'd use.


---

5. What auth.slyxup.online actually is  [pehle apps/api]

This is your backend — file location: slyxup.online/stack/auth.slyxup.online/  (repo: github.com/slyxup/stack — CF Worker)

Tech stack (CF ONLY as you requested):

Runtime       Cloudflare Workers (wrangler)
Language      TypeScript
Framework     Hono (fetch handler)
Database      Cloudflare D1 (SQLite at edge — drizzle-orm/sqlite-core)
KV            Cloudflare KV (sessions, rate-limit, cache)
Storage       Cloudflare R2 (future, >25MiB objects)
ORM           Drizzle ORM (d1-http, sqlite)
Validation    Zod
Password      Argon2id via WebCrypto / Workers-compatible
Session       D1 + KV (HttpOnly + Secure + SameSite cookies)
Logging       Pino / Workers observability (head_sampling_rate)
Testing       Vitest + wrangler dev
Config        wrangler.jsonc (compatibility_date, nodejs_compat, bindings)

The API should NOT contain React components.

It should only handle:

Authentication
Users
Sessions
OAuth
Email verification
Password reset
Projects
Publishable keys
Secret keys
Security
Rate limiting


---

6. Authentication features

Your V1 should have:

Email/password
Sign up
Sign in
Sign out
Current user
Sessions
Session refresh
Email verification
Forgot password
Reset password
Change password
Update profile
Delete account

Then OAuth:

Google
GitHub

Later:

Apple
Microsoft
Discord
GitLab
etc.

Don't implement 15 OAuth providers initially.


---

7. User vs developer/project

This is extremely important.

There are two completely different entities.

SlyxUp developer

This person uses:

slyxup login

They manage their projects.

Application user

This person uses:

<SignIn />

to log into an application that uses SlyxUp.

Architecture:

SlyxUp Developer
       │
       ▼
     CLI
       │
       ▼
Project
       │
       ▼
Publishable Key
       │
       ▼
Application
       │
       ▼
Application Users

Never mix these concepts in your database or API design.


---

8. Database — Cloudflare D1 (SQLite at edge) — CF ONLY

I'd use Cloudflare D1 (D1 is SQLite, not Postgres — PLAN updated per your CF request).
D1 quirks: no native BOOLEAN (use integer 0/1), JSON as TEXT, 100 bound params limit, FKs always enforced.

Core tables (sqliteTable):

developers
projects
project_members

users
user_profiles

sessions
accounts

verification_tokens
password_reset_tokens

oauth_accounts

api_keys

Potentially:

audit_logs
rate_limits
webhook_endpoints
webhook_deliveries

later.

A simplified relationship:

Developer
   │
   ├── Project
   │      │
   │      ├── API Keys
   │      └── Users
   │             │
   │             ├── Sessions
   │             ├── OAuth Accounts
   │             └── Verification
   │
   └── Project


---

9. Keys

You need at least two key concepts.

Publishable key

Safe to expose to frontend.

pk_test_xxxxx
pk_live_xxxxx

Example:

NEXT_PUBLIC_SLYXUP_PUBLISHABLE_KEY=pk_test_xxx

Secret key

Never expose to browser.

sk_test_xxxxx
sk_live_xxxxx

Server:

SLYXUP_SECRET_KEY=sk_live_xxx

The CLI can manage them:

slyxup keys create
slyxup keys list
slyxup keys revoke


---

10. React SDK

Developer installs:

npm install @slyxup/react @slyxup/ui

Then:

<SlyxUpProvider
  publishableKey="pk_test_xxx"
>
  <App />
</SlyxUpProvider>

Hooks:

const { isLoaded, isSignedIn } = useAuth();

const { user } = useUser();

const { session } = useSession();

Authentication:

await signIn({
  email,
  password,
});


---

11. Next.js SDK

Install:

npm install @slyxup/nextjs @slyxup/react @slyxup/ui

It should support:

App Router
Server Components
Server Actions
Route Handlers
Middleware
Cookies
SSR

Example:

const user = await currentUser();

And protected routes:

middleware.ts

with something like:

export default slyxupMiddleware();


---

12. UI package

Prebuilt components:

SignIn
SignUp
UserButton
UserProfile
ForgotPassword
ResetPassword
EmailVerification
SocialButtons

The UI should be built on top of the React SDK.

Dependency:

@slyxup/ui
      ↓
@slyxup/react
      ↓
@slyxup/core

Not:

@slyxup/react
      ↓
@slyxup/ui

Keep the dependency direction clean.


---

13. CLI

This is one of the most important pieces.

Initial commands:

slyxup login
slyxup logout

slyxup create
slyxup init

slyxup project create
slyxup project list
slyxup project delete

slyxup keys create
slyxup keys list
slyxup keys revoke

slyxup env pull
slyxup doctor

Eventually:

slyxup auth ...
slyxup project ...
slyxup keys ...

The CLI should be interactive where useful.


---

14. slyxup init

This is the most important existing-project command.

Suppose someone already has:

my-saas/
├── app/
├── components/
├── lib/
├── package.json
└── ...

They run:

npx @slyxup/cli init

CLI detects:

Framework: Next.js
Router: App Router
Language: TypeScript
Package manager: Pnpm

Then:

? Connect to SlyxUp project
❯ Create new project
  Select existing project

Then:

✓ Project linked
✓ Publishable key created
✓ SDK installed
✓ Environment configured

It should be idempotent.

Running again:

slyxup init

should not destroy anything.


---

15. CLI configuration

Don't store tokens randomly in the project.

For example:

~/.config/slyxup/
├── config.json
└── credentials.json

The CLI stores the developer's CLI authentication there.

Project-specific configuration can live in:

.slyxup/

if needed.

Example:

.slyxup/
└── project.json

Never commit credentials.


---

16. examples

These are not production applications.

They are:

examples/nextjs
examples/react

They demonstrate:

Basic setup
Sign in
Sign up
User information
Sign out
Protected page

They also serve as integration tests.


---

17. stack.slyxup.online  [pehle apps/web] — CF Pages/Workers

This is the part you were asking about.

It's your public marketing website ONLY:

https://stack.slyxup.online  (ONLY marketing — is repo ka landing UI yahi rahega)
File location: slyxup.online/stack/stack.slyxup.online/  (monorepo: Workspace/slyxup.online/stack/ — CF Pages, wrangler.jsonc assets)

Yaha Clerk jaisa dashboard / create-project / keys ka UI BILKUL NAHI hoga.

Tech:

Next.js
TypeScript
Tailwind
shadcn/ui
MDX

Pages (sirf marketing):

/
 /features
 /react
 /nextjs
 /cli
 /self-hosting
 /security
 /pricing
 /docs
 /blog
 /about

This is where your SEO content lives.

It does NOT handle authentication API requests itself.
It is deployed from stack/stack.slyxup.online/ in this repository.
No auth logic, no session handling — sirf static/marketing content.

> NOTE: Landing UI domain is stack.slyxup.online — ONLY marketing. Auth ka sara kaam auth.slyxup.online (stack/auth.slyxup.online/) par hoga.
> billing.slyxup.online future placeholder — stack/billing.slyxup.online/
> auth.slyxup.online ka use API + Hosted Pages ke liye hai, stack.slyxup.online ka nahi.


---

18. auth.slyxup.online — API + Hosted Auth domain  [pehle apps/api] — CF Worker + D1 + KV

Actual API + Hosted Pages (single domain, CF Worker):

https://auth.slyxup.online
File location: slyxup.online/stack/auth.slyxup.online/  (monorepo: Workspace/slyxup.online/stack/ — wrangler.jsonc, D1 slyxup_auth)
# Pehle api.auth.slyxup.online tha, ab direct auth.slyxup.online par shift kar diya
# api.auth.slyxup.online deprecated — redirect to auth.slyxup.online if needed

API routes (SDK isi ko hit karega):

/v1/auth/sign-up
/v1/auth/sign-in
/v1/auth/sign-out

/v1/session
/v1/user

/v1/oauth/*
/v1/verification/*
/v1/password/*

/v1/projects/*
/v1/keys/*

Hosted Auth Pages (embed na karne walo ke liye):

/sign-in          -> Hosted Sign In page
/sign-up          -> Hosted Sign Up page
/verify           -> Email verification page
/forgot-password  -> Forgot/Reset flow
/sso-callback     -> OAuth callback handler (Google/GitHub ke baad yaha aayega, phir cookie set karke developer ke callback URL par redirect)
/sign-out         -> Sign out + redirect

Flow for hosted mode:

1. Developer apne app se redirect karta hai:
   https://auth.slyxup.online/sign-in?redirect_url=https://myapp.com/callback&publishable_key=pk_xxx
2. User wahi page par login karta hai
3. Server HttpOnly + Secure + SameSite cookie set karta hai (auth.slyxup.online domain par)
4. Phir redirect: https://myapp.com/callback?session=... ya cookie ke saath
5. Developer ka app SDK se session verify karta hai (fetch to https://auth.slyxup.online/v1/session)

Version the API from day one:

/v1/

because eventually you may need:

/v2/


---

19. Environment variables

API:

NODE_ENV=production

PORT=3000

DATABASE_URL=postgresql://...

APP_URL=https://stack.slyxup.online

API_URL=https://auth.slyxup.online

CORS_ORIGINS=https://stack.slyxup.online

# Hosted auth ke liye additional env:
HOSTED_AUTH_URL=https://auth.slyxup.online
# Callback URLs whitelist (developer ke app ke redirects):
ALLOWED_REDIRECT_ORIGINS=https://myapp.com,https://example.com

SESSION_SECRET=...

ENCRYPTION_KEY=...

GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...

GITHUB_CLIENT_ID=...
GITHUB_CLIENT_SECRET=...

SMTP_HOST=...
SMTP_PORT=...
SMTP_USER=...
SMTP_PASSWORD=...
SMTP_FROM=...

Self-hosted users can replace these with their own values.

Never put:

SESSION_SECRET
DATABASE_URL
OAuth client secret
SMTP password
encryption key

into frontend variables.


---

20. Email

Authentication requires email infrastructure.

You need an abstraction:

EmailService

so the server isn't permanently tied to one provider.

For example:

SMTP
Resend
Amazon SES
Postmark
custom SMTP

The developer configures their provider.

Hosted SlyxUp can eventually provide managed email delivery.


---

21. Security

This cannot be treated as an afterthought.

At minimum:

Argon2id password hashing
Secure random tokens
HttpOnly cookies
Secure cookies
SameSite protection
CSRF protection where applicable
Rate limiting
Brute-force protection
OAuth state validation
PKCE where applicable
Input validation
CORS configuration
Security headers
Session revocation
Token expiration
Audit logging

And never:

plain-text passwords
JWTs containing passwords
secret keys in frontend
long-lived browser secrets

For an auth product, security testing should be a separate phase before calling it production-ready.


---

22. Cloudflare — WRANGLER + D1 (CF ONLY — no Docker/Postgres)

Root: no docker-compose.yml (CF Workers don't use Docker)

Conceptually (CF):

wrangler.jsonc (per domain):
  auth.slyxup.online/wrangler.jsonc  → bindings: DB (D1 slyxup_auth), KV, R2
  stack.slyxup.online/wrangler.jsonc → assets: .next (Pages)
  billing.slyxup.online/wrangler.jsonc → D1 slyxup_billing (future)

D1:
  wrangler d1 create slyxup_auth
  wrangler d1 migrations apply slyxup_auth --remote
  drizzle-kit generate (dialect sqlite, driver d1-http)

No Docker, no postgres container — D1 is SQLite at edge. For self-hosters: wrangler dev + D1 local.


---

23. Deployment — CLOUDFLARE ONLY (wrangler)

For the API + Hosted Pages (CF Worker):

GitHub
github.com/slyxup/stack  (monorepo root: slyxup.online/stack/ → Workspace/slyxup.online/stack/)
        ↓
wrangler deploy (per domain, wrangler.jsonc)
  pnpm --filter auth.slyxup.online deploy  → wrangler deploy (context: slyxup.online/stack/auth.slyxup.online/)
        ↓
Cloudflare Workers + D1 (slyxup_auth) + KV
        ↓
auth.slyxup.online  (API: /v1/*  + Hosted Pages: /sign-in, /sso-callback etc.) — route: auth.slyxup.online/*

For website (marketing ONLY - no dashboard) — CF Pages/Workers:

GitHub
github.com/slyxup/stack
        ↓
Next.js build + opennextjs-cloudflare (context: slyxup.online/stack/stack.slyxup.online/)
  pnpm --filter stack.slyxup.online deploy
        ↓
Cloudflare Pages/Workers
        ↓
stack.slyxup.online  (sirf marketing pages - no project/keys UI) — route: stack.slyxup.online/*

For billing (future) — CF Worker:

GitHub
github.com/slyxup/stack
        ↓
wrangler deploy (context: slyxup.online/stack/billing.slyxup.online/)
        ↓
billing.slyxup.online (placeholder — V1 me disabled) — D1 slyxup_billing

These should be deployed separately via wrangler.
slyxup.online is now the monorepo root (Workspace/slyxup.online/) containing stack/ — not a separate untouch project anymore (moved inside as you requested).


---

24. Root directory — DOMAIN BASED (CF Workers)

For a monorepo deployment — root is slyxup.online/stack/  (inside slyxup.online as you requested — CF Workers):

Root Directory: slyxup.online/stack/   [repo: Workspace/slyxup.online/stack/ → github.com/slyxup/stack]

API build (CF Worker — no Docker):

pnpm install --frozen-lockfile && pnpm --filter auth.slyxup.online typegen && pnpm build

API dev:

pnpm --filter auth.slyxup.online dev   →  wrangler dev (local D1 + KV)

Deploy:

pnpm --filter auth.slyxup.online deploy  →  wrangler deploy (needs D1_ID, KV_ID, secrets via wrangler secret put)

Root package.json (in slyxup.online/stack/):

{
  "scripts": {
    "dev": "turbo dev",
    "build": "turbo build",
    "deploy": "turbo deploy",
    "dev:auth": "pnpm --filter auth.slyxup.online dev",
    "dev:stack": "pnpm --filter stack.slyxup.online dev",
    "dev:billing": "pnpm --filter billing.slyxup.online dev",
    "deploy:auth": "pnpm --filter auth.slyxup.online deploy",
    "db:generate": "drizzle-kit generate",
    "db:migrate": "wrangler d1 migrations apply slyxup_auth --remote",
    "cf:typegen": "wrangler types"
  },
  "workspaces": ["auth.slyxup.online", "stack.slyxup.online", "billing.slyxup.online", "packages/*"]
}

CF: wrangler.jsonc per domain (auth.slyxup.online/wrangler.jsonc, stack.slyxup.online/wrangler.jsonc)
  - compatibility_date: "2025-08-24", nodejs_compat, observability, d1_databases, kv_namespaces


---

25. Website deployment — DOMAIN BASED (CF Pages/Workers)

stack.slyxup.online:

Root directory:
 slyxup.online/stack/stack.slyxup.online   [monorepo path: Workspace/slyxup.online/stack/stack.slyxup.online — CF Pages]

Build:

pnpm --filter stack.slyxup.online build  →  next build + opennextjs-cloudflare build

Deploy:

pnpm --filter stack.slyxup.online deploy →  wrangler pages deploy / wrangler deploy (assets: .next)

Or deploy via Cloudflare Pages dashboard (wrangler.jsonc assets).

So:

stack.slyxup.online  (marketing ONLY - no dashboard)
        ↓
slyxup.online/stack/stack.slyxup.online/  → Workspace/slyxup.online/stack/stack.slyxup.online/  (CF Pages)

and:

auth.slyxup.online  (API + Hosted Auth Pages — CF Worker + D1)
        ↓
slyxup.online/stack/auth.slyxup.online/  → Workspace/slyxup.online/stack/auth.slyxup.online/  (Hono Worker + wrangler.jsonc)

and (future):

billing.slyxup.online  (CF Worker + D1)
        ↓
slyxup.online/stack/billing.slyxup.online/ → Workspace/slyxup.online/stack/billing.slyxup.online/


---

26. CI/CD

.github/workflows/ci.yml should check:

Install
TypeScript
Lint
Unit tests
Build all packages
Build API
Build website
Build examples

PR:

GitHub PR
   ↓
CI
   ├── typecheck
   ├── lint
   ├── test
   └── build

Only merge if everything passes.


---

27. npm release

.github/workflows/release.yml can eventually publish:

@slyxup/core
@slyxup/react
@slyxup/nextjs
@slyxup/ui
@slyxup/cli
@slyxup/billing  (future — from stack/packages/billing)

Use changesets or another versioning system.

Example:

packages/

change:

@slyxup/react 0.4.0

without forcing unrelated packages to release unnecessarily.


---

28. Versioning

Don't launch as 1.0.0 immediately.

Start:

0.1.0

Then:

0.2.0
0.3.0
...
1.0.0

Once:

API stable
SDK stable
sessions stable
database migrations stable
security reviewed
self-hosting tested

then 1.0.0.


---

29. Open-source licensing

You want:

github.com/slyxup/stack  (monorepo — contains auth + billing)

public. (legacy: github.com/slyxup/auth now part of stack)

I'd choose either:

Apache-2.0

or:

MIT

For maximum developer adoption, MIT is simplest.

For a serious infrastructure project where you care about explicit patent licensing, Apache-2.0 is worth considering.

Don't invent your own license.


---

30. What is NOT in V1

This is important because otherwise the project will explode.

Don't initially build:

Dashboard
Organizations
Enterprise SSO
SAML
SCIM
Billing
Teams
Advanced analytics
10+ OAuth providers
Passkeys
Mobile SDK
Vue SDK
Svelte SDK
React Native SDK
Multi-region infrastructure
Complex admin panel

You can build them later.

V1 should be:

Email/password
Google
GitHub

Sign up
Sign in
Sign out

Sessions
Current user

Email verification
Password reset

React SDK
Next.js SDK

Prebuilt UI

CLI

Self-hosting

Docker

PostgreSQL

That's already a serious product.


---

31. Final dependency graph

This is the most important picture:

SLYXUP STACK (auth + billing)
                              │
              ┌───────────────┼────────────────┬──────────┐
              │               │                │          │
         Auth API          CLI             Website    Billing API
           Hono           @slyxup/cli       Next.js    (future)
              │               │                │          │
              │               │                │          │
          PostgreSQL      Management API              PostgreSQL/Stripe
              │
              │
        @slyxup/core
              │
        ┌─────┴─────┐
        │           │
 @slyxup/react   @slyxup/nextjs
        │           │
        ▼           │
   @slyxup/ui   @slyxup/billing (future)
        │
   @slyxup/billing depends on core

And deployment — DOMAIN BASED (renamed auth → stack for billing future):

Workspace/
├── slyxup.online/  → clean sibling (https://slyxup.online — untouch)
└── stack/          → github.com/slyxup/stack  (monorepo root)
        │
        ┌───────────┼────────────┬──────────────┐
        │           │            │              │
stack.slyxup.online auth.slyxup.online billing.slyxup.online packages/*
(marketing ONLY)  (API + Hosted Pages) (future)
        │           │            │              │
        ▼           ▼            ▼              ▼
stack/          stack/         stack/         npm
stack.slyxup.   auth.slyxup.   billing.slyxup. @slyxup/*
online          online         online
   │               │              │ (placeholder)
Website        Hono API +        Billing API
               /sign-in          (Stripe)
                  │
                  ▼
             PostgreSQL


---

32. Developer experience you're ultimately targeting

A brand-new Next.js project:

npx create-next-app my-app
cd my-app

npx @slyxup/cli init

Then:

✓ Next.js detected
✓ TypeScript detected
✓ SlyxUp project created
✓ Publishable key created
✓ @slyxup/react installed
✓ @slyxup/nextjs installed
✓ @slyxup/ui installed
✓ Environment configured

SlyxUp Auth is ready.

Existing large project:

cd existing-project

npx @slyxup/cli init

It doesn't rebuild anything.

It detects and integrates.

Then developer can use:

<SlyxUpProvider>
  <SignIn />
</SlyxUpProvider>

or completely custom:

const { signIn } = useAuth();

Self-hosting:

git clone https://github.com/slyxup/stack.git
cd stack
cp .env.example .env
docker compose up -d

Then:

Their application
      ↓
Their SlyxUp Auth
      ↓
Their PostgreSQL

Hosted (embedded mode):

Their application (with <SignIn />)
      ↓
auth.slyxup.online/v1/*  (API)
      ↓
Your infrastructure

Hosted Pages mode (bina embed ke):

User browser
      ↓
auth.slyxup.online/sign-in  (hosted page open hota hai)
      ↓
Login -> Cookie set -> Callback redirect
      ↓
https://myapp.com/callback -> SDK verifies session via auth.slyxup.online/v1/session

Marketing is separate:

User browser
      ↓
stack.slyxup.online (ONLY marketing/docs — no auth logic, no dashboard)

Billing is separate (future):

User browser
      ↓
billing.slyxup.online (placeholder — billing.slyxup.online/src/routes)

slyxup.online -> Workspace/slyxup.online/ clean sibling — isme kuch nahi karna (see stack/ monorepo)
stack/ -> Workspace/stack/ → github.com/slyxup/stack (auth + billing + marketing)

That is the complete product model.

One final architectural point: don't let an AI agent start by generating this entire repository. For this project, the correct build order is database/schema → API contract → core SDK → React → Next.js → UI → CLI → Docker/self-hosting → website/docs → CI/release. If you build in that order, each phase has something concrete to test before the next one depends on it.
