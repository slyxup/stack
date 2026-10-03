import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';

const mockSignIn = vi.fn().mockResolvedValue({ ok: true });
const mockSignUp = vi.fn().mockResolvedValue({ ok: true });
const mockSignOut = vi.fn().mockResolvedValue({ ok: true });
const mockCompleteSignIn = vi.fn().mockResolvedValue({ ok: true });

vi.mock('../src/react/hooks/useAuth', () => ({
  useAuth: () => ({
    isLoaded: true,
    isSignedIn: false,
    userId: null,
    client: {},
    signIn: mockSignIn,
    signUp: mockSignUp,
    signOut: mockSignOut,
    completeSignIn: mockCompleteSignIn,
  }),
}));
vi.mock('../src/react/hooks/useUser', () => ({
  useUser: () => ({
    isLoaded: true,
    isSignedIn: false,
    user: null,
    isSignedOut: true,
    reload: vi.fn(),
  }),
  useSession: () => ({
    isLoaded: true,
    isSignedIn: false,
    session: null,
    reload: vi.fn(),
  }),
}));

import { SignIn } from '../src/components/SignIn/SignIn';
import { SignUp } from '../src/components/SignUp/SignUp';
import { SocialButtons } from '../src/components/SocialButtons/SocialButtons';
import { UserButton } from '../src/components/UserButton/UserButton';

describe('SignIn', () => {
  beforeEach(() => vi.clearAllMocks());

  it('renders sign in heading', () => {
    render(<SignIn />);
    expect(screen.getByRole('heading', { name: /sign in/i })).toBeTruthy();
  });

  it('renders email and password inputs', () => {
    render(<SignIn />);
    expect(screen.getByLabelText(/email/i)).toBeTruthy();
    expect(screen.getByLabelText(/^password$/i)).toBeTruthy();
  });

  it('renders submit button', () => {
    render(<SignIn />);
    expect(screen.getByRole('button', { name: /sign in/i })).toBeTruthy();
  });

  it('shows social buttons by default', () => {
    render(<SignIn />);
    expect(screen.getByText(/continue with google/i)).toBeTruthy();
    expect(screen.getByText(/continue with github/i)).toBeTruthy();
  });

  it('hides social buttons when social=false', () => {
    render(<SignIn social={false} />);
    expect(screen.queryByText(/continue with google/i)).toBeNull();
    expect(screen.queryByText(/continue with github/i)).toBeNull();
  });

  it('calls signIn on form submit', async () => {
    render(<SignIn />);
    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'a@b.com' } });
    fireEvent.change(screen.getByLabelText(/^password$/i), { target: { value: '12345678' } });
    fireEvent.click(screen.getByRole('button', { name: /sign in/i }));
    await waitFor(() => expect(mockSignIn).toHaveBeenCalledWith({ email: 'a@b.com', password: '12345678' }));
  });

  it('shows sign up link when onSignUpClick provided', () => {
    const onSignUp = vi.fn();
    render(<SignIn onSignUpClick={onSignUp} />);
    expect(screen.getByText(/sign up/i)).toBeTruthy();
  });

  it('sends usernames through the username field', async () => {
    render(<SignIn username social={false} />);
    fireEvent.change(screen.getByLabelText(/username/i), { target: { value: 'ada' } });
    fireEvent.change(screen.getByLabelText(/^password$/i), { target: { value: 'password' } });
    fireEvent.click(screen.getByRole('button', { name: /^sign in$/i }));
    await waitFor(() => expect(mockSignIn).toHaveBeenCalledWith({ username: 'ada', password: 'password' }));
  });

  it('completes a two-factor challenge using a recovery code', async () => {
    mockSignIn.mockResolvedValueOnce({ code: '2FA_REQUIRED', challengeToken: 'challenge' });
    const success = vi.fn();
    render(<SignIn onSuccess={success} />);
    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'ada@example.com' } });
    fireEvent.change(screen.getByLabelText(/^password$/i), { target: { value: 'password' } });
    fireEvent.click(screen.getByRole('button', { name: /^sign in$/i }));
    await screen.findByLabelText('Authenticator code');
    expect(success).not.toHaveBeenCalled();
    expect(screen.queryByText('Continue with Google')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Use a recovery code' }));
    fireEvent.change(screen.getByLabelText('Recovery code'), { target: { value: 'recovery-123' } });
    fireEvent.click(screen.getByRole('button', { name: 'Verify code' }));
    await waitFor(() => expect(mockCompleteSignIn).toHaveBeenCalledWith({ challengeToken: 'challenge', recoveryCode: 'recovery-123' }));
    await waitFor(() => expect(success).toHaveBeenCalledOnce());
  });

  it('gives separate sign-in forms unique label targets', () => {
    render(<><SignIn social={false} /><SignIn social={false} /></>);
    const inputs = screen.getAllByLabelText(/^email$/i);
    expect(inputs[0].id).not.toBe(inputs[1].id);
  });
});

describe('SignUp', () => {
  beforeEach(() => vi.clearAllMocks());

  it('renders create your account heading', () => {
    render(<SignUp />);
    expect(screen.getByRole('heading', { name: /create your account/i })).toBeTruthy();
  });

  it('renders first name, email, password inputs', () => {
    render(<SignUp />);
    expect(screen.getByLabelText(/first name/i)).toBeTruthy();
    expect(screen.getByLabelText(/email/i)).toBeTruthy();
    expect(screen.getByLabelText(/^password$/i)).toBeTruthy();
  });

  it('shows social buttons by default', () => {
    render(<SignUp />);
    expect(screen.getByText(/continue with google/i)).toBeTruthy();
  });
});

describe('SocialButtons', () => {
  beforeEach(() => vi.clearAllMocks());

  it('renders both providers by default', () => {
    render(<SocialButtons />);
    expect(screen.getByText(/continue with google/i)).toBeTruthy();
    expect(screen.getByText(/continue with github/i)).toBeTruthy();
  });

  it('renders only specified providers', () => {
    render(<SocialButtons providers={['google']} />);
    expect(screen.getByText(/continue with google/i)).toBeTruthy();
    expect(screen.queryByText(/continue with github/i)).toBeNull();
  });
});

describe('UserButton', () => {
  beforeEach(() => vi.clearAllMocks());

  it('renders avatar', () => {
    render(<UserButton />);
    expect(screen.getByRole('button', { name: /account menu/i })).toBeTruthy();
  });

  it('opens dropdown on click', async () => {
    render(<UserButton />);
    fireEvent.click(screen.getByRole('button', { name: /account menu/i }));
    await waitFor(() => expect(screen.getByText(/sign out/i)).toBeTruthy());
  });
});
