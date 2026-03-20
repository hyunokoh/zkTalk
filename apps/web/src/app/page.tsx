import { redirect } from 'next/navigation';

// Redirect root to /home which is handled by the (app) route group with auth guard.
export default function RootPage() {
  redirect('/home');
}
