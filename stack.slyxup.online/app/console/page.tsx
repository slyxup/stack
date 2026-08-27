import { redirect } from 'next/navigation';

export default function ConsoleRedirect() {
  redirect('/dashboard');
}
