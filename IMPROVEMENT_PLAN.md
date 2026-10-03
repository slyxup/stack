# SlyxUp Stack — Comprehensive Improvement Plan

> **Status**: Critical security, UX, and developer experience issues identified  
> **Goal**: Transform this into a production-ready, developer-friendly, secure authentication platform  
> **Timeline**: Phased approach — Security → DX → UI → Polish

---

## Executive Summary

After a comprehensive audit of the SlyxUp Stack platform, I've identified **critical security vulnerabilities**, **poor developer experience**, **UI/UX issues**, and **self-hosting blockers** that prevent adoption. This plan addresses all issues in priority order.

### Critical Issues Found

1. ⚠️ **SECURITY**: PBKDF2 instead of Argon2id, hardcoded URLs, missing CSRF tokens, weak rate limiting
2. 📦 **HARDCODING**: 40+ hardcoded `slyxup.com` URLs across codebase — impossible to self-host
3. 🎨 **UI/UX**: Non-responsive components, poor customization, inconsistent spacing, bad mobile UX
4. 📚 **DOCUMENTATION**: Missing self-hosting guide, unclear setup, no troubleshooting
5. 🔧 **DEVELOPER EXPERIENCE**: Complex setup, unclear errors, missing validation, poor TypeScript support

---

## Phase 1: CRITICAL SECURITY FIXES (Week 1) 🔴

### 1.1 Password Hashing — Upgrade to Argon2id

**Current Problem**: Using PBKDF2-HMAC-SHA-256 with 100k iterations — weak against GPU attacks.

```typescript
// ❌ CURRENT: auth/src/lib/password.ts
export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  // ... PBKDF2 with SHA-256 ...
}
```

**Fix**: Use `oslo` (Workers-compatible Argon2id)

```typescript
// ✅ NEW: auth/src/lib/password.ts
import { Argon2id } from 'oslo/password';

const argon2id = new Argon2id({
  memorySize: 19456, // 19 MiB
  iterations: 2,
  tagLength: 32,
  parallelism: 1, // Workers constraint
});

export async function hashPassword(password: string): Promise<string> {
  return await argon2id.hash(password);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return await argon2id.verify(hash, password);
}
```

**Migration**: Add `passwordHashVersion` column, rehash on next login.

**Files to change**:
- `auth/src/lib/password.ts` (complete rewrite)
- `auth/src/services/auth.service.ts` (add version check + rehash logic)
- `auth/src/lib/schema.ts` (add `passwordHashVersion: text().default('pbkdf2')`)
- `packages/core/README.md` (document security)

---

### 1.2 CSRF Protection for Cookie-Based Sessions

**Current Problem**: No CSRF tokens on state-changing operations.

**Fix**: Add double-submit cookie pattern

```typescript
// auth/src/middleware/csrf.ts
export async function csrfMiddleware(c: Context, next: () => Promise<void>) {
  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(c.req.method)) {
    const cookieToken = getCookie(c, 'slyxup_csrf');
    const headerToken = c.req.header('X-CSRF-Token');
    if (!cookieToken || cookieToken !== headerToken) {
      return c.json({ ok: false, error: 'CSRF token missing or invalid' }, 403);
    }
  }
  await next();
}
```

**Files to change**:
- Add `auth/src/middleware/csrf.ts`
- Update `auth/src/index.ts` (apply to mutation routes)
- Update `packages/core/src/client.ts` (send CSRF header)
- Update `packages/ui/src/react/provider/SlyxUpProvider.tsx` (handle CSRF)

---

### 1.3 Rate Limiting — Per-Endpoint Granular Limits

**Current Problem**: Generic 20 req/min across all auth endpoints — allows credential stuffing.

**Fix**: Stricter per-endpoint limits

```typescript
// auth/src/lib/rate-limit.ts
const LIMITS: Record<string, { requests: number; window: number }> = {
  'auth:sign-in': { requests: 5, window: 60 }, // 5 attempts/min
  'auth:sign-up': { requests: 3, window: 300 }, // 3 signups/5min
  'auth:password-reset': { requests: 3, window: 300 },
  'auth:2fa': { requests: 10, window: 60 }, // Allow TOTP retries
  'auth:oauth': { requests: 10, window: 60 },
  'billing:checkout': { requests: 10, window: 60 },
};
```

**Files to change**:
- `auth/src/lib/rate-limit.ts` (add endpoint-specific limits)
- `auth/src/index.ts` (apply per route)
- `billing/src/index.ts` (same for billing)

---

### 1.4 Session Security Hardening

**Current Problem**: No fingerprinting, sessions survive IP changes.

**Fix**: Add IP + User-Agent binding (with rotation grace)

