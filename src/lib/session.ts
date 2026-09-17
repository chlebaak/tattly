import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { auth } from "@/auth";
import { db } from "@/db";
import { profiles, type Profile } from "@/db/schema";

export async function requireProfile(): Promise<Profile> {
  const session = await auth();
  const email = session?.user?.email;
  if (!email) redirect("/login");
  const [profile] = await db
    .select()
    .from(profiles)
    .where(eq(profiles.email, email))
    .limit(1);
  if (!profile) redirect("/login");
  return profile;
}
