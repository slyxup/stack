import { slyxupMiddleware } from '@slyxup/nextjs/middleware';

export default slyxupMiddleware({
  publicPaths: ['/', '/pricing'],
  signInUrl: '/',
});

export const config = {
  matcher: ['/((?!_next|favicon.ico|api).*)'],
};
