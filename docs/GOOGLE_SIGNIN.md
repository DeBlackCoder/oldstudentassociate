# Google sign-in

Google is the only sign-in method for everyone. Members and administrators use the same login page. An existing active administrator signs in with the Google account matching the administrator record and is sent to the admin dashboard; everyone else is sent to the member dashboard.

## Google OAuth setup

1. In Google Cloud Console, create or select a project and configure its OAuth consent screen.
2. Create an OAuth client ID with application type **Web application**.
3. Add the site's origins and authorized redirect URIs:

   - Local origin: `http://localhost:3000`
   - Local redirect URI: `http://localhost:3000/api/auth/callback/google`
   - Production origin: `https://www.rsssclass94.online`
   - Production redirect URI: `https://www.rsssclass94.online/api/auth/callback/google`

4. Configure these environment variables locally in `.env.local` and in the production host:

   - `AUTH_GOOGLE_ID`: OAuth client ID
   - `AUTH_GOOGLE_SECRET`: OAuth client secret
   - `AUTH_SECRET`: a private, random secret used by Auth.js
   - `AUTH_URL`: the app origin, such as `http://localhost:3000` locally or `https://www.rsssclass94.online` in production

   Never commit or share the client secret or `AUTH_SECRET`. Restart the local server or redeploy after changing environment variables.

## Member account behavior

Google sign-in requires a Google-verified email. A first-time Google user gets a verified member account and is signed in to the normal member dashboard. Existing accounts with the same verified email are linked without replacing their application or payment data. Deleted accounts and conflicting Google-account links are not restored.

Google sign-in does not complete membership registration. Members still need to complete and save the membership form, pay the one-time registration fee, and wait for administrator approval. An incomplete member is taken directly to the registration form. Email/password login, signup, email verification, and password recovery are disabled.

Administrators must first be assigned an active administrator record. A database wipe removes these records; create a new Super Admin record through the approved administrative provisioning process before expecting admin access.
