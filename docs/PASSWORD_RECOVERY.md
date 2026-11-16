# Password recovery

The sign-in page now links to `/forgot-password`. Recovery supports regular member accounts and active administrator accounts through the same flow.

1. Enter the account email and select **Send reset link**.
2. Open the email and select **Choose a new password** within 30 minutes.
3. Enter and confirm a password containing at least 8 characters, then select **Update password**.
4. Sign in again. The new password works for both views of a linked administrator account.

Requests receive the same response whether an account exists or not. Check the spam folder if no email arrives. A second request within one minute does not send another email. A later request replaces the previous link. Deactivated administrators must contact the association rather than recover access through this flow.

## Configuration

Set these variables in `.env.local` locally and in the hosting provider's environment for deployment:

| Variable | Purpose |
| --- | --- |
| `SMTP_HOST` | Mail server hostname; defaults to Gmail's SMTP server. |
| `SMTP_PORT` | Mail server port; defaults to 587. |
| `SMTP_SECURE` | Set `true` for direct TLS, commonly port 465; use the provider's settings. |
| `SMTP_USER` / `SMTP_PASS` | Credentials for the sending mailbox; Gmail requires an app password when applicable. |
| `SMTP_FROM` | Sender address or display-name/address pair. |
| `NEXT_PUBLIC_APP_URL` | The public origin used in recovery links, for example `https://your-domain.example`. |
| `MONGODB_URI` | Database containing the accounts and recovery records. |
| `JWT_SECRET` | Secret used to sign account sessions. |

**The configured application URL currently points to localhost. Set it to the deployed site's public URL before using recovery in production.** No SMTP credentials, reset tokens, or passwords are included in this document.

Missing mail credentials or an invalid application URL produce an availability message consistently for all addresses. SMTP/database failures are logged without account emails or reset links. Recovery never returns reset tokens to the browser as a development shortcut.

## How it works

- `POST /api/member/forgot-password` validates an email, resolves the account, and sends the email using the existing SMTP utility.
- `PasswordReset` stores a SHA-256 digest of a cryptographically random 256-bit token. The plaintext token appears only in the email link.
- Links expire after 30 minutes. Expiration is checked during redemption; MongoDB TTL cleanup only removes expired records.
- `POST /api/member/reset-password` atomically claims an unused token before changing a password. A link cannot be reused after a successful reset.
- Passwords are hashed with bcrypt. The form requires 8–72 characters; UTF-8 input must also fit within bcrypt's 72-byte limit.
- A reset updates both an active administrator and the member profile linked to that administrator. A profile assigned to another administrator is never changed merely because an email matches. Requests made through an older linked member email deliver the recovery email to the administrator's current address.
- Both account models record `passwordChangedAt`. Session getters check signed issue times against that timestamp to reject sessions created before the change. The browser performing the reset has both session cookies cleared.
- Admin session getters also read the current role and active status so promotions and deactivation apply immediately.
- The recovery pages disable indexing and set a no-referrer policy. The successful reset removes the token from the address bar.

Recovery leaves profile information, membership applications, payments, scholarship applications, and administrator/member links intact. It does not mark an unverified ordinary member's email as verified.

If a database write fails, the reset operation releases the claim so the same unexpired link can be retried. Linked account writes use the same password hash and timestamp; retries safely complete either write if an earlier attempt partially succeeded. There is no requirement for MongoDB replica-set transactions.

## Files and checks

The implementation lives in `app/forgot-password`, `app/reset-password`, the two corresponding member API routes, `components/auth`, `lib/models/PasswordReset.ts`, and `lib/utils/password-reset*.ts`. The existing authentication helpers enforce session invalidation.

`tests/password-reset.test.ts` covers token generation/hashing, validation, session invalidation, account synchronization, single use, expiry checks, and retries using isolated model mocks. No tests send email or modify the configured database. Run it with `npm run test:passwords` when the environment permits test workers.

Validation completed: all 15 isolated tests passed using an in-process TypeScript loader because this workspace blocks test worker creation. TypeScript and targeted ESLint checks also passed. A read-only SMTP connection/authentication verification timed out from this environment; no email was sent and end-to-end email delivery remains unverified. Check SMTP reachability in the deployment environment and update the public application URL before production use.
