"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { bookings, services } from "@/db/schema";
import { requireProfile } from "@/lib/session";

const customFieldSchema = z.object({
  id: z.string().min(1).max(64),
  label: z.string().min(1).max(120),
  type: z.enum(["text", "number", "textarea", "select"]),
  required: z.boolean().optional(),
  options: z.array(z.string().min(1).max(120)).max(20).optional(),
});

const serviceSchema = z.object({
  id: z.uuid().optional(),
  title: z.string().min(2).max(120),
  durationMinutes: z.coerce.number().int().min(5).max(720),
  slotIntervalMinutes: z.coerce.number().int().min(5).max(720).optional(),
  priceCzk: z.coerce.number().int().min(0).max(10_000_000).optional(),
  depositCzk: z.coerce.number().int().min(0).max(1_000_000).optional(),
  customFormFields: z.array(customFieldSchema).max(20),
});

export type SaveServiceResult =
  | { ok: true; id: string }
  | { ok: false; error: string };

export async function saveService(input: unknown): Promise<SaveServiceResult> {
  const profile = await requireProfile();
  const parsed = serviceSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "INVALID_INPUT" };
  const data = parsed.data;
  const values = {
    title: data.title,
    durationMinutes: data.durationMinutes,
    slotIntervalMinutes: data.slotIntervalMinutes ?? null,
    priceMinor: data.priceCzk !== undefined ? data.priceCzk * 100 : null,
    depositMinor:
      data.depositCzk !== undefined ? data.depositCzk * 100 : null,
    customFormFields: data.customFormFields,
  };

  if (data.id) {
    const [existing] = await db
      .select({ id: services.id })
      .from(services)
      .where(
        and(eq(services.id, data.id), eq(services.profileId, profile.id))
      )
      .limit(1);
    if (!existing) return { ok: false, error: "NOT_FOUND" };
    await db.update(services).set(values).where(eq(services.id, data.id));
    revalidatePath("/dashboard/settings/services");
    revalidatePath("/dashboard/settings");
    return { ok: true, id: data.id };
  }

  const [created] = await db
    .insert(services)
    .values({ profileId: profile.id, ...values })
    .returning({ id: services.id });
  revalidatePath("/dashboard/settings/services");
  revalidatePath("/dashboard/settings");
  return { ok: true, id: created.id };
}

export async function setServiceActive(input: {
  serviceId: string;
  isActive: boolean;
}): Promise<{ ok: boolean; error?: string }> {  const profile = await requireProfile();
  const parsed = z
    .object({ serviceId: z.uuid(), isActive: z.boolean() })
    .safeParse(input);
  if (!parsed.success) return { ok: false, error: "INVALID_INPUT" };

  const [existing] = await db
    .select({ id: services.id })
    .from(services)
    .where(
      and(
        eq(services.id, parsed.data.serviceId),
        eq(services.profileId, profile.id)
      )
    )
    .limit(1);
  if (!existing) return { ok: false, error: "NOT_FOUND" };

  await db
    .update(services)
    .set({ isActive: parsed.data.isActive })
    .where(eq(services.id, parsed.data.serviceId));
  revalidatePath("/dashboard/settings/services");
  revalidatePath("/dashboard/settings");
  return { ok: true };
}

export async function duplicateService(input: {
  serviceId: string;
}): Promise<{ ok: boolean; error?: string; id?: string }> {
  const profile = await requireProfile();
  const parsed = z.object({ serviceId: z.uuid() }).safeParse(input);
  if (!parsed.success) return { ok: false, error: "INVALID_INPUT" };

  const [existing] = await db
    .select()
    .from(services)
    .where(
      and(
        eq(services.id, parsed.data.serviceId),
        eq(services.profileId, profile.id)
      )
    )
    .limit(1);
  if (!existing) return { ok: false, error: "NOT_FOUND" };

  const [created] = await db
    .insert(services)
    .values({
      profileId: profile.id,
      title: `${existing.title} (kopie)`.slice(0, 120),
      durationMinutes: existing.durationMinutes,
      slotIntervalMinutes: existing.slotIntervalMinutes,
      priceMinor: existing.priceMinor,
      depositMinor: existing.depositMinor,
      customFormFields: existing.customFormFields,
      isActive: false,
    })
    .returning({ id: services.id });

  revalidatePath("/dashboard/settings/services");
  return { ok: true, id: created.id };
}

export async function deleteService(input: {
  serviceId: string;
}): Promise<{ ok: boolean; error?: string }> {
  const profile = await requireProfile();
  const parsed = z.object({ serviceId: z.uuid() }).safeParse(input);
  if (!parsed.success) return { ok: false, error: "INVALID_INPUT" };

  const [existing] = await db
    .select({ id: services.id })
    .from(services)
    .where(
      and(
        eq(services.id, parsed.data.serviceId),
        eq(services.profileId, profile.id)
      )
    )
    .limit(1);
  if (!existing) return { ok: false, error: "NOT_FOUND" };

  const [used] = await db
    .select({ id: bookings.id })
    .from(bookings)
    .where(eq(bookings.serviceId, parsed.data.serviceId))
    .limit(1);
  if (used) return { ok: false, error: "HAS_BOOKINGS" };

  await db
    .delete(services)
    .where(eq(services.id, parsed.data.serviceId));
  revalidatePath("/dashboard/settings/services");
  revalidatePath("/dashboard/settings");
  return { ok: true };
}
