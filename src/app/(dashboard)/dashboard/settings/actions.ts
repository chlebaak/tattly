"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { profiles } from "@/db/schema";
import { requireProfile } from "@/lib/session";
import { getStripe } from "@/lib/stripe";
import { appUrl } from "@/lib/env";

export type ProfileActionState = { ok: boolean; error?: string } | null;

const profileSchema = z.object({
  displayName: z.string().min(2).max(120),
  bio: z.string().max(2000).optional(),
  avatarUrl: z.string().max(500).optional(),
  defaultDepositCzk: z.coerce.number().int().min(0).max(1_000_000),
  addressLine: z.string().max(255).optional(),
  city: z.string().max(120).optional(),
  zip: z.string().max(12).optional(),
  lat: z.coerce.number().min(-90).max(90).optional(),
  lng: z.coerce.number().min(-180).max(180).optional(),
  website: z.string().max(255).optional(),
  instagram: z.string().max(255).optional(),
  tiktok: z.string().max(255).optional(),
  facebook: z.string().max(255).optional(),
  studioName: z.string().max(120).optional(),
  styles: z.string().max(255).optional(),
  ico: z.string().max(16).optional(),
  dic: z.string().max(16).optional(),
  bankAccount: z.string().max(64).optional(),
});

function normalizeUrl(value?: string): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
}

export async function updateProfile(
  _prev: ProfileActionState,
  formData: FormData
): Promise<ProfileActionState> {
  const profile = await requireProfile();
  const parsed = profileSchema.safeParse({
    displayName: formData.get("displayName"),
    bio: formData.get("bio") || undefined,
    avatarUrl: formData.get("avatarUrl") || undefined,
    defaultDepositCzk: formData.get("defaultDepositCzk"),
    addressLine: formData.get("addressLine") || undefined,
    city: formData.get("city") || undefined,
    zip: formData.get("zip") || undefined,
    lat: formData.get("lat") || undefined,
    lng: formData.get("lng") || undefined,
    website: formData.get("website") || undefined,
    instagram: formData.get("instagram") || undefined,
    tiktok: formData.get("tiktok") || undefined,
    facebook: formData.get("facebook") || undefined,
    studioName: formData.get("studioName") || undefined,
    styles: formData.get("styles") || undefined,
    ico: formData.get("ico") || undefined,
    dic: formData.get("dic") || undefined,
    bankAccount: formData.get("bankAccount") || undefined,
  });
  if (!parsed.success) return { ok: false, error: "INVALID_INPUT" };

  await db
    .update(profiles)
    .set({
      displayName: parsed.data.displayName,
      bio: parsed.data.bio ?? null,
      avatarUrl: parsed.data.avatarUrl ?? null,
      defaultDepositAmount: parsed.data.defaultDepositCzk * 100,
      addressLine: parsed.data.addressLine ?? null,
      city: parsed.data.city ?? null,
      zip: parsed.data.zip ?? null,
      lat: parsed.data.lat ?? null,
      lng: parsed.data.lng ?? null,
      website: normalizeUrl(parsed.data.website),
      instagram: normalizeUrl(parsed.data.instagram),
      tiktok: normalizeUrl(parsed.data.tiktok),
      facebook: normalizeUrl(parsed.data.facebook),
      studioName: parsed.data.studioName ?? null,
      styles: parsed.data.styles ?? null,
      ico: parsed.data.ico?.replace(/\s+/g, "") ?? null,
      dic: parsed.data.dic?.replace(/\s+/g, "").toUpperCase() ?? null,
      bankAccount:
        parsed.data.bankAccount?.replace(/\s+/g, "").toUpperCase() ?? null,
    })
    .where(eq(profiles.id, profile.id));

  revalidatePath("/dashboard/settings");
  revalidatePath("/dashboard");
  revalidatePath("/artists");
  return { ok: true };
}

export async function startStripeOnboarding(): Promise<void> {
  const profile = await requireProfile();
  const stripe = getStripe();
  let accountId = profile.stripeAccountId;
  if (!accountId) {
    const account = await stripe.v2.core.accounts.create({
      dashboard: "express",
      contact_email: profile.email,
      display_name: profile.displayName,
      identity: { country: "CZ" },
      configuration: {
        recipient: {
          capabilities: {
            stripe_balance: {
              stripe_transfers: { requested: true },
            },
          },
        },
      },
      defaults: {
        currency: profile.currency.toLowerCase(),
        responsibilities: {
          losses_collector: "application",
          fees_collector: "application",
        },
      },
      metadata: { profileId: profile.id },
    });
    accountId = account.id;
    await db
      .update(profiles)
      .set({ stripeAccountId: accountId })
      .where(eq(profiles.id, profile.id));
  }
  const link = await stripe.v2.core.accountLinks.create({
    account: accountId,
    use_case: {
      type: "account_onboarding",
      account_onboarding: {
        configurations: ["recipient"],
        refresh_url: `${appUrl()}/dashboard/settings`,
        return_url: `${appUrl()}/dashboard/settings?stripe=return`,
      },
    },
  });
  redirect(link.url);
}
