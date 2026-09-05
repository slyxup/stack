export { injectStyles, CSS } from './styles';
export {
  applyTheme,
  getTheme,
  ACCENTS,
  FONTS,
  type SlyxUpTheme,
  type ThemeMode,
  type AccentName,
  type AccentDef,
  type FontDef,
  type CustomFont,
  type AuthLayout,
  type PrimaryStyle,
  type Density,
} from './theme';
export {
  KeyholeMark,
  GoogleIcon,
  GitHubIcon,
  CheckIcon,
  EyeIcon,
  EyeOffIcon,
} from './icons';
// All React lives here now (2-SDK model) — provider, context, hooks.
export {
  SlyxUpProvider,
  type SlyxUpProviderProps,
} from './react/provider/SlyxUpProvider';
export {
  AuthContext,
  useAuthContext,
  type AuthContextValue,
} from './react/context/auth-context';
export { useAuth } from './react/hooks/useAuth';
export { useUser } from './react/hooks/useUser';
export { useSession } from './react/hooks/useSession';
export { useTwoFactor } from './react/hooks/useTwoFactor';
export { useConnectedAccounts } from './react/hooks/useConnectedAccounts';
export { useTheme, type ThemePreference } from './react/hooks/useTheme';
export {
  useBilling,
  usePlans,
  useSubscription,
  useSubscriptions,
  useInvoices,
  useCheckout,
  useTransaction,
  type CheckoutHookOptions,
  type TransactionStatus,
} from './react/hooks/useBilling';

export { SignIn, type SignInProps } from './components/SignIn/SignIn';
export {
  PasswordField,
  type PasswordFieldProps,
} from './components/PasswordField';
export { OtpInput, type OtpInputProps } from './components/OtpInput';
export {
  PasswordStrength,
  passwordScore,
  type PasswordStrengthProps,
  type StrengthScore,
} from './components/PasswordStrength';
export { CopyField, type CopyFieldProps } from './components/CopyField';
export { EmptyState, type EmptyStateProps } from './components/EmptyState';
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
  type PortalSubscription,
} from './components/BillingPortal/BillingPortal';
export {
  PricingTable,
  type PricingTableProps,
  type PricingPlan,
} from './components/PricingTable/PricingTable';
// Granular billing parts — compose your own layouts without the full portal.
export {
  PlanCard,
  type PlanCardProps,
  type PlanCardPlan,
} from './components/PlanCard/PlanCard';
export {
  CurrentPlanCard,
  type CurrentPlanCardProps,
  type CurrentPlanSubscription,
  type CurrentPlanCardLabels,
} from './components/CurrentPlanCard/CurrentPlanCard';
export {
  InvoicesTable,
  type InvoicesTableProps,
  type InvoiceRow,
} from './components/InvoicesTable/InvoicesTable';
export {
  SubscriptionStatus,
  type SubscriptionStatusProps,
} from './components/SubscriptionStatus/SubscriptionStatus';
export {
  CheckoutButton,
  type CheckoutButtonProps,
} from './components/CheckoutButton/CheckoutButton';
export {
  AdminPanel,
  type AdminPanelProps,
} from './components/AdminPanel/AdminPanel';
export { initPaddle, openPaddleCheckout } from './lib/paddle';

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
