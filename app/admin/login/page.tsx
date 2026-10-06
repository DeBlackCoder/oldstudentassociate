import { redirect } from 'next/navigation';

// Admin login is handled by the unified /login page.
// This redirect ensures old bookmarks still work.
export default function AdminLoginPage() {
  redirect('/login');
}
