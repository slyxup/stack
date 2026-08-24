export {
  auth,
  currentUser,
  requireUser,
  getSessionToken,
  SESSION_COOKIE_NAME,
  type AuthResult,
  type SlyxupNextOptions,
} from './server/auth.js';

export {
  slyxupMiddleware,
  SESSION_COOKIE_NAME as MIDDLEWARE_SESSION_COOKIE,
  type SlyxupMiddlewareOptions,
} from './middleware.js';

export {
  createSessionCookie,
  clearSessionCookie,
  SESSION_COOKIE_NAME as COOKIE_NAME,
} from './cookies.js';
