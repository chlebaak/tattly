"use server";

import { z } from "zod";
import { and, eq } from "drizzle-orm";
import { formatInTimeZone } from "date-fns-tz";
import { db } from "@/db";
import { services } from "@/db/schema";
import { getDaySlots, getGoogleBusy, hasWeeklySchedule } from "@/lib/availability";
import { resolveSlotInterval } from "@/lib/slots";
import { requireProfile } from "@/lib/session";

const schema = z.object({
  fromIso: z.iso.datetime(),
  toIso: z.iso.datetime(),
});

/**
 * Obsazenost z Google kalendáře pro zobrazený měsíc. Slouží jen jako
 * orientační bloky v přehledu – rezervace se počítají zvlášť.
 */
export async function getCalendarBusy(input: unknown): Promise<{
  ok: boolean;
  busy?: { startIso: string; endIso: string }[];
}> {
  const profile = await requireProfile();
  const parsed = schema.safeParse(input);
  if (!parsed.success) return { ok: false };
  if (!profile.googleRefreshToken || !profile.googleCalendarId) {
    return { ok: true, busy: [] };
  }

  const busy = await getGoogleBusy(
    profile,
    new Date(parsed.data.fromIso),
    new Date(parsed.data.toIso)
  );
  return {
    ok: true,
    busy: busy.map((interval) => ({
      startIso: interval.start.toISOString(),
      endIso: interval.end.toISOString(),
    })),
  };
}

const freeStartsSchema = z.object({
  dayKey: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  serviceId: z.uuid(),
});

/**
 * Volné starty pro klienta v daném dni u zvolené služby – stejný výpočet
 * jako veřejný formulář (délka služby, rozestup, předstih, obsazenost).
 */
export async function getDayFreeStarts(input: unknown): Promise<{
  ok: boolean;
  slots?: string[];
}> {
  const profile = await requireProfile();
  const parsed = freeStartsSchema.safeParse(input);
  if (!parsed.success) return { ok: false };

  const [service] = await db
    .select({
      id: services.id,
      durationMinutes: services.durationMinutes,
      slotIntervalMinutes: services.slotIntervalMinutes,
    })
    .from(services)
    .where(
      and(
        eq(services.id, parsed.data.serviceId),
        eq(services.profileId, profile.id),
        eq(services.isActive, true)
      )
    )
    .limit(1);
  if (!service) return { ok: false };
  if (!hasWeeklySchedule(profile.bookingRules)) return { ok: true, slots: [] };

  const tz = profile.timezone || "Europe/Prague";
  const slots = await getDaySlots({
    profileId: profile.id,
    dayKey: parsed.data.dayKey,
    timezone: tz,
    durationMinutes: service.durationMinutes,
    intervalMinutes: resolveSlotInterval(profile.bookingRules, service),
    respectLeadTime: true,
  });

  return {
    ok: true,
    slots: slots.map((slot) => formatInTimeZone(slot.start, tz, "HH:mm")),
  };
}
