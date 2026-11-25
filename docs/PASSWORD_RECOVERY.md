# Authentication

Members and administrators use the same Google sign-in page at `/login`.
Email/password login, signup, email verification, and password recovery are
disabled. The old administrator login page and password recovery pages redirect
to the shared Google sign-in page.

Administrators must have an active administrator record before signing in.
After a database wipe, a new Super Admin must be provisioned before anyone can
access the administration dashboard. See [Google sign-in setup](./GOOGLE_SIGNIN.md).
