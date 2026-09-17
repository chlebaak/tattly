import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { profiles } from "@/db/schema";
import { encryptSecret } from "@/lib/crypto";
import { slugify } from "@/lib/utils";

export const CALENDAR_SCOPE = [
  "openid",
  "email",
  "profile",
  "https://www.googleapis.com/auth/calendar.events",
  "https://www.googleapis.com/auth/calendar.readonly",
].join(" ");

async function uniqueSlug(base: string): Promise<string> {
  const prefix = base || "profil";
  let slug = prefix;
  for (let attempt = 0; attempt < 5; attempt++) {
    const [taken] = await db
      .select({ id: profiles.id })
      .from(profiles)
      .where(eq(profiles.slug, slug))
      .limit(1);
    if (!taken) return slug;
    slug = `${prefix}-${Math.random().toString(36).slice(2, 6)}`;
  }
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Google({
      authorization: {
        params: {
          access_type: "offline",
          prompt: "consent",
          scope: CALENDAR_SCOPE,
        },
      },
    }),
  ],
  session: { strategy: "jwt" },
  callbacks: {
    async signIn({ user, account }) {
      if (!user.email) return false;
      const [existing] = await db
        .select()
        .from(profiles)
        .where(eq(profiles.email, user.email))
        .limit(1);
      const refreshToken = account?.refresh_token;
      if (existing) {
        if (refreshToken) {
          await db
            .update(profiles)
            .set({ googleRefreshToken: encryptSecret(refreshToken) })
            .where(eq(profiles.id, existing.id));
        }
        return true;
      }
      const displayName =
        user.name ?? user.email.split("@")[0] ?? "Profesionál";
      const slug = await uniqueSlug(slugify(displayName));
      await db.insert(profiles).values({
        slug,
        email: user.email,
        displayName,
        avatarUrl: user.image ?? null,
        googleRefreshToken: refreshToken
          ? encryptSecret(refreshToken)
          : null,
        googleCalendarId: "primary",
      });
      return true;
    },
  },
});
