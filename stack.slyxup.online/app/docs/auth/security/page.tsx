import { CodeBlock, CopyForLLM } from '../../copy';

const LLM = `# Security — Username, 2FA, Connected Accounts
// Username (alternative to email for password sign-in)
await client.auth.signUp({ email, password, username: 'ada' });
await client.auth.signIn({ username: 'ada', password });  // or email
await client.users.update({ username: 'ada_lovelace' });

// Two-factor (TOTP)
const { secret, provisioningUri } = await client.twoFactor.setup();
const { recoveryCodes } = await client.twoFactor.enable(secret, code); // save these!
// sign-in returns { code:'2FA_REQUIRED', challengeToken } when enabled
await client.auth.completeSignIn({ challengeToken, code });
await client.twoFactor.disable(code);
await client.twoFactor.status();

// Connected accounts (OAuth)
const { accounts } = await client.accounts.list();
await client.accounts.unlink(accountId, 'google');
`;

export default function Page() {
  return (
    <div>
      <div className="fw-head">
        <h1 className="h-doc">Security</h1>
        <CopyForLLM content={LLM} />
      </div>
      <p className="prose-p">
        Username sign-in, TOTP two-factor authentication, and OAuth account management — all exposed through the same
        SDK and available in the prebuilt UI.
      </p>

      <h2 className="h-sec">Username</h2>
      <p className="prose-p">
        A username is an optional, project-unique identifier you can sign in with instead of an email. Set it at sign-up
        or update it later from the profile.
      </p>
      <CodeBlock
        variants={{
          js: `await client.auth.signUp({
  email: 'ada@example.com',
  password: 'password123',
  username: 'ada',       // optional
});

// Sign in with a username instead of email:
await client.auth.signIn({ username: 'ada', password: 'password123' });

// Update it later (must be unique within the project):
await client.users.update({ username: 'ada_lovelace' });`,
          react: `import { useAuth, useUser } from '@slyxup/react';
// SignUp includes a username field automatically.
// In the profile panel, the username is editable.
const { user } = useUser();
console.log(user?.username); // 'ada'`,
        }}
      />

      <h2 className="h-sec">Two-factor authentication (TOTP)</h2>
      <p className="prose-p">
        Standard time-based one-time passwords using the HMAC-SHA1 algorithm — compatible with Google Authenticator,
        Authy, 1Password, and most authenticator apps. The shared secret is generated on the server with secure random
        bytes and stored hashed in D1.
      </p>
      <CodeBlock
        variants={{
          js: `// 1. Start setup — returns the shared secret + provisioning URI
const { secret, provisioningUri } = await client.twoFactor.setup();
// Show the QR (provisioningUri) or the secret to the user.

// 2. Verify a code and enable
const { recoveryCodes } = await client.twoFactor.enable(secret, '123456');
// recoveryCodes are shown ONCE — store them safely.

// 3. Status check
const { enabled } = await client.twoFactor.status();

// 4. Disable (requires the current authenticator code)
await client.twoFactor.disable('123456');`,
          react: `import { useTwoFactor } from '@slyxup/react';
// The UserProfile security tab has a full 2FA setup flow:
// QR + manual secret -> verify code -> save recovery codes,
// plus a disable flow that requires the current code.
const { setup, enable, verify, disable, status } = useTwoFactor();`,
        }}
      />

      <h2 className="h-sec">2FA during sign-in</h2>
      <p className="prose-p">
        When an account has 2FA enabled, sign-in returns <code className="inl">2FA_REQUIRED</code> with a short-lived
        challenge token instead of a session. Complete the challenge with a code (or a one-time recovery code).
      </p>
      <CodeBlock
        variants={{
          js: `const res = await client.auth.signIn({ email, password });
// res.code === '2FA_REQUIRED', res.challengeToken
await client.auth.completeSignIn({ challengeToken: res.challengeToken, code: '123456' });
// Sign-in with a recovery code instead:
await client.auth.completeSignIn({ challengeToken: res.challengeToken, recoveryCode: 'xxxxx' });`,
          react: `import { useAuth } from '@slyxup/react';
const { signIn, completeSignIn } = useAuth();
const res = await signIn({ email, password });
if (res.code === '2FA_REQUIRED') {
  await completeSignIn({ challengeToken: res.challengeToken, code });
}
// The <SignIn /> component handles this automatically.`,
        }}
      />

      <h2 className="h-sec">Connected accounts</h2>
      <p className="prose-p">
        List the OAuth providers linked to a user and unlink them. A user must always keep at least one sign-in method
        (email/password or a connected account).
      </p>
      <CodeBlock
        variants={{
          js: `const { accounts } = await client.accounts.list();
// [{ id, provider: 'google' | 'github', providerAccountId, createdAt }]
await client.accounts.unlink(accounts[0].id, 'google');`,
          react: `import { useConnectedAccounts } from '@slyxup/react';
const { list, unlink } = useConnectedAccounts();
// The UserProfile security tab renders the account list
// with per-account unlink buttons.`,
        }}
      />
    </div>
  );
}