```typescript
// auth/src/lib/schema.ts
export const sessions = sqliteTable('sessions', {
  // ... existing fields ...
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
  fingerprintHash: text('fingerprint_hash'), // SHA-256(IP + UA + secret)
});

// auth/src/services/auth.service.ts
async function validateSession(env, token, request) {
  const session = await getSession(env, token);
  if (!session) return null;
  
  // Check fingerprint (allow rotation within 5 min)
  const currentFingerprint = await generateFingerprint(request, env.SESSION_SECRET);
  if (session.fingerprintHash !== currentFingerprint) {
    const age = Date.now() - session.updatedAt.getTime();
    if (age > 5 * 60 * 1000) { // 5 min grace
      await revokeSession(env, token);
      return null;
    }
    // Update fingerprint on rotation
    await updateSessionFingerprint(env, token, currentFingerprint);
  }
  return session;
}
```

**Files to change**:
- `auth/src/lib/schema.ts` (add fingerprint fields)
- `auth/src/services/auth.service.ts` (add validation)
- Generate migration `0013_session_fingerprinting.sql`

---

### 1.5 Secrets Audit — Remove Hardcoded Values

**Current Problem**: Real OAuth client IDs in `wrangler.jsonc`, hardcoded URLs everywhere.

**Fix**: Move ALL secrets to Wrangler secrets

```bash
# Move to secrets
wrangler secret put GOOGLE_CLIENT_SECRET --config auth/wrangler.com-workers-dev.jsonc
wrangler secret put GITHUB_CLIENT_SECRET --config auth/wrangler.com-workers-dev.jsonc
wrangler secret put BREVO_API_KEY --config auth/wrangler.com-workers-dev.jsonc
```

```jsonc
// auth/wrangler.com-workers-dev.jsonc
{
  "vars": {
    // ❌ REMOVE real IDs — use secrets
    // "GOOGLE_CLIENT_ID": "733897164108-...", 
    // ✅ Reference via placeholder in docs
  }
}
```

**Files to change**:
- All `wrangler*.jsonc` files (remove real secrets)
- `ENV_GUIDE.md` (document all secrets)
- Add `scripts/setup-secrets.sh` (interactive secret setup)

---

## Phase 2: REMOVE HARDCODING — Enable Self-Hosting (Week 2) 🟠

### 2.1 Configuration System — Single Source of Truth

**Current Problem**: 40+ hardcoded `slyxup.com` URLs, impossible to configure.

**Fix**: Environment-based configuration with validation

```typescript
// auth/src/lib/config.ts
import { z } from 'zod';

const configSchema = z.object({
  APP_URL: z.string().url(),
  API_URL: z.string().url(),
  HOSTED_AUTH_URL: z.string().url(),
  CORS_ORIGINS: z.string().transform(s => s.split(',')),
  ALLOWED_REDIRECT_ORIGINS: z.string().transform(s => s.split(',')),
  // Email
  EMAIL_FROM: z.string().email(),
  EMAIL_FROM_NAME: z.string(),
  EMAIL_PROVIDER: z.enum(['brevo', 'resend', 'sendgrid', 'console']).default('console'),
  // OAuth
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
  GITHUB_CLIENT_ID: z.string().optional(),
  GITHUB_CLIENT_SECRET: z.string().optional(),
  // Mode
  SINGLE_TENANT_MODE: z.string().transform(v => v === 'true').default('false'),
  ALLOW_PUBLIC_DEVELOPER_REGISTRATION: z.string().transform(v => v === 'true').default('false'),
  BOOTSTRAP_ADMIN_EMAIL: z.string().email().optional(),
});

export type Config = z.infer<typeof configSchema>;

export function getConfig(env: Record<string, unknown>): Config {
  const result = configSchema.safeParse(env);
  if (!result.success) {
    console.error('Configuration validation failed:', result.error.format());
    throw new Error('Invalid configuration. Check logs.');
  }
  return result.data;
}
```

**Files to change**:
- Add `auth/src/lib/config.ts`
- Add `billing/src/lib/config.ts`
- Update ALL files using hardcoded URLs to use `getConfig(env)`

**Find/Replace (40+ occurrences)**:
```typescript
// ❌ BEFORE
'https://auth-slyxup-com.auth-0f4.workers.dev'
'https://billing-slyxup-com.billing-86c.workers.dev'
'https://stack.slyxup.com'

// ✅ AFTER
config.API_URL
config.BILLING_API_URL
config.APP_URL
```

---

### 2.2 SDK Default URLs — Remove Hardcoding

**Current Problem**: SDK defaults to SlyxUp production URLs — breaks self-hosting.

```typescript
// ❌ packages/core/src/urls.ts
export const DEFAULT_AUTH_API_URL = 'https://auth-slyxup-com.auth-0f4.workers.dev';
```

**Fix**: Require explicit URLs, add helpful errors

