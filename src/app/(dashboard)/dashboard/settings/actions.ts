"use server";

import { revalidatePath } from "next/cache";
import { and, eq, ne } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { profiles } from "@/db/schema";
import { signIn } from "@/auth";
import { requireProfile } from "@/lib/session";
import { deleteObjects, keyFromPublicUrl } from "@/lib/r2";
import { slugify } from "@/lib/utils";

export type ProfileActionState = { ok: boolean; error?: string } | null;

function revalidateProfileAreas(slug: string) {
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/settings");
  revalidatePath("/dashboard/settings/profile");
  revalidatePath("/artists");
  revalidatePath(`/artist/${slug}`);
}

function normalizeUrl(value?: string): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
}

function readTrimmed(
  formData: FormData,
  key: string
): string | null | undefined {
  if (!formData.has(key)) return undefined;
  const value = formData.get(key);
  const trimmed = typeof value === "string" ? value.trim() : "";
  return trimmed ? trimmed : null;
}

/* ---------------------------------- profil --------------------------------- */

export async function updatePublicProfile(
  _prev: ProfileActionState,
  formData: FormData
): Promise<ProfileActionState> {
  const profile = await requireProfile();
  const patch: Partial<typeof profiles.$inferInsert> = {};

  const displayName = readTrimmed(formData, "displayName");
  if (displayName !== undefined) {
    if (!displayName || displayName.length < 2 || displayName.length > 120) {
      return { ok: false, error: "INVALID_INPUT" };
    }
    patch.displayName = displayName;
  }

  const bio = readTrimmed(formData, "bio");
  if (bio !== undefined) {
    if ((bio?.length ?? 0) > 2000) return { ok: false, error: "INVALID_INPUT" };
    patch.bio = bio;
  }

  const avatarUrl = readTrimmed(formData, "avatarUrl");
  if (avatarUrl !== undefined) {
    if ((avatarUrl?.length ?? 0) > 500) {
      return { ok: false, error: "INVALID_INPUT" };
    }
    patch.avatarUrl = avatarUrl;
  }

  const studioName = readTrimmed(formData, "studioName");
  if (studioName !== undefined) patch.studioName = studioName;

  const styles = readTrimmed(formData, "styles");
  if (styles !== undefined) patch.styles = styles;

  for (const key of ["website", "instagram", "tiktok", "facebook"] as const) {
    const value = readTrimmed(formData, key);
    if (value !== undefined) patch[key] = normalizeUrl(value ?? undefined);
  }

  if (Object.keys(patch).length === 0) return { ok: true };

  await db.update(profiles).set(patch).where(eq(profiles.id, profile.id));

  // Nahrazený nebo odebraný avatar už v bucketu zbytečně nedržíme.
  if (patch.avatarUrl !== undefined && patch.avatarUrl !== profile.avatarUrl) {
    const key = keyFromPublicUrl(profile.avatarUrl);
    if (key?.startsWith("avatars/")) await deleteObjects([key]);
  }

  revalidateProfileAreas(profile.slug);
  return { ok: true };
}

/* ---------------------------------- adresa --------------------------------- */

export async function updateAddress(
  _prev: ProfileActionState,
  formData: FormData
): Promise<ProfileActionState> {
  const profile = await requireProfile();
  const patch: Partial<typeof profiles.$inferInsert> = {};

  const addressLine = readTrimmed(formData, "addressLine");
  if (addressLine !== undefined) {
    if ((addressLine?.length ?? 0) > 255) {
      return { ok: false, error: "INVALID_INPUT" };
    }
    patch.addressLine = addressLine;
  }

  const city = readTrimmed(formData, "city");
  if (city !== undefined) patch.city = city;

  const zip = readTrimmed(formData, "zip");
  if (zip !== undefined) patch.zip = zip;

  if (formData.has("lat")) {
    const lat = readTrimmed(formData, "lat");
    patch.lat = lat ? Number(lat) : null;
    if (patch.lat !== null && !Number.isFinite(patch.lat)) {
      return { ok: false, error: "INVALID_INPUT" };
    }
  }
  if (formData.has("lng")) {
    const lng = readTrimmed(formData, "lng");
    patch.lng = lng ? Number(lng) : null;
    if (patch.lng !== null && !Number.isFinite(patch.lng)) {
      return { ok: false, error: "INVALID_INPUT" };
    }
  }

  if (Object.keys(patch).length === 0) return { ok: true };

  await db.update(profiles).set(patch).where(eq(profiles.id, profile.id));
  revalidateProfileAreas(profile.slug);
  return { ok: true };
}

/* -------------------------------- fakturace -------------------------------- */

