import NextAuth from 'next-auth';
import Google from 'next-auth/providers/google';
import { clearAdminSession } from '@/lib/utils/auth';
import { ensureGoogleMember } from '@/lib/utils/google-member';
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

      const member = await ensureGoogleMember({ googleId, email, name: user.name });
      await clearAdminSession();
      await setMemberSession(member._id.toString(), member.email);
      return true;
    },
  },
});
