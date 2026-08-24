export { injectStyles, CSS } from './styles';
export { KeyholeMark, GoogleIcon, GitHubIcon, CheckIcon } from './icons';

export { SignIn, type SignInProps } from './components/SignIn/SignIn';
export { SignUp, type SignUpProps } from './components/SignUp/SignUp';
export { UserButton } from './components/UserButton/UserButton';
export { UserProfile } from './components/UserProfile/UserProfile';
export {
  ForgotPassword,
  type ForgotPasswordProps,
} from './components/ForgotPassword/ForgotPassword';
export {
  ResetPassword,
  type ResetPasswordProps,
} from './components/ResetPassword/ResetPassword';
export {
  EmailVerification,
  type EmailVerificationProps,
} from './components/EmailVerification/EmailVerification';
export {
  SocialButtons,
  type SocialButtonsProps,
} from './components/SocialButtons/SocialButtons';

import { useEffect } from 'react';
import { injectStyles } from './styles';

/**
 * Inject the SlyxUp stylesheet once. Render inside your app root
 * (or rely on any component auto-injecting on mount).
 */
export function SlyxUpStyles(): null {
  useEffect(() => {
    injectStyles();
  }, []);
  return null;
}
