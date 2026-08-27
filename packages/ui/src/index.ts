export { injectStyles, CSS } from './styles';
export { KeyholeMark, GoogleIcon, GitHubIcon, CheckIcon } from './icons';

export { SignIn, type SignInProps } from './components/SignIn/SignIn';
export { SignUp, type SignUpProps } from './components/SignUp/SignUp';
export {
  UserButton,
  type UserButtonProps,
} from './components/UserButton/UserButton';
export {
  UserProfile,
  type UserProfileProps,
} from './components/UserProfile/UserProfile';
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
export {
  BillingPortal,
  type BillingPortalProps,
} from './components/BillingPortal/BillingPortal';
export {
  PricingTable,
  type PricingTableProps,
} from './components/PricingTable/PricingTable';

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
