import { SlyxUpProvider } from '@slyxup/react';
import { SignIn } from '@slyxup/ui';

export default function App() {
  return (
    <SlyxUpProvider
      publishableKey={import.meta.env.VITE_SLYXUP_PUBLISHABLE_KEY}
    >
      <SignIn />
    </SlyxUpProvider>
  );
}
