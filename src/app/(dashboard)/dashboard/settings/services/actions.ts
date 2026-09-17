"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { services } from "@/db/schema";
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
    requiresDeposit: (data.depositCzk ?? 0) > 0,
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
}): Promise<{ ok: boolean; error?: string }> {
  const profile = await requireProfile();
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
