import NextAuth from 'next-auth';
import Google from 'next-auth/providers/google';
import { clearAdminSession, setAdminSession } from '@/lib/utils/auth';
import { resolveGoogleSignInAccount } from '@/lib/utils/google-auth';
import { setMemberSession } from '@/lib/utils/member-auth';

const googleConfigured = Boolean(process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET);

export const { handlers } = NextAuth({
  providers: googleConfigured ? [Google] : [],
  pages: {
    signIn: '/login',
    error: '/login',
  },
  session: { strategy: 'jwt' },
  callbacks: {
    async signIn({ account, user, profile }) {
      if (account?.provider !== 'google' || profile?.email_verified !== true) return false;

      const email = profile.email?.trim().toLowerCase();
      const googleId = profile.sub?.trim();
      if (!email || !googleId || user.email?.trim().toLowerCase() !== email) return false;

      const googleAccount = await resolveGoogleSignInAccount({ googleId, email, name: user.name });
      if (!googleAccount) return false;
      if (googleAccount.admin) {
        await setAdminSession(googleAccount.admin._id.toString(), googleAccount.admin.email, googleAccount.admin.role);
        await setMemberSession(googleAccount.member._id.toString(), googleAccount.member.email);
        return '/admin/dashboard';
      }

      await clearAdminSession();
      await setMemberSession(googleAccount.member._id.toString(), googleAccount.member.email);
      return googleAccount.member.profileComplete
        ? '/members/dashboard'
        : '/members/dashboard?tab=edit-form';
    },
  },
});