export async function updateBilling(
  _prev: ProfileActionState,
  formData: FormData
): Promise<ProfileActionState> {
  const profile = await requireProfile();
  const patch: Partial<typeof profiles.$inferInsert> = {};

  const depositCzk = readTrimmed(formData, "defaultDepositCzk");
  if (depositCzk !== undefined) {
    const value = Number(depositCzk);
    if (!Number.isInteger(value) || value < 0 || value > 1_000_000) {
      return { ok: false, error: "INVALID_INPUT" };
    }
    patch.defaultDepositAmount = value * 100;
  }

  const ico = readTrimmed(formData, "ico");
  if (ico !== undefined) {
    patch.ico = ico?.replace(/\s+/g, "") ?? null;
  }

  const dic = readTrimmed(formData, "dic");
  if (dic !== undefined) {
    patch.dic = dic?.replace(/\s+/g, "").toUpperCase() ?? null;
  }

  const bankAccount = readTrimmed(formData, "bankAccount");
  if (bankAccount !== undefined) {
    patch.bankAccount = bankAccount?.replace(/\s+/g, "").toUpperCase() ?? null;
  }

  if (Object.keys(patch).length === 0) return { ok: true };

  await db.update(profiles).set(patch).where(eq(profiles.id, profile.id));
  revalidateProfileAreas(profile.slug);
  return { ok: true };
}

/* ----------------------------------- slug ---------------------------------- */

const slugSchema = z.object({
  slug: z.string().min(3).max(64),
});

export async function updateSlug(
  _prev: ProfileActionState,
  formData: FormData
): Promise<ProfileActionState> {
  const profile = await requireProfile();
  const parsed = slugSchema.safeParse({ slug: formData.get("slug") });
  if (!parsed.success) return { ok: false, error: "INVALID_INPUT" };

  const slug = slugify(parsed.data.slug);
  if (slug.length < 3) return { ok: false, error: "SLUG_INVALID" };
  if (slug === profile.slug) return { ok: true };

  const [taken] = await db
    .select({ id: profiles.id })
    .from(profiles)
    .where(and(eq(profiles.slug, slug), ne(profiles.id, profile.id)))
    .limit(1);
  if (taken) return { ok: false, error: "SLUG_TAKEN" };

  await db
    .update(profiles)
    .set({ slug })
    .where(eq(profiles.id, profile.id));

  revalidateProfileAreas(profile.slug);
  revalidatePath(`/artist/${slug}`);
  return { ok: true };
}

/* -------------------------------- portfolio -------------------------------- */

const portfolioSchema = z.object({
  images: z
    .array(
      z.object({
        key: z.string().min(1).max(512),
        alt: z.string().max(200).optional(),
      })
    )
    .max(24),
});

export async function savePortfolioImages(
  input: unknown
): Promise<{ ok: boolean; error?: string }> {
  const profile = await requireProfile();
  const parsed = portfolioSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "INVALID_INPUT" };
  if (
    parsed.data.images.some((image) => !image.key.startsWith("portfolio/"))
  ) {
    return { ok: false, error: "INVALID_INPUT" };
  }

  await db
    .update(profiles)
    .set({ portfolioImages: parsed.data.images })
    .where(eq(profiles.id, profile.id));

  // Fotky odebrané z portfolia smažeme i z bucketu.
  const removed = profile.portfolioImages
    .map((image) => image.key)
    .filter(
      (key) =>
        key.startsWith("portfolio/") &&
        !parsed.data.images.some((image) => image.key === key)
    );
  if (removed.length) await deleteObjects(removed);

  revalidateProfileAreas(profile.slug);
  return { ok: true };
}

/* -------------------------------- integrace -------------------------------- */

export async function connectGoogleCalendar(): Promise<void> {
  await requireProfile();
  await signIn("google", { redirectTo: "/dashboard/settings/integrations" });
}

export async function disconnectGoogleCalendar(): Promise<{
  ok: boolean;
  error?: string;
}> {
  const profile = await requireProfile();

  // Zkusíme token odvolat i u Google (když to selže, připojení stejně zrušíme).
  if (profile.googleRefreshToken) {
    try {
      const { decryptSecret } = await import("@/lib/crypto");
      const token = decryptSecret(profile.googleRefreshToken);
      await fetch(
        `https://oauth2.googleapis.com/revoke?token=${encodeURIComponent(token)}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
        }
      );
    } catch (error) {
      console.error("Google token revoke failed", error);
    }
  }

  await db
    .update(profiles)
    .set({
      googleRefreshToken: null,
      googleCalendarId: null,
      googleNeedsReconnect: false,
    })
    .where(eq(profiles.id, profile.id));

  revalidateProfileAreas(profile.slug);
  revalidatePath("/dashboard/settings/integrations");
  return { ok: true };
}