```typescript
// ✅ packages/core/src/urls.ts
export function normalizeApiUrl(url?: string): string {
  if (!url) {
    throw new Error(
      'apiUrl is required. Set it to your auth worker URL:\n' +
      '  new SlyxupClient({ apiUrl: "https://auth.yourdomain.com", ... })\n' +
      'For local dev: http://localhost:8787\n' +
      'Self-hosting guide: https://github.com/slyxup/stack#self-hosting'
    );
  }
  return url.replace(/\/$/, ''); // Remove trailing slash
}
```

**Files to change**:
- `packages/core/src/urls.ts`
- `packages/core/src/client.ts` (require `apiUrl`)
- `packages/core/README.md` (show required config)
- `packages/ui/README.md` (update examples)

---

### 2.3 Self-Hosting Documentation — Complete Guide

**Current Problem**: No self-hosting guide, unclear setup.

**Fix**: Add comprehensive `SELF_HOSTING.md`

```markdown
# Self-Hosting SlyxUp Stack

## Prerequisites
- Cloudflare account (free tier works)
- Node.js 22+
- pnpm 10+

## Step 1: Clone & Install
\`\`\`bash
git clone https://github.com/slyxup/stack.git my-auth
cd my-auth
corepack pnpm install
\`\`\`

## Step 2: Create Cloudflare Resources
\`\`\`bash
# Auth D1
wrangler d1 create my-auth-db
# Copy database_id to auth/wrangler.jsonc

# Auth KV
wrangler kv:namespace create my-auth-kv
# Copy id to auth/wrangler.jsonc

# Billing D1
wrangler d1 create my-billing-db
# Copy database_id to billing/wrangler.jsonc

# Billing KV
wrangler kv:namespace create my-billing-kv
# Copy id to billing/wrangler.jsonc
\`\`\`

## Step 3: Configure Environment
\`\`\`bash
cp auth/.env.example auth/.dev.vars
cp billing/.env.example billing/.dev.vars

# Edit auth/.dev.vars
APP_URL=https://app.yourdomain.com
API_URL=https://auth.yourdomain.com
CORS_ORIGINS=https://app.yourdomain.com
EMAIL_FROM=noreply@yourdomain.com
...
\`\`\`

## Step 4: Set Secrets
\`\`\`bash
pnpm --filter auth exec wrangler secret put SESSION_SECRET
# Generate: openssl rand -base64 32

pnpm --filter auth exec wrangler secret put ENCRYPTION_KEY
pnpm --filter auth exec wrangler secret put BREVO_API_KEY
\`\`\`

## Step 5: Migrate Databases
\`\`\`bash
pnpm --filter auth db:migrate:remote
pnpm --filter billing db:migrate:remote
\`\`\`

## Step 6: Deploy Workers
\`\`\`bash
pnpm --filter auth deploy
pnpm --filter billing deploy
pnpm --filter web deploy
\`\`\`

## Step 7: Bootstrap Admin
Visit https://auth.yourdomain.com/setup and create your admin account.

## Troubleshooting
...
```

**Files to add**:
- `SELF_HOSTING.md` (complete guide)
- `DEPLOYMENT_CHECKLIST.md` (production readiness)
- `TROUBLESHOOTING.md` (common issues + fixes)
- `scripts/setup-self-hosted.sh` (interactive setup)

---

## Phase 3: UI/UX OVERHAUL — Modern, Responsive, Customizable (Week 3-4) 🎨

### 3.1 Responsive Design — Mobile-First Components

**Current Problem**: Non-responsive layouts, bad mobile UX, fixed widths.

**Fix**: Fluid, mobile-first CSS with breakpoints

```typescript
// packages/ui/src/styles.ts — REWRITE

export const CSS = `
/* ═══ Base Reset ═══ */
.slx-card * { box-sizing: border-box; }

