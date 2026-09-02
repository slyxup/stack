import { slyxupMiddleware } from '@slyxup/nextjs/middleware';

export default slyxupMiddleware({
  // Protect dashboard — all other routes are public (marketing/docs/login)
  protectedPaths: ['/dashboard'],
  publicPaths: ['/', '/login', '/sign-in', '/docs', '/features', '/pricing', '/api/auth'],
  signInUrl: '/login',
  apiUrl: process.env.NEXT_PUBLIC_SLYXUP_API_URL ?? 'https://auth.slyxup.online',
});

export const config = {
  matcher: ['/((?!_next|favicon.ico|.*\\.).*)'],
};
