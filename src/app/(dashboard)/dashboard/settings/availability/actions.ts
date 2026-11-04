"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { formatInTimeZone } from "date-fns-tz";
import { db } from "@/db";
import {
  profiles,
  type BookingRules,
  type DayException,
  type WeeklySchedule,
} from "@/db/schema";
import { requireProfile } from "@/lib/session";
import { getBusyWithGoogle } from "@/lib/availability";

const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;
const DAY_KEYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"] as const;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

const windowSchema = z.object({
  from: z.string().regex(TIME_RE),
  to: z.string().regex(TIME_RE),
});

const scheduleSchema = z
  .record(z.string(), z.array(windowSchema).max(3))
  .refine((rec) =>
    Object.keys(rec).every((k) =>
      (DAY_KEYS as readonly string[]).includes(k)
    )
  )
  .refine((rec) =>
    Object.values(rec).every((windows) =>
      windows.every((w) => w.from < w.to)
    )
  );

const exceptionsSchema = z
  .record(
    z.string().regex(DATE_RE),
    z.object({
      closed: z.boolean(),
      windows: z.array(windowSchema).max(3),
    })
  )
  .refine((rec) =>
    Object.values(rec).every((ex) => ex.closed || ex.windows.every((w) => w.from < w.to))
  );

const rulesSchema = z.object({
  timezone: z.string().min(2).max(64),
  minLeadTimeHours: z.coerce.number().int().min(0).max(720),
  slotIntervalMinutes: z.coerce.number().int().min(5).max(240).optional(),
  maxBookingsPerDay: z.coerce.number().int().min(1).max(50).optional(),
  weeklySchedule: scheduleSchema.optional(),
  exceptions: exceptionsSchema.optional(),
});

export async function saveBookingRules(
  input: unknown
): Promise<{ ok: boolean; error?: string }> {
  const profile = await requireProfile();
  const parsed = rulesSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "INVALID_INPUT" };
  const data = parsed.data;

  const bookingRules: BookingRules = {
    weeklySchedule: data.weeklySchedule as WeeklySchedule | undefined,
    exceptions: data.exceptions as Record<string, DayException> | undefined,
    minLeadTimeHours: data.minLeadTimeHours,
    slotIntervalMinutes: data.slotIntervalMinutes,
    maxBookingsPerDay: data.maxBookingsPerDay,
  };

  await db
    .update(profiles)
    .set({ bookingRules, timezone: data.timezone })
    .where(eq(profiles.id, profile.id));

  revalidatePath("/dashboard/settings/availability");
  revalidatePath("/dashboard/settings");
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/calendar");
  return { ok: true };
}

function todayKey(timezone: string): string {
  return formatInTimeZone(new Date(), timezone, "yyyy-MM-dd");
}

export async function blockDay(input: {
  dayKey: string;
}): Promise<{ ok: boolean; error?: string }> {
  const profile = await requireProfile();
  const parsed = z
    .object({ dayKey: z.string().regex(DATE_RE) })
    .safeParse(input);
  if (!parsed.success) return { ok: false, error: "INVALID_INPUT" };
  const tz = profile.timezone || "Europe/Prague";
  if (parsed.data.dayKey < todayKey(tz)) {
    return { ok: false, error: "PAST_DATE" };
  }

  const rules = profile.bookingRules ?? {};
  const exceptions = { ...(rules.exceptions ?? {}) };
  exceptions[parsed.data.dayKey] = { closed: true, windows: [] };

  const bookingRules: BookingRules = { ...rules, exceptions };
  await db
    .update(profiles)
    .set({ bookingRules })
    .where(eq(profiles.id, profile.id));

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/calendar");
  revalidatePath("/dashboard/settings/availability");
  return { ok: true };
}

export async function unblockDay(input: {
  dayKey: string;
}): Promise<{ ok: boolean; error?: string }> {
  const profile = await requireProfile();
  const parsed = z
    .object({ dayKey: z.string().regex(DATE_RE) })
    .safeParse(input);
  if (!parsed.success) return { ok: false, error: "INVALID_INPUT" };

  const rules = profile.bookingRules ?? {};
  const exceptions = { ...(rules.exceptions ?? {}) };
  const existing = exceptions[parsed.data.dayKey];
  if (!existing) return { ok: true };
  delete exceptions[parsed.data.dayKey];

  const bookingRules: BookingRules = { ...rules, exceptions };
  await db
    .update(profiles)
    .set({ bookingRules })
    .where(eq(profiles.id, profile.id));

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/calendar");
  revalidatePath("/dashboard/settings/availability");
  return { ok: true };
}

export async function getBusyForMonth(input: {
  fromIso: string;
  toIso: string;
}): Promise<{ ok: boolean; busy?: { startIso: string; endIso: string }[] }> {
  const profile = await requireProfile();
  const parsed = z
    .object({ fromIso: z.iso.datetime(), toIso: z.iso.datetime() })
    .safeParse(input);
  if (!parsed.success) return { ok: false };

  const from = new Date(parsed.data.fromIso);
  const to = new Date(parsed.data.toIso);
  const busy = await getBusyWithGoogle(profile, from, to);
  return {
    ok: true,
    busy: busy.map((b) => ({
      startIso: b.start.toISOString(),
      endIso: b.end.toISOString(),
    })),
  };
}