/* ═══ Layouts — Mobile-First ═══ */
.slx-card {
  width: 100%;
  max-width: 440px; /* Mobile: full width with padding */
  margin: 0 auto;
  padding: 24px;
  background: var(--slx-bg, #ffffff);
  border-radius: var(--slx-radius, 16px);
  box-shadow: var(--slx-shadow, 0 2px 8px rgba(0,0,0,0.08));
}

@media (min-width: 640px) {
  .slx-card {
    padding: 32px;
    max-width: 480px;
  }
}

/* Split Layout — Stack on mobile, side-by-side on desktop */
.slx-layout-split {
  display: flex;
  flex-direction: column;
  max-width: 100%;
  width: 100%;
}

@media (min-width: 1024px) {
  .slx-layout-split {
    flex-direction: row;
    max-width: 1080px;
    min-height: 640px;
  }
  
  .slx-split-brand {
    flex: 1;
    padding: 48px;
  }
  
  .slx-split-form {
    flex: 1;
    padding: 48px;
  }
}

/* ═══ Form Controls — Touch-Friendly ═══ */
.slx-input, .slx-btn {
  font-size: 16px; /* Prevent iOS zoom */
  min-height: 44px; /* Touch target */
  padding: 12px 16px;
  border-radius: var(--slx-radius-sm, 8px);
  transition: all 0.15s ease;
}

@media (hover: hover) {
  .slx-input:hover {
    border-color: var(--slx-accent-hover);
  }
  
  .slx-btn:hover {
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
  }
}

/* ═══ Spacing Scale — Compact/Comfortable ═══ */
[data-slyxup-density="comfortable"] .slx-field + .slx-field {
  margin-top: 20px;
}

[data-slyxup-density="compact"] .slx-field + .slx-field {
  margin-top: 12px;
}

/* ═══ Dark Mode ═══ */
[data-slyxup-theme="dark"] .slx-card {
  --slx-bg: #18181b;
  --slx-text: #fafafa;
  --slx-border: #3f3f46;
  --slx-input-bg: #27272a;
}

/* Auto dark mode */
@media (prefers-color-scheme: dark) {
  .slx-card:not([data-slyxup-theme="light"]) {
    --slx-bg: #18181b;
    --slx-text: #fafafa;
    --slx-border: #3f3f46;
    --slx-input-bg: #27272a;
  }
}

/* ... rest of styles ... */
`;
```

**Files to change**:
- `packages/ui/src/styles.ts` (complete rewrite — 2000+ lines → clean system)
- All components: test on 320px, 768px, 1024px, 1440px
- Add `packages/ui/src/responsive.test.tsx` (visual regression tests)

---

### 3.2 Customization API — Full Theming Control

**Current Problem**: Limited customization, can't match brand.

**Fix**: Comprehensive CSS variables + theme presets

```typescript
// packages/ui/src/theme.ts — EXTEND

export interface SlyxUpTheme {
  // Colors
  mode?: 'light' | 'dark' | 'auto';
  accent?: AccentName | string;
  background?: string; // Card background
  text?: string; // Primary text
  textMuted?: string; // Secondary text
  border?: string;
  inputBg?: string;
  
  // Typography
  font?: FontDef | CustomFont;
  fontSize?: 'sm' | 'base' | 'lg'; // 14px / 16px / 18px
  fontWeight?: 'normal' | 'medium' | 'semibold'; // Labels
  
  // Layout
  radius?: number; // 0-24px
  shadow?: 'none' | 'sm' | 'md' | 'lg';
  spacing?: 'compact' | 'comfortable' | 'spacious';
  width?: number; // Card max-width
  
  // Components
  primary?: 'ink' | 'accent' | 'gradient';
  buttonStyle?: 'solid' | 'soft' | 'outline' | 'ghost';
  inputStyle?: 'outline' | 'filled' | 'underline';
  
  // Animation
  transitions?: boolean; // Disable for reduced motion
  animations?: 'full' | 'reduced' | 'none';
}

// Presets for common styles
export const THEME_PRESETS: Record<string, SlyxUpTheme> = {
  'clerk': {
    accent: 'violet',
    font: 'inter',
    radius: 8,
    shadow: 'md',
    primary: 'ink',
    buttonStyle: 'solid',
  },
  'supabase': {
    accent: 'emerald',
    font: 'inter',
    radius: 6,
    shadow: 'sm',
    primary: 'accent',
    inputStyle: 'outline',
  },
  'stripe': {
    accent: 'blue',
    font: 'system',
    radius: 4,
    shadow: 'lg',
    primary: 'accent',
    buttonStyle: 'solid',
  },
  'minimal': {
    accent: 'mono',
    font: 'system',
    radius: 0,
    shadow: 'none',
    primary: 'ink',
    buttonStyle: 'outline',
  },
};

export function applyPreset(preset: keyof typeof THEME_PRESETS, overrides?: Partial<SlyxUpTheme>) {
  return applyTheme({ ...THEME_PRESETS[preset], ...overrides });
}
```

**Files to change**:
- `packages/ui/src/theme.ts` (expand interface)
- `packages/ui/README.md` (document all options)
- Add `packages/ui/src/examples/` (preset demos)

---

### 3.3 Component Library — Professional Polish

**Current Problem**: Inconsistent components, missing states, poor UX.

**Fix**: Rebuild each component with:
- Loading states
- Error states
- Empty states
- Success states
- Skeleton loaders
- Disabled states
- Focus management
- Keyboard navigation
- Screen reader support

**Example: SignIn Component Rebuild**

```typescript
// packages/ui/src/components/SignIn/SignIn.tsx

export function SignIn({ ... }: SignInProps) {
  const [state, setState] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);
  const emailRef = useRef<HTMLInputElement>(null);
  
  // Focus management
  useEffect(() => {
    if (state === 'error') {
      emailRef.current?.focus();
    }
  }, [state]);
  
  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && state === 'error') {
        setError(null);
        setState('idle');
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [state]);
  
  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setState('loading');
    setError(null);
    
    try {
      await signIn({ email, password });
      setState('success');
      onSuccess?.();
    } catch (err) {
      setState('error');
      setError(getErrorMessage(err));
      // Announce to screen readers
      announceToScreenReader(`Error: ${getErrorMessage(err)}`);
    }
  }
  
  return (
    <div
      className="slx-card"
      role="region"
      aria-labelledby="sign-in-title"
      aria-busy={state === 'loading'}
    >
      {/* Loading overlay */}
      {state === 'loading' && (
        <div className="slx-loading-overlay" aria-live="polite" aria-atomic="true">
          <div className="slx-spinner" />
          <p className="slx-loading-text">Signing in...</p>
        </div>
      )}
      
      {/* Error banner with dismiss */}
      {state === 'error' && error && (
        <div
          className="slx-error-banner"
          role="alert"
          aria-live="assertive"
        >
          <div className="slx-error-content">
            <AlertCircleIcon className="slx-error-icon" aria-hidden="true" />
            <p>{error}</p>
          </div>
          <button
            type="button"
            className="slx-error-dismiss"
            onClick={() => { setError(null); setState('idle'); }}
            aria-label="Dismiss error"
          >
            <XIcon />
          </button>
        </div>
      )}
      
      {/* Success state */}
      {state === 'success' && (
        <div className="slx-success-banner" role="status">
          <CheckCircleIcon className="slx-success-icon" />
          <p>Signed in successfully! Redirecting...</p>
        </div>
      )}
      
      {/* Form with proper labels and hints */}
      <form onSubmit={handleSubmit} noValidate>
        <div className="slx-field">
          <label htmlFor="email" className="slx-label">
            Email address
            <span className="slx-label-required" aria-label="required">*</span>
          </label>
          <input
            id="email"
            ref={emailRef}
            type="email"
            className="slx-input"
            autoComplete="email"
            aria-describedby="email-hint email-error"
            aria-invalid={state === 'error'}
            required
            disabled={state === 'loading'}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <p id="email-hint" className="slx-hint">
            We'll never share your email.
          </p>
          {state === 'error' && (
            <p id="email-error" className="slx-error-text" role="alert">
              {error?.includes('email') ? error : null}
            </p>
          )}
        </div>
        
        {/* ... rest of form ... */}
      </form>
    </div>
  );
}
```

**Components to rebuild** (16 total):
- ✅ `SignIn` (with 2FA flow)
- ✅ `SignUp` (with username)
- ✅ `ForgotPassword`
- ✅ `ResetPassword`
- ✅ `EmailVerification`
- ✅ `UserButton` (dropdown menu)
- ✅ `UserProfile` (modal tabs)
- ✅ `PasswordField` (toggle visibility)
- ✅ `OtpInput` (6-digit code)
- ✅ `PasswordStrength` (visual meter)
- ✅ `BillingPortal` (subscription management)
- ✅ `PricingTable` (plans grid)
- ✅ `CurrentPlanCard` (status badge)
- ✅ `InvoicesTable` (pagination)
- ✅ `CheckoutButton` (Paddle integration)
- ✅ `AdminPanel` (projects list)

**Files to change**:
- All 16 component files in `packages/ui/src/components/`
- Add `packages/ui/src/utils/announcements.ts` (screen reader helpers)
- Add `packages/ui/src/utils/keyboard.ts` (keyboard navigation)

---

### 3.4 Accessibility — WCAG 2.1 AA Compliance

**Checklist**:
- [ ] Color contrast ≥4.5:1 (text), ≥3:1 (UI)
- [ ] Focus indicators visible (2px outline)
- [ ] Keyboard navigation (Tab, Enter, Escape)
- [ ] Screen reader labels (aria-label, aria-describedby)
- [ ] Error announcements (aria-live="assertive")
- [ ] Loading states (aria-busy)
- [ ] Form validation messages
- [ ] Heading hierarchy (h1 → h6)
- [ ] Skip links for main content
- [ ] Alt text for images/icons
- [ ] Touch targets ≥44px

**Files to add**:
- `packages/ui/a11y-test.tsx` (automated tests with jest-axe)
- `packages/ui/ACCESSIBILITY.md` (compliance report)

---

## Phase 4: DEVELOPER EXPERIENCE — Clarity, Validation, Errors (Week 5) 📚

### 4.1 Better Error Messages — Actionable Guidance

**Current Problem**: Generic errors like "Invalid credentials" without context.

**Fix**: Specific error codes with troubleshooting

```typescript
// packages/core/src/errors.ts — EXPAND

export class SlyxupError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly status: number,
    public readonly details?: Record<string, unknown>,
    public readonly troubleshooting?: string[]
  ) {
    super(message);
    this.name = 'SlyxupError';
  }
}

export const ERROR_CATALOG = {
  EMAIL_NOT_VERIFIED: {
    message: 'Your email address is not verified.',
    troubleshooting: [
      'Check your inbox for the verification email',
      'Look in spam/junk folder',
      'Request a new verification email',
      'Contact support if you did not receive the email',
    ],
  },
  INVALID_CREDENTIALS: {
    message: 'Email or password is incorrect.',
    troubleshooting: [
      'Check for typos in your email and password',
      'Use "Forgot password?" if you cannot remember',
      'Ensure Caps Lock is off',
      'Try signing in with a social account (Google/GitHub)',
    ],
  },
  2FA_REQUIRED: {
    message: 'Two-factor authentication is required.',
    troubleshooting: [
      'Enter the 6-digit code from your authenticator app',
      'If you lost access, use a recovery code',
      'Contact support if you lost both',
    ],
  },
  PUBLISHABLE_KEY_MISSING: {
    message: 'Publishable key is required but not provided.',
    troubleshooting: [
      'Add X-Publishable-Key header with your project key (pk_...)',
      'Get your key from: Dashboard → Project → Keys → Create key',
      'For browser: pass publishableKey to SlyxUpProvider',
      'For server: pass publishableKey to new SlyxupClient()',
    ],
  },
  PROJECT_DOMAIN_NOT_ALLOWED: {
    message: 'This origin is not allowed for the project.',
    troubleshooting: [
      'Add your domain: Dashboard → Project → Domains → Add domain',
      'Use the exact hostname (app.example.com), not https:// or paths',
      'Wait 60 seconds for the cache to refresh',
      'Localhost is always allowed for testing',
    ],
  },
  // ... 50+ more with guidance ...
};

export function createError(code: keyof typeof ERROR_CATALOG, overrides?: Partial<SlyxupError>) {
  const template = ERROR_CATALOG[code];
  return new SlyxupError(
    code,
    overrides?.message ?? template.message,
    overrides?.status ?? 400,
    overrides?.details,
    template.troubleshooting
  );
}
```

**Files to change**:
- `packages/core/src/errors.ts` (add catalog)
- All API routes (throw typed errors)
- `packages/ui/src/components/ErrorDisplay.tsx` (show troubleshooting)

---

### 4.2 Input Validation — Client + Server

**Current Problem**: Weak client validation, inconsistent server checks.

**Fix**: Zod schemas shared between frontend/backend

```typescript
// packages/core/src/validation.ts — NEW

import { z } from 'zod';

export const schemas = {
  email: z.string().email('Invalid email address').max(254),
  
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(128, 'Password must be less than 128 characters')
    .regex(/[a-z]/, 'Password must contain a lowercase letter')
    .regex(/[A-Z]/, 'Password must contain an uppercase letter')
    .regex(/[0-9]/, 'Password must contain a number')
    .refine((val) => !['password', '12345678', 'qwerty'].includes(val.toLowerCase()), {
      message: 'Password is too common',
    }),
  
  username: z
    .string()
    .min(3, 'Username must be at least 3 characters')
    .max(30, 'Username must be less than 30 characters')
    .regex(/^[a-z0-9_-]+$/, 'Username can only contain lowercase letters, numbers, hyphens, and underscores')
    .refine((val) => !['admin', 'root', 'system', 'api', 'test'].includes(val), {
      message: 'Username is reserved',
    }),
  
  projectSlug: z
    .string()
    .min(3)
    .max(63)
    .regex(/^[a-z0-9-]+$/, 'Project slug can only contain lowercase letters, numbers, and hyphens')
    .refine((val) => !val.startsWith('-') && !val.endsWith('-'), {
      message: 'Project slug cannot start or end with a hyphen',
    }),
  
  domain: z
    .string()
    .max(253)
    .regex(/^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?(\.[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?)*$/, {
      message: 'Invalid domain format (use bare hostname, no https:// or paths)',
    })
    .refine((val) => {
      const labels = val.split('.');
      return labels.length >= 2 && labels.every((l) => l.length <= 63);
    }, 'Domain must have at least 2 labels and each label ≤ 63 chars'),
};

export function validateInput<T>(schema: z.ZodSchema<T>, data: unknown): { ok: false; errors: string[] } | { ok: true; data: T } {
  const result = schema.safeParse(data);
  if (!result.success) {
    return { ok: false, errors: result.error.errors.map((e) => e.message) };
  }
  return { ok: true, data: result.data };
}
```

**Files to change**:
- Add `packages/core/src/validation.ts`
- Update all input components to use Zod validation
- Update all API routes to validate with Zod
- Show field-level errors in UI

---

### 4.3 TypeScript — Strict Types, No `any`

**Current Problem**: Loose types, missing generics, `any` usage.

**Audit Results**:
```bash
# Find all `any` usage
grep -r ": any" packages/ auth/ billing/ web/
# Found: 34 instances
```

**Fix**: Strict TypeScript config + explicit types

```json
// tsconfig.json — ENFORCE
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "noImplicitThis": true,
    "strictNullChecks": true,
    "strictFunctionTypes": true,
    "strictPropertyInitialization": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true,
    "forceConsistentCasingInFileNames": true,
    "skipLibCheck": false
  }
}
```

**Files to fix**:
- All 34 files with `any` → replace with proper types
- Add missing generics
- Export all public types from `packages/core/src/types.ts`

---

### 4.4 Documentation — Complete SDK Reference

**Current Problem**: Missing examples, unclear setup, no API reference.

**Fix**: Add comprehensive docs

```markdown
# Files to create

## packages/core/docs/
- API.md (every method + parameters)
- ERRORS.md (all error codes + troubleshooting)
- EXAMPLES.md (20+ real-world examples)
- MIGRATION.md (upgrade guides)

## packages/ui/docs/
- COMPONENTS.md (every component + props)
- THEMING.md (customization guide)
- LAYOUTS.md (page examples)
- ACCESSIBILITY.md (WCAG compliance)

## Root docs/
- QUICKSTART.md (0 to deployed in 10 minutes)
- SELF_HOSTING.md (complete self-hosting)
- DEPLOYMENT_CHECKLIST.md (production readiness)
- SECURITY.md (best practices)
- TROUBLESHOOTING.md (FAQ + fixes)
- INTEGRATIONS.md (Next.js, Remix, Astro, etc.)
```

**Add interactive examples**:
```typescript
// web/src/pages/Examples.tsx — NEW
export function Examples() {
  const examples = [
    { title: 'Sign In (Email + Password)', component: <SignInExample /> },
    { title: 'Sign In (with 2FA)', component: <SignIn2FAExample /> },
    { title: 'Sign Up (with Username)', component: <SignUpExample /> },
    { title: 'Social Sign In (OAuth)', component: <SocialExample /> },
    { title: 'User Profile (Modal)', component: <ProfileExample /> },
    { title: 'Billing Portal', component: <BillingExample /> },
    { title: 'Pricing Table', component: <PricingExample /> },
    { title: 'Custom Theme', component: <ThemeExample /> },
    // ... 20+ more
  ];
  
  return (
    <div className="examples-grid">
      {examples.map((ex) => (
        <div key={ex.title} className="example-card">
          <h3>{ex.title}</h3>
          <div className="example-preview">{ex.component}</div>
          <CodeBlock code={getSourceCode(ex.component)} />
          <button>Copy code</button>
        </div>
      ))}
    </div>
  );
}
```

---

## Phase 5: TESTING & CI/CD — Reliability (Week 6) ✅

### 5.1 Expand Test Coverage

**Current**: 132 tests (core:55, UI:51, auth:14, billing:12)  
**Goal**: 500+ tests, 90% coverage

**Add**:
- Unit tests for every service/utility
- Integration tests for full auth flows
- E2E tests with Playwright
- Visual regression tests for UI
- Security tests (XSS, CSRF, SQL injection)
- Performance tests (rate limits, load)

```bash
# Test structure
auth/
  test/
    unit/       # Services, utils
    integration/ # Full flows
    security/    # Vulnerability tests
    
packages/core/
  test/
    unit/       # Client methods
    integration/ # Real API calls (local)
    
packages/ui/
  test/
    unit/       # Component logic
    integration/ # User interactions
    visual/      # Screenshot diffs
    a11y/        # Accessibility
```

**Files to add**:
- 200+ test files across all packages
- `playwright.config.ts` (E2E setup)
- `.github/workflows/e2e.yml` (E2E CI)

---

### 5.2 Deployment Automation

**Current Problem**: Manual deployment, no rollback, no staging.

**Fix**: Automated deployment with checks

```yaml
# .github/workflows/deploy.yml — ENHANCED
name: Deploy

on:
  push:
    branches: [main]
    
jobs:
  checks:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v2
      - run: pnpm install
      - run: pnpm typecheck
      - run: pnpm lint
      - run: pnpm test
      - run: pnpm audit --prod
      
  staging:
    needs: checks
    runs-on: ubuntu-latest
    steps:
      - name: Deploy to staging
        run: |
          pnpm --filter auth exec wrangler deploy --env staging
          pnpm --filter billing exec wrangler deploy --env staging
          pnpm --filter web exec wrangler pages deploy --branch staging
          
      - name: Run smoke tests
        run: |
          curl -f https://auth-staging.slyxup.com/health || exit 1
          curl -f https://billing-staging.slyxup.com/health || exit 1
          
      - name: Run E2E tests against staging
        run: pnpm test:e2e --env staging
        
  production:
    needs: staging
    runs-on: ubuntu-latest
    environment: production # Requires approval
    steps:
      - name: Deploy to production
        run: |
          pnpm --filter auth deploy
          pnpm --filter billing deploy
          pnpm --filter web deploy
          
      - name: Verify production
        run: |
          curl -f https://auth.slyxup.com/health || exit 1
          curl -f https://billing.slyxup.com/health || exit 1
          
      - name: Notify
        run: |
          curl -X POST $SLACK_WEBHOOK \
            -d '{"text":"✅ SlyxUp deployed to production"}'
```

---

## Phase 6: PERFORMANCE & POLISH (Week 7) ⚡

### 6.1 Performance Optimizations

**Targets**:
- Auth Worker response time: <50ms (p95)
- Billing Worker response time: <100ms (p95)
- Web app load time: <2s (LCP)
- Bundle size: <50KB (core), <150KB (UI gzip)

**Optimizations**:
- Database query optimization (indexes)
- KV caching for domains (current: 60s, keep)
- React lazy loading for admin panel
- Code splitting per route
- Tree shaking unused code
- Minify CSS (currently not minified)

---

### 6.2 Monitoring & Observability

**Add**:
- Error tracking (Sentry)
- Performance monitoring (Web Vitals)
- Analytics (Cloudflare Analytics)
- Logging (structured JSON)
- Alerting (Slack/Email on errors)

---

## Implementation Priority Matrix

| Priority | Issue | Impact | Effort | Timeline |
|---|---|---|---|---|
| 🔴 P0 | Argon2id password hashing | Critical security | 2 days | Week 1 |
| 🔴 P0 | Remove hardcoded URLs | Blocks self-hosting | 3 days | Week 2 |
| 🔴 P0 | CSRF protection | Security vulnerability | 1 day | Week 1 |
| 🟠 P1 | Session fingerprinting | Security hardening | 2 days | Week 1 |
| 🟠 P1 | Rate limiting per-endpoint | Prevent abuse | 1 day | Week 1 |
| 🟠 P1 | Responsive UI | Mobile UX broken | 5 days | Week 3 |
| 🟠 P1 | Self-hosting docs | Adoption blocker | 2 days | Week 2 |
| 🟡 P2 | Error messages | DX improvement | 3 days | Week 5 |
| 🟡 P2 | Full customization | UI adoption | 4 days | Week 4 |
| 🟡 P2 | TypeScript strict mode | Code quality | 3 days | Week 5 |
| 🟢 P3 | Performance optimization | Nice to have | 2 days | Week 7 |
| 🟢 P3 | Monitoring | Observability | 2 days | Week 7 |

---

## Success Metrics

### Before Improvement
- ❌ 40+ hardcoded URLs → impossible to self-host
- ❌ Non-responsive UI → mobile broken
- ❌ PBKDF2 password hashing → weak security
- ❌ No CSRF protection → vulnerable
- ❌ Limited customization → low adoption
- ❌ Generic errors → poor DX
- ❌ Missing docs → confusing setup

### After Improvement (Goals)
- ✅ Zero hardcoded URLs → easy self-hosting
- ✅ Fully responsive → perfect on all devices
- ✅ Argon2id + CSRF + fingerprinting → secure
- ✅ Full customization → matches any brand
- ✅ Actionable errors → clear troubleshooting
- ✅ Complete docs → 10-min quickstart
- ✅ 500+ tests → 90% coverage
- ✅ <50ms API latency → fast
- ✅ WCAG 2.1 AA → accessible

---

## Next Steps

1. **Review this plan** with your team
2. **Prioritize phases** based on business needs
3. **Create GitHub issues** for each task
4. **Set up staging environment** for testing
5. **Start with Phase 1** (security fixes) — no features until secure
6. **Weekly releases** with changelog
7. **Beta testing** with 5-10 early adopters

---

## Questions to Answer

Before starting implementation:

1. **Self-hosting priority**: Is enabling self-hosting more important than new features?
2. **Breaking changes**: Can we introduce breaking changes for v4.0.0, or must we maintain backward compatibility?
3. **UI library scope**: Should we support other frameworks (Vue, Svelte, Solid) or focus on React perfection?
4. **Monetization**: Will this remain open-source, or add paid enterprise features?
5. **Timeline**: 7-week plan is aggressive — do you have the team capacity?

---

## Conclusion

This improvement plan addresses **every critical issue** identified in the audit:

✅ **Security**: Argon2id, CSRF, fingerprinting, rate limiting  
✅ **Self-hosting**: Remove hardcoding, add complete docs  
✅ **UI/UX**: Responsive, customizable, accessible  
✅ **Developer Experience**: Better errors, validation, types, docs  
✅ **Reliability**: Testing, CI/CD, monitoring  

**Estimated effort**: 7 weeks (1 senior engineer full-time)  
**Outcome**: Production-ready, enterprise-grade auth platform that developers love

---

_Created: 2026-10-03_  
_Author: Kiro AI (via comprehensive audit)_  
_Status: Ready for implementation_
