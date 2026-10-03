# SlyxUp Stack — Implementation Plan with Git & Deployment

> **Timeline**: 7 weeks (35 working days)  
> **Team**: 1 senior full-stack engineer  
> **Goal**: Transform from alpha → production-ready  

---

## Table of Contents

1. [Prerequisites & Setup](#prerequisites--setup)
2. [Week 1: Security Fixes](#week-1-security-fixes)
3. [Week 2: Self-Hosting](#week-2-self-hosting)
4. [Week 3-4: UI/UX Rebuild](#week-3-4-uiux-rebuild)
5. [Week 5: Developer Experience](#week-5-developer-experience)
6. [Week 6: Testing](#week-6-testing)
7. [Week 7: Performance & Monitoring](#week-7-performance--monitoring)
8. [Git Workflow](#git-workflow)
9. [Deployment Process](#deployment-process)
10. [Release Checklist](#release-checklist)

---

## Prerequisites & Setup

### Day 0: Environment Setup (2 hours)

```bash
# 1. Create implementation tracking branch
git checkout main
git pull origin main
git checkout -b epic/production-ready

# 2. Install all dependencies
corepack pnpm install --frozen-lockfile

# 3. Set up local development
cp auth/.env.example auth/.dev.vars
cp billing/.env.example billing/.dev.vars
cp web/.env.example web/.env

# Edit .dev.vars with local values
# AUTH_URL=http://localhost:8787
# BILLING_URL=http://localhost:8788
# etc.

# 4. Migrate local databases
pnpm --filter auth db:migrate:local
pnpm --filter billing db:migrate:local

# 5. Verify build works
pnpm typecheck
pnpm build
pnpm test

# 6. Start local dev servers (3 terminals)
# Terminal 1: Auth Worker
pnpm --filter auth dev

# Terminal 2: Billing Worker
pnpm --filter billing dev

# Terminal 3: Web app
pnpm --filter web dev

# 7. Verify health endpoints
curl http://localhost:8787/v1/health
curl http://localhost:8788/v1/health
open http://localhost:5173
```

### Create GitHub Project Board

```bash
# Create project tracking
gh project create --owner slyxup --title "SlyxUp v4.0 Production Ready"

# Add milestones
gh api repos/slyxup/stack/milestones -f title="v4.0.0-alpha.1 - Security" -f due_on="2026-10-10T00:00:00Z"
gh api repos/slyxup/stack/milestones -f title="v4.0.0-alpha.2 - Self-Hosting" -f due_on="2026-10-17T00:00:00Z"
gh api repos/slyxup/stack/milestones -f title="v4.0.0-beta.1 - UI/UX" -f due_on="2026-10-31T00:00:00Z"
gh api repos/slyxup/stack/milestones -f title="v4.0.0-rc.1 - DX" -f due_on="2026-11-07T00:00:00Z"
gh api repos/slyxup/stack/milestones -f title="v4.0.0 - Production" -f due_on="2026-11-21T00:00:00Z"
```

---

## Week 1: Security Fixes (Days 1-5)

### Day 1: Argon2id Password Hashing

**Branch**: `feat/argon2id-password-hashing`

#### Tasks

**1.1 Add oslo dependency** (15 min)

```bash
git checkout -b feat/argon2id-password-hashing

# Add oslo to auth package
cd auth
pnpm add oslo
cd ..

git add auth/package.json
git commit -m "feat(auth): add oslo for Argon2id password hashing"
```

**1.2 Rewrite password.ts** (1 hour)

```bash
# Edit: auth/src/lib/password.ts
```

```typescript
// auth/src/lib/password.ts — COMPLETE REWRITE
import { Argon2id } from 'oslo/password';

// Argon2id parameters (OWASP recommended for Workers)
const argon2id = new Argon2id({
  memorySize: 19456, // 19 MiB (adjust based on Worker memory limits)
  iterations: 2,
  tagLength: 32,
  parallelism: 1, // Workers are single-threaded
});

/**
 * Hash a password using Argon2id.
 * Format: $argon2id$v=19$m=19456,t=2,p=1$<salt>$<hash>
 */
export async function hashPassword(password: string): Promise<string> {
  return await argon2id.hash(password);
}

/**
 * Verify a password against a stored hash.
 * Supports both Argon2id (new) and PBKDF2 (legacy).
 */
export async function verifyPassword(
  password: string,
  storedHash: string
): Promise<boolean> {
  // Detect hash type
  if (storedHash.startsWith('$argon2id$')) {
    // New Argon2id hash
    return await argon2id.verify(storedHash, password);
  } else if (storedHash.includes(':')) {
    // Legacy PBKDF2 hash (salt:hash format)
    return await verifyPBKDF2(password, storedHash);
  }
  return false;
}

/**
 * Legacy PBKDF2 verification (for migration period).
 * Will be removed in v5.0.0.
 */
async function verifyPBKDF2(password: string, stored: string): Promise<boolean> {
  const [saltB64, hashB64] = stored.split(':');
  if (!saltB64 || !hashB64) return false;
  const salt = Uint8Array.from(atob(saltB64), (c) => c.charCodeAt(0));
  const expected = Uint8Array.from(atob(hashB64), (c) => c.charCodeAt(0));
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(password),
    'PBKDF2',
    false,
    ['deriveBits']
  );
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt, iterations: 100000, hash: 'SHA-256' },
    key,
    256
  );
  const hash = new Uint8Array(bits);
  if (hash.length !== expected.length) return false;
  let diff = 0;
  for (let i = 0; i < hash.length; i++) diff |= hash[i] ^ expected[i];
  return diff === 0;
}

/**
 * Check if a hash needs rehashing (legacy PBKDF2).
 */
export function needsRehash(storedHash: string): boolean {
  return !storedHash.startsWith('$argon2id$');
}
```

```bash
git add auth/src/lib/password.ts
git commit -m "feat(auth): implement Argon2id password hashing with PBKDF2 fallback"
```

**1.3 Add schema migration** (30 min)

```bash
# Edit: auth/src/lib/schema.ts
# Add passwordHashVersion column to users table
```

```typescript
// auth/src/lib/schema.ts — ADD to users table
export const users = sqliteTable('users', {
  // ... existing fields ...
  passwordHash: text('password_hash'),
  passwordHashVersion: text('password_hash_version')
    .notNull()
    .default('pbkdf2'), // 'pbkdf2' or 'argon2id'
  // ... rest of fields ...
});
```

```bash
# Generate migration
pnpm --filter auth db:generate

# This creates: auth/migrations/0013_password_hash_version.sql
# Review the SQL, then apply locally
pnpm --filter auth db:migrate:local

# Test migration on fresh DB
pnpm --filter auth exec wrangler d1 execute slyxup_auth_com --local --command "SELECT id, passwordHashVersion FROM users LIMIT 1;"

git add auth/src/lib/schema.ts auth/migrations/0013_*
git commit -m "feat(auth): add passwordHashVersion column for hash migration"
```

**1.4 Update auth service with rehashing** (2 hours)

```bash
# Edit: auth/src/services/auth.service.ts
```

```typescript
// auth/src/services/auth.service.ts — UPDATE signIn function

import { hashPassword, verifyPassword, needsRehash } from '../lib/password';

export async function signIn(
  env: { DB: D1Database },
  input: { email?: string; username?: string; password: string; projectId?: string }
): Promise<SignInResult> {
  // ... existing user lookup logic ...
  
  if (!user || !user.passwordHash) throw new Error('Invalid credentials');
  
  // Verify password (supports both Argon2id and legacy PBKDF2)
  const ok = await verifyPassword(input.password, user.passwordHash);
  if (!ok) throw new Error('Invalid credentials');
  
  // ... existing blocked/2FA/verification checks ...
  
  // Opportunistic rehash: upgrade PBKDF2 → Argon2id on successful login
  if (needsRehash(user.passwordHash)) {
    const newHash = await hashPassword(input.password);
    await db
      .update(users)
      .set({
        passwordHash: newHash,
        passwordHashVersion: 'argon2id',
        updatedAt: new Date(),
      })
      .where(eq(users.id, user.id))
      .catch((err) => {
        // Log but don't block login if rehash fails
        console.error('Failed to rehash password:', err);
      });
  }
  
  // ... rest of function (2FA or create session) ...
}
```

```bash
git add auth/src/services/auth.service.ts
git commit -m "feat(auth): auto-rehash PBKDF2 passwords to Argon2id on login"
```

**1.5 Update signup to use Argon2id** (15 min)

```typescript
// auth/src/services/auth.service.ts — UPDATE signUp function

export async function signUp(env, input) {
  // ... existing validation ...
  
  const passwordHash = await hashPassword(input.password);
  
  await db.insert(users).values({
    // ... existing fields ...
    passwordHash,
    passwordHashVersion: 'argon2id', // New signups use Argon2id
    // ... rest of fields ...
  });
  
  // ... rest of function ...
}
```

```bash
git add auth/src/services/auth.service.ts
git commit -m "feat(auth): use Argon2id for new user signups"
```

**1.6 Test & Deploy** (1 hour)

```bash
# Run tests
pnpm --filter auth test

# Manual test: Create new user + login
curl -X POST http://localhost:8787/v1/auth/sign-up \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"TestPassword123!","firstName":"Test"}'

# Verify hash format in DB
pnpm --filter auth exec wrangler d1 execute slyxup_auth_com --local \
  --command "SELECT passwordHash, passwordHashVersion FROM users WHERE email='test@example.com';"
# Should start with $argon2id$

# Update changelog
echo "### Security\n- Upgraded password hashing from PBKDF2 to Argon2id" >> auth/CHANGELOG.md

# Push branch
git push -u origin feat/argon2id-password-hashing

# Create PR
gh pr create \
  --title "feat(auth): Migrate to Argon2id password hashing" \
  --body "$(cat <<EOF
## Changes
- Replaced PBKDF2 with Argon2id (OWASP recommended)
- Added automatic rehashing on login (zero downtime migration)
- Added passwordHashVersion column for tracking

## Security Impact
- 🔐 Protects against GPU-based password cracking
- 🔄 Backward compatible (verifies old PBKDF2 hashes)
- ⚡ Auto-upgrades hashes on next login

## Testing
- [x] New signups use Argon2id
- [x] Old PBKDF2 hashes still verify
- [x] Successful login triggers rehash
- [x] Migration SQL applied to local DB

## Migration Plan
1. Deploy Workers (no DB downtime)
2. Apply migration to remote D1
3. Monitor rehash progress (expect 90% within 7 days)
4. Remove PBKDF2 fallback in v5.0.0

Resolves #1
EOF
)" \
  --label "security,breaking-change" \
  --milestone "v4.0.0-alpha.1 - Security"

# Wait for CI to pass, then merge
gh pr merge --squash --delete-branch
```

---

### Day 2: CSRF Protection

**Branch**: `feat/csrf-protection`

#### Tasks

**2.1 Create CSRF middleware** (1 hour)

```bash
git checkout main && git pull
git checkout -b feat/csrf-protection

# Create new file
mkdir -p auth/src/middleware
```

```typescript
// auth/src/middleware/csrf.ts — NEW FILE
import { getCookie, setCookie } from 'hono/cookie';
import type { Context, Next } from 'hono';
import { randomToken } from '../lib/crypto';

/**
 * CSRF protection middleware using double-submit cookie pattern.
 * Generates a random token, stores in cookie, validates header on mutations.
 */
export async function csrfMiddleware(c: Context, next: Next) {
  const method = c.req.method;
  
  // Generate CSRF token for all requests
  let csrfToken = getCookie(c, 'slyxup_csrf');
  if (!csrfToken) {
    csrfToken = randomToken(32);
    setCookie(c, 'slyxup_csrf', csrfToken, {
      httpOnly: false, // Must be readable by JS to send in header
      secure: true,
      sameSite: 'Lax',
      maxAge: 60 * 60 * 24, // 24 hours
      path: '/',
    });
  }
  
  // Validate CSRF token on state-changing methods
  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
    const headerToken = c.req.header('X-CSRF-Token');
    
    if (!headerToken || headerToken !== csrfToken) {
      return c.json(
        {
          ok: false,
          error: 'CSRF_TOKEN_INVALID',
          message: 'CSRF token missing or invalid. Include X-CSRF-Token header.',
        },
        403
      );
    }
  }
  
  // Add token to response header for convenience
  c.res.headers.set('X-CSRF-Token', csrfToken);
  
  await next();
}

/**
 * Exempt routes from CSRF (e.g., webhooks with signature validation).
 */
export function csrfExempt(c: Context, next: Next) {
  return next(); // Skip CSRF check
}
```

```bash
git add auth/src/middleware/csrf.ts
git commit -m "feat(auth): add CSRF protection middleware"
```

**2.2 Apply middleware to routes** (30 min)

```typescript
// auth/src/index.ts — ADD CSRF middleware

import { csrfMiddleware } from './middleware/csrf';

// Apply CSRF to all mutation routes (after CORS, before rate limit)
app.use('/v1/auth/*', csrfMiddleware);
app.use('/v1/user/*', csrfMiddleware);
app.use('/v1/projects/*', csrfMiddleware);
app.use('/v1/keys/*', csrfMiddleware);
app.use('/v1/sessions/*', csrfMiddleware);

// Existing routes...
```

```bash
git add auth/src/index.ts
git commit -m "feat(auth): enable CSRF protection on mutation routes"
```

**2.3 Update core SDK to send CSRF token** (1 hour)

```typescript
// packages/core/src/client.ts — UPDATE request method

export class SlyxupClient {
  private csrfToken?: string;
  
  private async request<T>(path: string, init?: RequestInit): Promise<T> {
    const url = `${this.apiUrl}${path}`;
    const headers = new Headers(init?.headers);
    
    // Add Authorization
    const token = this._getToken?.() ?? this._sessionToken;
    if (token) headers.set('Authorization', `Bearer ${token}`);
    
    // Add publishable/secret key
    if (this.publishableKey) headers.set('X-Publishable-Key', this.publishableKey);
    if (this.secretKey) headers.set('X-Secret-Key', this.secretKey);
    
    // Add CSRF token for mutations
    if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(init?.method ?? 'GET')) {
      if (this.csrfToken) {
        headers.set('X-CSRF-Token', this.csrfToken);
      }
    }
    
    const res = await fetch(url, { ...init, headers });
    
    // Capture CSRF token from response
    const newCsrfToken = res.headers.get('X-CSRF-Token');
    if (newCsrfToken) this.csrfToken = newCsrfToken;
    
    // ... rest of error handling ...
    return data;
  }
}
```

```bash
git add packages/core/src/client.ts
git commit -m "feat(core): send CSRF token on mutations"
```

**2.4 Update billing Worker** (30 min)

```bash
# Same CSRF middleware for billing
cp auth/src/middleware/csrf.ts billing/src/middleware/csrf.ts

# Apply to billing routes
# Edit: billing/src/index.ts
```

```bash
git add billing/src/middleware/csrf.ts billing/src/index.ts
git commit -m "feat(billing): add CSRF protection"
```

**2.5 Test & Deploy** (1 hour)

```bash
# Test CSRF rejection
curl -X POST http://localhost:8787/v1/auth/sign-in \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"test"}'
# Should return 403 CSRF_TOKEN_INVALID

# Test with token
CSRF=$(curl -s http://localhost:8787/v1/health | grep -o 'X-CSRF-Token: [^"]*' | cut -d' ' -f2)
curl -X POST http://localhost:8787/v1/auth/sign-in \
  -H "Content-Type: application/json" \
  -H "X-CSRF-Token: $CSRF" \
  -d '{"email":"test@example.com","password":"test"}'
# Should work

# Run tests
pnpm test

# Push & PR
git push -u origin feat/csrf-protection
gh pr create \
  --title "feat: Add CSRF protection to all mutation endpoints" \
  --body "Implements double-submit cookie pattern. Resolves #2" \
  --label "security" \
  --milestone "v4.0.0-alpha.1 - Security"
gh pr merge --squash --delete-branch
```

---

### Day 3: Rate Limiting Per-Endpoint

**Branch**: `feat/granular-rate-limiting`

#### Tasks

**3.1 Update rate limit config** (1 hour)

```typescript
// auth/src/lib/rate-limit.ts — REWRITE

export interface RateLimitConfig {
  requests: number;
  window: number; // seconds
}

export const RATE_LIMITS: Record<string, RateLimitConfig> = {
  // Auth endpoints — strict
  'auth:sign-in': { requests: 5, window: 60 }, // 5 attempts/min
  'auth:sign-up': { requests: 3, window: 300 }, // 3 signups/5min
  'auth:forgot-password': { requests: 3, window: 300 },
  'auth:reset-password': { requests: 5, window: 300 },
  'auth:verify-email': { requests: 10, window: 60 },
  'auth:resend-verification': { requests: 3, window: 300 },
  
  // 2FA — allow retries
  'auth:2fa-complete': { requests: 10, window: 60 },
  'auth:2fa-setup': { requests: 5, window: 300 },
  
  // OAuth — moderate
  'auth:oauth-start': { requests: 10, window: 60 },
  'auth:oauth-callback': { requests: 10, window: 60 },
  
  // Session management
  'session:create': { requests: 10, window: 60 },
  'session:list': { requests: 20, window: 60 },
  'session:revoke': { requests: 10, window: 60 },
  
  // User operations
  'user:update': { requests: 10, window: 60 },
  'user:delete': { requests: 3, window: 300 },
  'user:password-change': { requests: 5, window: 300 },
  
  // Project operations (admin)
  'project:create': { requests: 5, window: 300 },
  'project:update': { requests: 20, window: 60 },
  'project:delete': { requests: 3, window: 300 },
  
  // Keys
  'keys:create': { requests: 10, window: 60 },
  'keys:revoke': { requests: 10, window: 60 },
  'keys:resolve': { requests: 30, window: 60 }, // Higher for billing lookups
  
  // Billing
  'billing:checkout': { requests: 10, window: 60 },
  'billing:cancel-subscription': { requests: 5, window: 300 },
  'billing:refund': { requests: 3, window: 300 },
  
  // Webhooks — no limit (signature-validated)
  'webhook:paddle': { requests: 1000, window: 60 },
  
  // Default fallback
  'default': { requests: 20, window: 60 },
};

export async function checkRateLimit(
  kv: KVNamespace,
  endpoint: string,
  ip: string
): Promise<{ allowed: boolean; resetIn: number }> {
  const config = RATE_LIMITS[endpoint] ?? RATE_LIMITS.default;
  const key = `ratelimit:${endpoint}:${ip}`;
  
  // ... existing sliding window logic ...
  
  return { allowed, resetIn };
}
```

```bash
git add auth/src/lib/rate-limit.ts
git commit -m "feat(auth): implement per-endpoint rate limiting"
```

**3.2 Apply to routes** (2 hours)

```typescript
// auth/src/index.ts — UPDATE rate limiting

import { checkRateLimit, RATE_LIMITS } from './lib/rate-limit';

// Remove generic rate limiting, add per-route

app.post('/v1/auth/sign-in', async (c, next) => {
  const ip = c.req.header('CF-Connecting-IP') ?? 'unknown';
  const rl = await checkRateLimit(c.env.KV, 'auth:sign-in', ip);
  if (!rl.allowed) {
    return c.json(
      { ok: false, error: 'TOO_MANY_REQUESTS', message: 'Too many sign-in attempts. Try again later.' },
      { status: 429, headers: { 'Retry-After': String(rl.resetIn) } }
    );
  }
  return next();
}, ...);

app.post('/v1/auth/sign-up', async (c, next) => {
  const ip = c.req.header('CF-Connecting-IP') ?? 'unknown';
  const rl = await checkRateLimit(c.env.KV, 'auth:sign-up', ip);
  if (!rl.allowed) {
    return c.json(
      { ok: false, error: 'TOO_MANY_REQUESTS', message: 'Too many sign-up attempts. Try again later.' },
      { status: 429, headers: { 'Retry-After': String(rl.resetIn) } }
    );
  }
  return next();
}, ...);

// Repeat for all protected routes...
```

```bash
git add auth/src/index.ts
git commit -m "feat(auth): apply per-endpoint rate limits to all routes"
```

**3.3 Same for billing** (1 hour)

```bash
cp auth/src/lib/rate-limit.ts billing/src/lib/rate-limit.ts
# Edit billing/src/index.ts with billing-specific limits

git add billing/src/lib/rate-limit.ts billing/src/index.ts
git commit -m "feat(billing): add per-endpoint rate limiting"
```

**3.4 Test & Deploy** (1 hour)

```bash
# Test rate limit
for i in {1..6}; do
  curl -X POST http://localhost:8787/v1/auth/sign-in \
    -H "Content-Type: application/json" \
    -H "X-CSRF-Token: test" \
    -d '{"email":"test@example.com","password":"wrong"}'
  echo "Attempt $i"
done
# 6th attempt should return 429

# Push & PR
git push -u origin feat/granular-rate-limiting
gh pr create \
  --title "feat: Granular per-endpoint rate limiting" \
  --body "Prevents credential stuffing with strict login limits. Resolves #3" \
  --label "security" \
  --milestone "v4.0.0-alpha.1 - Security"
gh pr merge --squash --delete-branch
```

---

### Day 4: Session Fingerprinting

**Branch**: `feat/session-fingerprinting`

#### Tasks

**4.1 Add fingerprint fields to schema** (30 min)

```typescript
// auth/src/lib/schema.ts — UPDATE sessions table

export const sessions = sqliteTable('sessions', {
  // ... existing fields ...
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
  fingerprintHash: text('fingerprint_hash'), // SHA-256(IP + UA + secret)
  // ... rest of fields ...
});
```

```bash
pnpm --filter auth db:generate
pnpm --filter auth db:migrate:local

git add auth/src/lib/schema.ts auth/migrations/0014_*
git commit -m "feat(auth): add session fingerprinting fields"
```

**4.2 Generate fingerprints** (1 hour)

```typescript
// auth/src/lib/fingerprint.ts — NEW FILE

import { sha256Hex } from './crypto';

export async function generateFingerprint(
  request: Request,
  secret: string
): Promise<string> {
  const ip = request.headers.get('CF-Connecting-IP') ?? 'unknown';
  const ua = request.headers.get('User-Agent') ?? 'unknown';
  
  // Normalize User-Agent (remove version numbers for minor browser updates)
  const normalizedUA = ua
    .replace(/\d+\.\d+\.\d+/g, 'x.x.x') // Chrome/95.0.4638.69 → Chrome/x.x.x
    .substring(0, 200); // Limit length
  
  const raw = `${ip}:${normalizedUA}:${secret}`;
  return await sha256Hex(raw);
}

export function extractDeviceInfo(ua: string): {
  browser: string;
  os: string;
  device: string;
} {
  // Simple parser (or use 'ua-parser-js' if needed)
  let browser = 'Unknown';
  let os = 'Unknown';
  let device = 'Desktop';
  
  if (ua.includes('Chrome/')) browser = 'Chrome';
  else if (ua.includes('Firefox/')) browser = 'Firefox';
  else if (ua.includes('Safari/') && !ua.includes('Chrome')) browser = 'Safari';
  else if (ua.includes('Edge/')) browser = 'Edge';
  
  if (ua.includes('Windows')) os = 'Windows';
  else if (ua.includes('Mac OS X')) os = 'macOS';
  else if (ua.includes('Linux')) os = 'Linux';
  else if (ua.includes('Android')) os = 'Android';
  else if (ua.includes('iPhone') || ua.includes('iPad')) os = 'iOS';
  
  if (ua.includes('Mobile') || ua.includes('Android') || ua.includes('iPhone')) {
    device = 'Mobile';
  } else if (ua.includes('Tablet') || ua.includes('iPad')) {
    device = 'Tablet';
  }
  
  return { browser, os, device };
}
```

```bash
git add auth/src/lib/fingerprint.ts
git commit -m "feat(auth): add session fingerprinting utility"
```

**4.3 Update session creation** (1 hour)

```typescript
// auth/src/services/auth.service.ts — UPDATE signIn

import { generateFingerprint } from '../lib/fingerprint';

export async function signIn(env, input, request: Request): Promise<SignInResult> {
  // ... existing verification logic ...
  
  // Generate fingerprint
  const fingerprint = await generateFingerprint(request, env.SESSION_SECRET);
  const ip = request.headers.get('CF-Connecting-IP') ?? null;
  const ua = request.headers.get('User-Agent') ?? null;
  
  await db.insert(sessions).values({
    id: sessionId,
    userId: user.id,
    projectId: input.projectId ?? user.projectId ?? null,
    token: sessionToken,
    ipAddress: ip,
    userAgent: ua,
    fingerprintHash: fingerprint,
    expiresAt,
    createdAt: now,
    updatedAt: now,
  });
  
  return { user, sessionToken, expiresAt, requires2FA: false };
}
```

**4.4 Validate fingerprint on requests** (2 hours)

```typescript
// auth/src/services/auth.service.ts — UPDATE getSession

import { generateFingerprint } from '../lib/fingerprint';

export async function getSession(
  env: { DB: D1Database; SESSION_SECRET: string },
  token: string,
  request?: Request
) {
  const db = getDb(env);
  const session = await db
    .select()
    .from(sessions)
    .where(eq(sessions.token, token))
    .get();
  
  if (!session) return null;
  if (session.expiresAt < new Date()) {
    await db.delete(sessions).where(eq(sessions.token, token)).catch(() => {});
    return null;
  }
  
  // Validate fingerprint (with 5-minute grace period for IP changes)
  if (request && session.fingerprintHash) {
    const currentFingerprint = await generateFingerprint(request, env.SESSION_SECRET);
    if (session.fingerprintHash !== currentFingerprint) {
      // Check if session was recently created/updated (allow rotation)
      const age = Date.now() - new Date(session.updatedAt).getTime();
      if (age > 5 * 60 * 1000) { // 5 min grace
        // Fingerprint mismatch + old session = possible hijack
        await db.delete(sessions).where(eq(sessions.token, token)).catch(() => {});
        return null;
      }
      // Update fingerprint (user's IP/network changed)
      await db
        .update(sessions)
        .set({
          fingerprintHash: currentFingerprint,
          ipAddress: request.headers.get('CF-Connecting-IP') ?? session.ipAddress,
          userAgent: request.headers.get('User-Agent') ?? session.userAgent,
          updatedAt: new Date(),
        })
        .where(eq(sessions.id, session.id))
        .catch(() => {}); // Don't block if update fails
    }
  }
  
  // ... rest of user/profile fetch ...
}
```

```bash
git add auth/src/services/auth.service.ts
git commit -m "feat(auth): validate session fingerprints with rotation grace"
```

**4.5 Test & Deploy** (1 hour)

```bash
# Test: Login from different IPs should fail
# (Simulate with different X-Forwarded-For headers)

# Run tests
pnpm --filter auth test

# Push & PR
git push -u origin feat/session-fingerprinting
gh pr create \
  --title "feat(auth): Add session fingerprinting for hijack prevention" \
  --body "Binds sessions to IP + User-Agent with 5-min rotation grace. Resolves #4" \
  --label "security" \
  --milestone "v4.0.0-alpha.1 - Security"
gh pr merge --squash --delete-branch
```

---

### Day 5: Move Secrets Out of Git

**Branch**: `chore/remove-hardcoded-secrets`

#### Tasks

**5.1 Audit all secrets** (30 min)

```bash
# Find all potential secrets in wrangler configs
grep -r "CLIENT_ID\|CLIENT_SECRET\|API_KEY\|_TOKEN" auth/wrangler*.jsonc billing/wrangler*.jsonc

# Create secrets inventory
cat > SECRETS_INVENTORY.md << 'EOF'
# Secrets Inventory

## Auth Worker
- SESSION_SECRET (required)
- ENCRYPTION_KEY (required)
- GOOGLE_CLIENT_ID (optional, for OAuth)
- GOOGLE_CLIENT_SECRET (optional, for OAuth)
- GITHUB_CLIENT_ID (optional, for OAuth)
- GITHUB_CLIENT_SECRET (optional, for OAuth)
- BREVO_API_KEY (optional, for email)
- SENDGRID_API_KEY (optional, for email)
- RESEND_API_KEY (optional, for email)

## Billing Worker
- PADDLE_SANDBOX_API_KEY (required for test mode)
- PADDLE_SANDBOX_CLIENT_TOKEN (required for test mode)
- PADDLE_SANDBOX_WEBHOOK_SECRET (required for test mode)
- PADDLE_PRODUCTION_API_KEY (required for live mode)
- PADDLE_PRODUCTION_CLIENT_TOKEN (required for live mode)
- PADDLE_PRODUCTION_WEBHOOK_SECRET (required for live mode)
EOF

git add SECRETS_INVENTORY.md
git commit -m "docs: add secrets inventory"
```

**5.2 Create secret setup script** (1 hour)

```bash
# Create interactive script
```

```bash
#!/bin/bash
# scripts/setup-secrets.sh

set -e

echo "🔐 SlyxUp Stack — Secrets Setup"
echo "================================"
echo ""

# Check wrangler is installed
if ! command -v wrangler &> /dev/null; then
  echo "❌ wrangler not found. Install: npm install -g wrangler"
  exit 1
fi

# Choose environment
echo "Select environment:"
echo "1) Local dev (.dev.vars)"
echo "2) Staging (Wrangler secrets)"
echo "3) Production (Wrangler secrets)"
read -p "Choice [1]: " ENV_CHOICE
ENV_CHOICE=${ENV_CHOICE:-1}

if [ "$ENV_CHOICE" = "1" ]; then
  echo "Setting up local .dev.vars..."
  
  # Auth
  if [ ! -f auth/.dev.vars ]; then
    cp auth/.env.example auth/.dev.vars
  fi
  
  # Generate random secrets
  SESSION_SECRET=$(openssl rand -base64 32)
  ENCRYPTION_KEY=$(openssl rand -base64 32)
  
  echo "SESSION_SECRET=$SESSION_SECRET" >> auth/.dev.vars
  echo "ENCRYPTION_KEY=$ENCRYPTION_KEY" >> auth/.dev.vars
  
  # Prompt for OAuth (optional)
  read -p "Configure Google OAuth? [y/N]: " SETUP_GOOGLE
  if [ "$SETUP_GOOGLE" = "y" ]; then
    read -p "Google Client ID: " GOOGLE_ID
    read -p "Google Client Secret: " GOOGLE_SECRET
    echo "GOOGLE_CLIENT_ID=$GOOGLE_ID" >> auth/.dev.vars
    echo "GOOGLE_CLIENT_SECRET=$GOOGLE_SECRET" >> auth/.dev.vars
  fi
  
  # Same for GitHub
  read -p "Configure GitHub OAuth? [y/N]: " SETUP_GITHUB
  if [ "$SETUP_GITHUB" = "y" ]; then
    read -p "GitHub Client ID: " GITHUB_ID
    read -p "GitHub Client Secret: " GITHUB_SECRET
    echo "GITHUB_CLIENT_ID=$GITHUB_ID" >> auth/.dev.vars
    echo "GITHUB_CLIENT_SECRET=$GITHUB_SECRET" >> auth/.dev.vars
  fi
  
  # Billing
  if [ ! -f billing/.dev.vars ]; then
    cp billing/.env.example billing/.dev.vars
  fi
  
  read -p "Configure Paddle Sandbox? [y/N]: " SETUP_PADDLE
  if [ "$SETUP_PADDLE" = "y" ]; then
    read -p "Paddle Sandbox API Key: " PADDLE_KEY
    read -p "Paddle Sandbox Client Token: " PADDLE_TOKEN
    read -p "Paddle Sandbox Webhook Secret: " PADDLE_WEBHOOK
    echo "PADDLE_SANDBOX_API_KEY=$PADDLE_KEY" >> billing/.dev.vars
    echo "PADDLE_SANDBOX_CLIENT_TOKEN=$PADDLE_TOKEN" >> billing/.dev.vars
    echo "PADDLE_SANDBOX_WEBHOOK_SECRET=$PADDLE_WEBHOOK" >> billing/.dev.vars
  fi
  
  echo "✅ Local secrets configured in .dev.vars"
  
elif [ "$ENV_CHOICE" = "2" ] || [ "$ENV_CHOICE" = "3" ]; then
  ENV_NAME=$([ "$ENV_CHOICE" = "2" ] && echo "staging" || echo "production")
  CONFIG=$([ "$ENV_CHOICE" = "2" ] && echo "--env staging" || echo "--config wrangler.com-workers-dev.jsonc")
  
  echo "Setting up $ENV_NAME secrets..."
  
  # Auth secrets
  echo "📝 Auth Worker secrets:"
  read -sp "SESSION_SECRET (will generate if empty): " SESSION_SECRET
  echo
  SESSION_SECRET=${SESSION_SECRET:-$(openssl rand -base64 32)}
  echo "$SESSION_SECRET" | pnpm --filter auth exec wrangler secret put SESSION_SECRET $CONFIG
  
  read -sp "ENCRYPTION_KEY (will generate if empty): " ENCRYPTION_KEY
  echo
  ENCRYPTION_KEY=${ENCRYPTION_KEY:-$(openssl rand -base64 32)}
  echo "$ENCRYPTION_KEY" | pnpm --filter auth exec wrangler secret put ENCRYPTION_KEY $CONFIG
  
  # OAuth (optional)
  read -p "Setup Google OAuth secrets? [y/N]: " SETUP_GOOGLE
  if [ "$SETUP_GOOGLE" = "y" ]; then
    read -p "Google Client Secret: " GOOGLE_SECRET
    echo "$GOOGLE_SECRET" | pnpm --filter auth exec wrangler secret put GOOGLE_CLIENT_SECRET $CONFIG
  fi
  
  read -p "Setup GitHub OAuth secrets? [y/N]: " SETUP_GITHUB
  if [ "$SETUP_GITHUB" = "y" ]; then
    read -p "GitHub Client Secret: " GITHUB_SECRET
    echo "$GITHUB_SECRET" | pnpm --filter auth exec wrangler secret put GITHUB_CLIENT_SECRET $CONFIG
  fi
  
  # Billing secrets
  echo "📝 Billing Worker secrets:"
  read -p "Setup Paddle secrets? [y/N]: " SETUP_PADDLE
  if [ "$SETUP_PADDLE" = "y" ]; then
    read -p "Paddle Sandbox API Key: " PADDLE_KEY
    echo "$PADDLE_KEY" | pnpm --filter billing exec wrangler secret put PADDLE_SANDBOX_API_KEY $CONFIG
    
    read -p "Paddle Production API Key: " PADDLE_PROD_KEY
    echo "$PADDLE_PROD_KEY" | pnpm --filter billing exec wrangler secret put PADDLE_PRODUCTION_API_KEY $CONFIG
    
    # ... same for client tokens and webhook secrets ...
  fi
  
  echo "✅ $ENV_NAME secrets configured"
fi

echo ""
echo "🎉 Setup complete!"
echo "Next: pnpm dev (local) or pnpm deploy (remote)"
```

```bash
chmod +x scripts/setup-secrets.sh

git add scripts/setup-secrets.sh
git commit -m "chore: add interactive secrets setup script"
```

**5.3 Remove secrets from wrangler configs** (30 min)

```bash
# Edit all wrangler*.jsonc files — remove real values
# Example:
# - "GOOGLE_CLIENT_ID": "733897164108-...",  ❌ REMOVE
# + // GOOGLE_CLIENT_ID set via wrangler secret (see scripts/setup-secrets.sh)
```

```bash
git add auth/wrangler*.jsonc billing/wrangler*.jsonc
git commit -m "security: remove OAuth client IDs from version control"
```

**5.4 Update ENV_GUIDE.md** (1 hour)

```markdown
# ENV_GUIDE.md — UPDATE

## Secrets Management

All sensitive values MUST be set via Wrangler secrets, never committed to git.

### Local Development

Use `.dev.vars` files (gitignored):

\`\`\`bash
cd slyxup.com/stack
./scripts/setup-secrets.sh
# Choose option 1 (Local dev)
\`\`\`

### Production Deployment

Use Wrangler secrets:

\`\`\`bash
./scripts/setup-secrets.sh
# Choose option 3 (Production)
\`\`\`

Or manually:

\`\`\`bash
# Auth secrets
echo "your-random-secret" | pnpm --filter auth exec wrangler secret put SESSION_SECRET
echo "your-encryption-key" | pnpm --filter auth exec wrangler secret put ENCRYPTION_KEY

# OAuth secrets (if using)
echo "google-client-secret" | pnpm --filter auth exec wrangler secret put GOOGLE_CLIENT_SECRET
echo "github-client-secret" | pnpm --filter auth exec wrangler secret put GITHUB_CLIENT_SECRET

# Billing secrets
echo "paddle-api-key" | pnpm --filter billing exec wrangler secret put PADDLE_SANDBOX_API_KEY
\`\`\`

### Verify Secrets

\`\`\`bash
pnpm --filter auth exec wrangler secret list
pnpm --filter billing exec wrangler secret list
\`\`\`

Note: `wrangler secret list` shows names only, never values.
```

```bash
git add ENV_GUIDE.md
git commit -m "docs: update ENV_GUIDE with secrets management"
```

**5.5 Test & Deploy** (1 hour)

```bash
# Test script
./scripts/setup-secrets.sh
# Choose local, verify .dev.vars created

# Run local dev
pnpm dev:auth
# Verify no errors about missing secrets

# Push & PR
git push -u origin chore/remove-hardcoded-secrets
gh pr create \
  --title "security: Remove secrets from version control" \
  --body "Moves all OAuth/API keys to Wrangler secrets. Adds setup script. Resolves #5" \
  --label "security" \
  --milestone "v4.0.0-alpha.1 - Security"
gh pr merge --squash --delete-branch
```

---

### End of Week 1: Release v4.0.0-alpha.1

```bash
git checkout main
git pull origin main

# Create changeset
pnpm changeset

# Select:
# - @slyxup/stack-auth: major
# - @slyxup/core: major (breaking: CSRF token required)
# 
# Summary:
# Security hardening: Argon2id, CSRF, rate limiting, fingerprinting

# Version packages
pnpm exec changeset version

# Review changes
git diff

# Commit version bump
git add .
git commit -m "chore: release v4.0.0-alpha.1 (security hardening)"
git push origin main

# Tag release
git tag -a v4.0.0-alpha.1 -m "v4.0.0-alpha.1: Security Hardening

- Upgraded to Argon2id password hashing
- Added CSRF protection on all mutations
- Implemented per-endpoint rate limiting
- Added session fingerprinting
- Removed secrets from version control"

git push origin v4.0.0-alpha.1

# Deploy to production
pnpm --filter auth db:migrate:remote
pnpm --filter billing db:migrate:remote
pnpm --filter auth deploy
pnpm --filter billing deploy
pnpm --filter web deploy

# Verify health
curl https://auth-slyxup-com.auth-0f4.workers.dev/v1/health
curl https://billing-slyxup-com.billing-86c.workers.dev/v1/health

# Announce
gh release create v4.0.0-alpha.1 \
  --title "v4.0.0-alpha.1: Security Hardening" \
  --notes "$(cat <<EOF
## 🔐 Security Improvements

- **Argon2id**: Upgraded from PBKDF2 (automatic rehashing on login)
- **CSRF Protection**: All mutations now require CSRF token
- **Rate Limiting**: Per-endpoint limits prevent abuse
- **Session Fingerprinting**: Binds sessions to IP + User-Agent
- **Secrets**: Removed from git, added setup script

## ⚠️ Breaking Changes

- Core SDK now sends X-CSRF-Token header (auto-handled)
- Rate limits are stricter (5 login attempts/min)

## Migration

1. Update SDK: \`pnpm update @slyxup/core @slyxup/ui\`
2. Redeploy Workers (auto-rehashes passwords)
3. No user action required (seamless)

## Contributors

@ysr-hameed
EOF
)" \
  --prerelease
```

---

## Week 2: Self-Hosting (Days 6-10)

### Day 6: Configuration System

**Branch**: `feat/configuration-system`

```bash
git checkout -b feat/configuration-system

# Create config files
# auth/src/lib/config.ts
# billing/src/lib/config.ts
# (See detailed code in IMPROVEMENT_PLAN.md Phase 2.1)

# Find and replace all hardcoded URLs
# Use VS Code regex find/replace:
# Find: https://auth-slyxup-com\.auth-0f4\.workers\.dev
# Replace: ${config.API_URL}

# Test
pnpm typecheck
pnpm build

git add .
git commit -m "feat: add environment-based configuration system"
git push -u origin feat/configuration-system

gh pr create --title "feat: Configuration system for self-hosting" \
  --body "Removes 40+ hardcoded URLs. Resolves #6" \
  --milestone "v4.0.0-alpha.2 - Self-Hosting"

gh pr merge --squash --delete-branch
```

### Day 7-8: Remove Hardcoded URLs

**Branch**: `refactor/remove-hardcoded-urls`

```bash
# Replace all occurrences across:
# - auth/src/**/*.ts
# - billing/src/**/*.ts
# - web/src/**/*.ts
# - packages/core/src/**/*.ts
# - packages/ui/src/**/*.tsx

# Use getConfig(env) everywhere
# (Detailed changes in IMPROVEMENT_PLAN.md Phase 2.1-2.2)

# Test with different BASE_URLs
# Commit per file/module for easy review

git push -u origin refactor/remove-hardcoded-urls
gh pr create --title "refactor: Remove all hardcoded URLs" \
  --body "Enables self-hosting. Resolves #7" \
  --milestone "v4.0.0-alpha.2 - Self-Hosting"
gh pr merge --squash --delete-branch
```

### Day 9-10: Self-Hosting Documentation

**Branch**: `docs/self-hosting-guide`

```bash
git checkout -b docs/self-hosting-guide

# Create comprehensive docs (see IMPROVEMENT_PLAN.md Phase 2.3)
# SELF_HOSTING.md
# DEPLOYMENT_CHECKLIST.md
# TROUBLESHOOTING.md
# scripts/setup-self-hosted.sh

git add .
git commit -m "docs: add complete self-hosting guide"
git push -u origin docs/self-hosting-guide

gh pr create --title "docs: Complete self-hosting guide" \
  --body "Enables anyone to deploy their own instance. Resolves #8" \
  --milestone "v4.0.0-alpha.2 - Self-Hosting"
gh pr merge --squash --delete-branch

# Release v4.0.0-alpha.2
git checkout main
git pull
pnpm changeset
# ... version, tag, deploy ...
```

---

## Week 3-4: UI/UX Rebuild (Days 11-20)

### Day 11-13: Responsive Design

**Branch**: `feat/responsive-design`

```bash
git checkout -b feat/responsive-design

# Rewrite packages/ui/src/styles.ts
# Mobile-first, breakpoints, fluid typography
# (See detailed CSS in IMPROVEMENT_PLAN.md Phase 3.1)

# Test on all viewports:
# - 320px (iPhone SE)
# - 375px (iPhone 12)
# - 768px (iPad)
# - 1024px (Desktop)
# - 1440px (Large desktop)

git push -u origin feat/responsive-design
gh pr create --title "feat: Mobile-first responsive design" \
  --body "Complete CSS rewrite. Resolves #9"
gh pr merge --squash --delete-branch
```

### Day 14-16: Customization API

**Branch**: `feat/full-customization`

```bash
git checkout -b feat/full-customization

# Expand theme.ts with full CSS variables
# Add theme presets (Clerk-style, Supabase-style, etc.)
# (See IMPROVEMENT_PLAN.md Phase 3.2)

git push -u origin feat/full-customization
gh pr create --title "feat: Full theme customization API" \
  --body "Custom colors, fonts, spacing, shadows. Resolves #10"
gh pr merge --squash --delete-branch
```

### Day 17-20: Component Rebuilds

**Branch**: `refactor/rebuild-components`

```bash
git checkout -b refactor/rebuild-components

# Rebuild each component with:
# - Loading states
# - Error handling
# - Keyboard nav
# - Screen reader labels
# - Focus management

# Do one component per day:
# Day 17: SignIn + SignUp
# Day 18: UserProfile + UserButton
# Day 19: Billing components
# Day 20: Admin + Polish

git push -u origin refactor/rebuild-components
gh pr create --title "refactor: Rebuild all components with a11y" \
  --body "Professional, accessible, polished. Resolves #11"
gh pr merge --squash --delete-branch

# Release v4.0.0-beta.1
git checkout main
git pull
pnpm changeset
# ... version, tag, deploy ...
```

---

## Week 5: Developer Experience (Days 21-25)

### Day 21-22: Better Error Messages

**Branch**: `feat/actionable-errors`

```bash
git checkout -b feat/actionable-errors

# Create ERROR_CATALOG with troubleshooting
# Update all API routes to throw typed errors
# Add ErrorDisplay component in UI
# (See IMPROVEMENT_PLAN.md Phase 4.1)

git push -u origin feat/actionable-errors
gh pr create --title "feat: Actionable error messages with troubleshooting" \
  --body "Clear guidance for every error. Resolves #12"
gh pr merge --squash --delete-branch
```

### Day 23: Input Validation

**Branch**: `feat/zod-validation`

```bash
git checkout -b feat/zod-validation

# Create packages/core/src/validation.ts with Zod schemas
# Apply to all forms and API routes
# (See IMPROVEMENT_PLAN.md Phase 4.2)

git push -u origin feat/zod-validation
gh pr create --title "feat: Comprehensive Zod validation" \
  --body "Client + server validation. Resolves #13"
gh pr merge --squash --delete-branch
```

### Day 24: TypeScript Strict Mode

**Branch**: `refactor/typescript-strict`

```bash
git checkout -b refactor/typescript-strict

# Enable strict mode in tsconfig.json
# Fix all 34 instances of `: any`
# Add missing generics and exported types
# (See IMPROVEMENT_PLAN.md Phase 4.3)

git push -u origin refactor/typescript-strict
gh pr create --title "refactor: Enable TypeScript strict mode" \
  --body "Remove all `any`, add proper types. Resolves #14"
gh pr merge --squash --delete-branch
```

### Day 25: Documentation

**Branch**: `docs/complete-sdk-reference`

```bash
git checkout -b docs/complete-sdk-reference

# Create:
# - packages/core/docs/API.md
# - packages/core/docs/ERRORS.md
# - packages/core/docs/EXAMPLES.md
# - packages/ui/docs/COMPONENTS.md
# - packages/ui/docs/THEMING.md
# - packages/ui/docs/ACCESSIBILITY.md

git push -u origin docs/complete-sdk-reference
gh pr create --title "docs: Complete SDK and UI reference" \
  --body "Every method, prop, and example. Resolves #15"
gh pr merge --squash --delete-branch

# Release v4.0.0-rc.1
git checkout main
git pull
pnpm changeset
# ... version, tag, deploy ...
```

---

## Week 6: Testing (Days 26-30)

### Day 26-27: Unit Tests

**Branch**: `test/unit-coverage`

```bash
git checkout -b test/unit-coverage

# Add unit tests for:
# - All services (auth, billing)
# - All utilities (crypto, validation, rate-limit)
# - Core SDK client methods
# - UI component logic

# Goal: 80% coverage
pnpm test --coverage

git push -u origin test/unit-coverage
gh pr create --title "test: Comprehensive unit test coverage" \
  --body "200+ new unit tests. Resolves #16"
gh pr merge --squash --delete-branch
```

### Day 28: Integration Tests

**Branch**: `test/integration-flows`

```bash
git checkout -b test/integration-flows

# Test full flows:
# - Sign up → verify → sign in → 2FA → access resource
# - OAuth flow (mocked providers)
# - Billing checkout → webhook → entitlement
# - Session refresh, revocation, fingerprint rotation

git push -u origin test/integration-flows
gh pr create --title "test: Integration tests for full flows" \
  --body "End-to-end user journeys. Resolves #17"
gh pr merge --squash --delete-branch
```

### Day 29: E2E Tests

**Branch**: `test/e2e-playwright`

```bash
git checkout -b test/e2e-playwright

# Set up Playwright
pnpm add -D -w @playwright/test

# Create playwright.config.ts
# Write E2E tests:
# - Browser signup/signin flow
# - Mobile responsive tests
# - Billing integration

git push -u origin test/e2e-playwright
gh pr create --title "test: E2E tests with Playwright" \
  --body "Real browser tests. Resolves #18"
gh pr merge --squash --delete-branch
```

### Day 30: Security Tests

**Branch**: `test/security-vulnerabilities`

```bash
git checkout -b test/security-vulnerabilities

# Test for:
# - XSS injection
# - CSRF bypass attempts
# - SQL injection (parameterized queries)
# - Rate limit enforcement
# - Session hijacking

git push -u origin test/security-vulnerabilities
gh pr create --title "test: Security vulnerability tests" \
  --body "Verify no XSS, CSRF, SQLi. Resolves #19"
gh pr merge --squash --delete-branch
```

---

## Week 7: Performance & Monitoring (Days 31-35)

### Day 31-32: Performance Optimization

**Branch**: `perf/optimize-workers`

```bash
git checkout -b perf/optimize-workers

# - Add database indexes for slow queries
# - Optimize KV caching
# - Code splitting in web app
# - Minify CSS output
# - Tree shake unused code

# Measure before/after:
pnpm exec wrangler deploy --dry-run
# Check bundle sizes

git push -u origin perf/optimize-workers
gh pr create --title "perf: Optimize Worker response times" \
  --body "Target <50ms auth, <100ms billing. Resolves #20"
gh pr merge --squash --delete-branch
```

### Day 33: Monitoring Setup

**Branch**: `feat/monitoring-observability`

```bash
git checkout -b feat/monitoring-observability

# Add:
# - Sentry error tracking
# - Structured logging (JSON)
# - Web Vitals tracking
# - Performance metrics

git push -u origin feat/monitoring-observability
gh pr create --title "feat: Add monitoring and observability" \
  --body "Sentry, logs, metrics. Resolves #21"
gh pr merge --squash --delete-branch
```

### Day 34: Staging Environment

**Branch**: `ci/staging-environment`

```bash
git checkout -b ci/staging-environment

# Create staging Wrangler configs
# - auth/wrangler.staging.jsonc
# - billing/wrangler.staging.jsonc

# Create staging D1 databases
wrangler d1 create slyxup-auth-staging
wrangler d1 create slyxup-billing-staging

# Update CI to deploy to staging first
# Edit .github/workflows/deploy.yml

git push -u origin ci/staging-environment
gh pr create --title "ci: Add staging environment" \
  --body "Test before prod. Resolves #22"
gh pr merge --squash --delete-branch
```

### Day 35: Final Polish & Release

**Branch**: `chore/v4-final-polish`

```bash
git checkout -b chore/v4-final-polish

# - Update all docs
# - Fix any remaining TODOs
# - Polish UI animations
# - Write migration guide from v3 → v4
# - Update CHANGELOG.md

git push -u origin chore/v4-final-polish
gh pr create --title "chore: v4.0.0 final polish" \
  --body "Ready for production. Resolves #23"
gh pr merge --squash --delete-branch

# Release v4.0.0 🎉
git checkout main
git pull
pnpm changeset
# Select "major" for all packages
# Summary: "Production-ready v4.0.0"

pnpm exec changeset version
git add .
git commit -m "chore: release v4.0.0"
git push origin main

git tag -a v4.0.0 -m "v4.0.0: Production Ready

## 🎉 Major Release: Production Ready

### Security
- Argon2id password hashing
- CSRF protection
- Session fingerprinting
- Per-endpoint rate limiting

### Self-Hosting
- Zero hardcoded URLs
- Complete setup guide
- Interactive configuration script

### UI/UX
- Fully responsive (mobile-first)
- Complete theme customization
- WCAG 2.1 AA accessible
- Professional component library

### Developer Experience
- Actionable error messages
- Comprehensive Zod validation
- TypeScript strict mode
- Complete API documentation

### Testing & Reliability
- 500+ tests (90% coverage)
- E2E tests with Playwright
- Security vulnerability tests
- CI/CD with staging

### Performance
- <50ms auth Worker response
- <100ms billing Worker response
- Optimized bundle sizes
- Structured logging & monitoring

## Breaking Changes

See MIGRATION.md for upgrade guide from v3.x.

## Contributors

@ysr-hameed and the SlyxUp community"

git push origin v4.0.0

# Deploy to production
pnpm --filter auth db:migrate:remote
pnpm --filter billing db:migrate:remote
pnpm --filter auth deploy
pnpm --filter billing deploy
pnpm --filter web deploy

# Publish packages to npm
pnpm exec changeset publish

# Verify
npm view @slyxup/core version
npm view @slyxup/ui version

# Create GitHub release
gh release create v4.0.0 \
  --title "v4.0.0: Production Ready 🎉" \
  --notes-file CHANGELOG.md \
  --latest

# Announce
echo "🎉 SlyxUp Stack v4.0.0 is live!"
echo "- NPM: https://www.npmjs.com/package/@slyxup/core"
echo "- Docs: https://stack.slyxup.com/docs"
echo "- GitHub: https://github.com/slyxup/stack/releases/tag/v4.0.0"
```

---

## Git Workflow

### Branch Naming Convention

```
feat/feature-name          # New features
fix/bug-description        # Bug fixes
refactor/what-changed      # Code improvements
docs/what-documented       # Documentation
test/what-tested           # Test additions
chore/maintenance-task     # Maintenance
perf/what-optimized        # Performance
ci/what-changed            # CI/CD changes
security/what-fixed        # Security fixes
```

### Commit Message Format

```bash
# Format: <type>(<scope>): <subject>

# Examples:
git commit -m "feat(auth): add Argon2id password hashing"
git commit -m "fix(billing): handle null subscription correctly"
git commit -m "docs: update self-hosting guide"
git commit -m "refactor(ui): simplify theme API"
git commit -m "test(core): add client method tests"
git commit -m "perf(auth): optimize session lookup query"
git commit -m "security(auth): add CSRF protection"
git commit -m "chore: update dependencies"
git commit -m "ci: add staging deployment"
```

### Pull Request Template

```markdown
## Changes
- Bullet list of what changed

## Why
Brief explanation of the problem this solves

## Testing
- [ ] Unit tests added/updated
- [ ] Manual testing performed
- [ ] E2E tests pass

## Deployment Notes
Any special steps needed for deployment

## Breaking Changes
List any breaking changes (or "None")

## Screenshots
(If UI changes)

Resolves #issue_number
```

### Code Review Checklist

Before merging any PR:

```
- [ ] CI passes (typecheck, lint, test, build)
- [ ] Code reviewed by 1+ person
- [ ] Tests cover new code
- [ ] Documentation updated
- [ ] Changelog updated (for user-facing changes)
- [ ] No hardcoded secrets
- [ ] No `console.log` left in
- [ ] TypeScript strict mode passes
- [ ] Accessibility checked (if UI)
```

---

## Deployment Process

### Pre-Deployment Checklist

```bash
# 1. Verify all tests pass
pnpm typecheck
pnpm lint
pnpm test
pnpm build

# 2. Check for security vulnerabilities
pnpm audit --prod

# 3. Review pending migrations
pnpm --filter auth exec wrangler d1 migrations list slyxup_auth_com --remote
pnpm --filter billing exec wrangler d1 migrations list slyxup_billing_com --remote

# 4. Dry-run deployments
pnpm --filter auth exec wrangler deploy --dry-run
pnpm --filter billing exec wrangler deploy --dry-run

# 5. Check staging is healthy
curl https://auth-staging.slyxup.com/v1/health
curl https://billing-staging.slyxup.com/v1/health

# 6. Backup current production (D1 export)
pnpm --filter auth exec wrangler d1 export slyxup_auth_com --remote --output backup-$(date +%Y%m%d).sql
pnpm --filter billing exec wrangler d1 export slyxup_billing_com --remote --output backup-$(date +%Y%m%d).sql

# 7. Note current Worker version IDs (for rollback)
pnpm --filter auth exec wrangler deployments list
pnpm --filter billing exec wrangler deployments list
```

### Deployment Steps

```bash
# 1. Apply database migrations FIRST
echo "🗄️  Applying database migrations..."
pnpm --filter auth db:migrate:remote
pnpm --filter billing db:migrate:remote

# Verify migrations applied
pnpm --filter auth exec wrangler d1 migrations list slyxup_auth_com --remote
pnpm --filter billing exec wrangler d1 migrations list slyxup_billing_com --remote

# 2. Deploy Workers (zero downtime)
echo "🚀 Deploying Workers..."
pnpm --filter auth deploy
pnpm --filter billing deploy

# 3. Deploy web frontend
echo "🌐 Deploying web app..."
pnpm --filter web build
pnpm --filter web deploy

# 4. Verify deployments
echo "✅ Verifying deployments..."
curl -f https://auth-slyxup-com.auth-0f4.workers.dev/v1/health || exit 1
curl -f https://billing-slyxup-com.billing-86c.workers.dev/v1/health || exit 1
curl -f https://stack.slyxup.com/ || exit 1

# 5. Smoke tests
echo "🧪 Running smoke tests..."
# Test login
curl -X POST https://auth-slyxup-com.auth-0f4.workers.dev/v1/auth/sign-in \
  -H "Content-Type: application/json" \
  -H "X-CSRF-Token: test" \
  -d '{"email":"test@example.com","password":"TestPassword123!"}' \
  || echo "⚠️  Sign-in test failed (expected if test user doesn't exist)"

# Test billing health
curl https://billing-slyxup-com.billing-86c.workers.dev/v1/health | grep -q '"ok":true' || exit 1

echo "✅ Deployment complete!"
```

### Post-Deployment Verification

```bash
# 1. Check error rates (Cloudflare dashboard or Sentry)
echo "📊 Check error rates in Cloudflare Dashboard"
open https://dash.cloudflare.com/

# 2. Monitor logs
pnpm --filter auth exec wrangler tail --format pretty

# 3. Test critical flows
# - Sign up new user
# - Sign in existing user
# - 2FA flow
# - OAuth flow (Google/GitHub)
# - Billing checkout
# - Session revocation

# 4. Check performance metrics
# - Worker response times
# - D1 query times
# - Cache hit rates

# 5. Verify package publication
npm view @slyxup/core version
npm view @slyxup/ui version
```

### Rollback Procedure (if needed)

```bash
# If deployment has critical issues, rollback immediately

# 1. Get previous deployment ID
pnpm --filter auth exec wrangler deployments list
# Copy the previous version ID (e.g., abc123...)

# 2. Rollback Worker
pnpm --filter auth exec wrangler rollback --message "Rollback due to [issue]" abc123

# Same for billing
pnpm --filter billing exec wrangler rollback def456

# 3. Rollback database migration (if needed)
# WARNING: This can cause data loss!
# Better: deploy a new forward migration to fix the issue

# 4. Verify rollback
curl https://auth-slyxup-com.auth-0f4.workers.dev/v1/health

# 5. Investigate issue
# - Check logs: pnpm --filter auth exec wrangler tail
# - Check Sentry errors
# - Review recent commits
# - Test locally

# 6. Fix and redeploy
git revert HEAD  # or fix properly
# ... test locally ...
# ... deploy again ...
```

---

## Release Checklist

### Before Every Release

```
- [ ] All tests pass (unit, integration, E2E)
- [ ] No known security vulnerabilities (pnpm audit)
- [ ] Changelog updated
- [ ] Migration guide written (if breaking changes)
- [ ] Documentation updated
- [ ] Version numbers bumped (via changesets)
- [ ] Git tag created
- [ ] GitHub release draft prepared
```

### Release Types

**Alpha** (`v4.0.0-alpha.1`)
- Early preview, unstable API
- Internal testing only
- Breaking changes expected
- Deployed to staging

**Beta** (`v4.0.0-beta.1`)
- Feature-complete for the release
- API mostly stable
- Community testing encouraged
- Deployed to production (with warning)
- Breaking changes possible but documented

**Release Candidate** (`v4.0.0-rc.1`)
- Final testing before stable
- No new features
- Bug fixes only
- Deployed to production
- No breaking changes

**Stable** (`v4.0.0`)
- Production-ready
- Full documentation
- Migration guide
- Deployed to production
- Semantic versioning from this point

### Version Bump Rules

```
Major (x.0.0):
- Breaking API changes
- Database schema breaking changes
- Removal of deprecated features

Minor (0.x.0):
- New features
- Non-breaking API additions
- New components

Patch (0.0.x):
- Bug fixes
- Documentation updates
- Performance improvements
```

---

## Continuous Integration

### GitHub Actions Workflows

**.github/workflows/ci.yml** (runs on every PR)

```yaml
name: CI

on:
  pull_request:
  push:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v2
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: 'pnpm'
      
      - run: corepack pnpm install --frozen-lockfile
      - run: pnpm typecheck
      - run: pnpm lint
      - run: pnpm test --coverage
      - run: pnpm build
      
      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          files: ./coverage/lcov.info
```

**.github/workflows/deploy.yml** (runs on push to main)

```yaml
name: Deploy

on:
  push:
    branches: [main]

jobs:
  deploy-staging:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v2
      - run: pnpm install
      
      # Deploy to staging
      - name: Deploy Auth (staging)
        run: pnpm --filter auth exec wrangler deploy --env staging
        env:
          CLOUDFLARE_API_TOKEN: ${{ secrets.CF_API_TOKEN }}
      
      - name: Deploy Billing (staging)
        run: pnpm --filter billing exec wrangler deploy --env staging
        env:
          CLOUDFLARE_API_TOKEN: ${{ secrets.CF_API_TOKEN }}
      
      # Run E2E tests against staging
      - name: E2E tests
        run: pnpm test:e2e
        env:
          TEST_API_URL: https://auth-staging.slyxup.com
  
  deploy-production:
    needs: deploy-staging
    runs-on: ubuntu-latest
    environment: production  # Requires approval
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v2
      - run: pnpm install
      
      # Deploy to production
      - name: Deploy Auth
        run: pnpm --filter auth deploy
        env:
          CLOUDFLARE_API_TOKEN: ${{ secrets.CF_API_TOKEN }}
      
      - name: Deploy Billing
        run: pnpm --filter billing deploy
        env:
          CLOUDFLARE_API_TOKEN: ${{ secrets.CF_API_TOKEN }}
      
      - name: Deploy Web
        run: pnpm --filter web deploy
        env:
          CLOUDFLARE_API_TOKEN: ${{ secrets.CF_API_TOKEN }}
      
      # Verify
      - name: Health checks
        run: |
          curl -f https://auth-slyxup-com.auth-0f4.workers.dev/v1/health
          curl -f https://billing-slyxup-com.billing-86c.workers.dev/v1/health
```

**.github/workflows/release.yml** (runs on version tag)

```yaml
name: Release

on:
  push:
    tags:
      - 'v*'

jobs:
  publish:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v2
      - run: pnpm install
      
      # Build packages
      - run: pnpm build
      
      # Publish to npm
      - name: Publish packages
        run: pnpm exec changeset publish
        env:
          NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}
      
      # Create GitHub release
      - name: Create release
        uses: actions/create-release@v1
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
        with:
          tag_name: ${{ github.ref }}
          release_name: Release ${{ github.ref }}
          body_path: CHANGELOG.md
```

---

## Summary

This implementation plan transforms SlyxUp Stack from alpha to production-ready in **7 weeks**:

| Week | Focus | Deliverable |
|------|-------|-------------|
| 1 | Security | v4.0.0-alpha.1 (Argon2id, CSRF, rate limits) |
| 2 | Self-Hosting | v4.0.0-alpha.2 (zero hardcoded URLs, docs) |
| 3-4 | UI/UX | v4.0.0-beta.1 (responsive, accessible, customizable) |
| 5 | DX | v4.0.0-rc.1 (errors, validation, types, docs) |
| 6 | Testing | 500+ tests, 90% coverage |
| 7 | Polish | v4.0.0 (production-ready, monitored, optimized) |

**Key Git Practices**:
- Feature branches for every task
- Conventional commits
- PR reviews with checklist
- Changesets for versioning
- Semantic versioning (semver)

**Deployment Flow**:
1. Develop locally (`pnpm dev`)
2. Push to GitHub (triggers CI)
3. Deploy to staging (auto on main push)
4. Run E2E tests on staging
5. Deploy to production (requires approval)
6. Verify health + monitor

**Release Flow**:
1. Complete feature work
2. Run `pnpm changeset` (semantic version)
3. Run `pnpm changeset version` (bump versions)
4. Commit + push to main
5. Tag release (`git tag v4.0.0`)
6. Push tag (triggers npm publish + GitHub release)
7. Announce to community

---

_Created: 2026-10-03_  
_Ready to execute: YES_  
_Next step: Start Day 0 (Environment Setup)_
